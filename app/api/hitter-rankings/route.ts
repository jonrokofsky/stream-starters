import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  withSupabaseRetry,
} from "@/lib/supabaseAdmin";

const STARTING_ELO = 1500;
const K_FACTOR = 32;

type RatingRow = {
  player_name: string;
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
};

type HistoryRow = {
  id: number;
  winner: string;
  loser: string;
  winner_before: number;
  loser_before: number;
  winner_after: number;
  loser_after: number;
  created_at: string;
};

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function defaultRating(playerName: string): RatingRow {
  return {
    player_name: playerName,
    elo: STARTING_ELO,
    wins: 0,
    losses: 0,
    comparisons: 0,
  };
}

function formatRating(row: RatingRow) {
  return {
    playerName: row.player_name,
    elo: row.elo,
    wins: row.wins,
    losses: row.losses,
    comparisons: row.comparisons,
  };
}

function formatHistory(row: HistoryRow) {
  return {
    id: row.id,
    winner: row.winner,
    loser: row.loser,
    winnerBefore: row.winner_before,
    loserBefore: row.loser_before,
    winnerAfter: row.winner_after,
    loserAfter: row.loser_after,
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const ratingsResult = await withSupabaseRetry(() =>
      supabaseAdmin
        .from("hitter_rankings")
        .select("*")
        .order("elo", { ascending: false })
    );

    const historyResult = await withSupabaseRetry(() =>
      supabaseAdmin
        .from("hitter_ranking_history")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(2000)
    );

    const {
      data: ratingRows,
      error: ratingsError,
    } = ratingsResult;

    const {
      data: historyRows,
      error: historyError,
    } = historyResult;

    if (ratingsError) {
      throw ratingsError;
    }

    if (historyError) {
      throw historyError;
    }

    return NextResponse.json({
      ratings: (ratingRows ?? []).map((row) =>
        formatRating(row as RatingRow)
      ),
      history: (historyRows ?? []).map((row) =>
        formatHistory(row as HistoryRow)
      ),
    });
  } catch (error) {
    console.error("GET hitter rankings error:", error);

    return NextResponse.json(
      {
        error: "Unable to load hitter rankings.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "pick") {
      const winnerName = String(body?.winner ?? "").trim();
      const loserName = String(body?.loser ?? "").trim();

      if (!winnerName || !loserName || winnerName === loserName) {
        return NextResponse.json(
          {
            error: "Invalid winner or loser.",
          },
          {
            status: 400,
          }
        );
      }

      const readResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_rankings")
          .select("*")
          .in("player_name", [winnerName, loserName])
      );

      const {
        data: existingRows,
        error: readError,
      } = readResult;

      if (readError) {
        throw readError;
      }

      const rows = (existingRows ?? []) as RatingRow[];

      const winnerRating =
        rows.find((row) => row.player_name === winnerName) ??
        defaultRating(winnerName);

      const loserRating =
        rows.find((row) => row.player_name === loserName) ??
        defaultRating(loserName);

      const expectedWinner = expectedScore(
        winnerRating.elo,
        loserRating.elo
      );

      const expectedLoser = expectedScore(
        loserRating.elo,
        winnerRating.elo
      );

      const winnerNewElo = Math.round(
        winnerRating.elo +
          K_FACTOR * (1 - expectedWinner)
      );

      const loserNewElo = Math.round(
        loserRating.elo +
          K_FACTOR * (0 - expectedLoser)
      );

      const updatedWinner: RatingRow = {
        player_name: winnerName,
        elo: winnerNewElo,
        wins: winnerRating.wins + 1,
        losses: winnerRating.losses,
        comparisons: winnerRating.comparisons + 1,
      };

      const updatedLoser: RatingRow = {
        player_name: loserName,
        elo: loserNewElo,
        wins: loserRating.wins,
        losses: loserRating.losses + 1,
        comparisons: loserRating.comparisons + 1,
      };

      const updateResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_rankings")
          .upsert(
            [
              {
                ...updatedWinner,
                updated_at: new Date().toISOString(),
              },
              {
                ...updatedLoser,
                updated_at: new Date().toISOString(),
              },
            ],
            {
              onConflict: "player_name",
            }
          )
      );

      if (updateResult.error) {
        throw updateResult.error;
      }

      const historyResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_ranking_history")
          .insert({
            winner: winnerName,
            loser: loserName,
            winner_before: winnerRating.elo,
            loser_before: loserRating.elo,
            winner_after: winnerNewElo,
            loser_after: loserNewElo,
          })
          .select("*")
          .single()
      );

      const {
        data: insertedHistory,
        error: historyError,
      } = historyResult;

      if (historyError) {
        throw historyError;
      }

      return NextResponse.json({
        winner: formatRating(updatedWinner),
        loser: formatRating(updatedLoser),
        history: formatHistory(
          insertedHistory as HistoryRow
        ),
      });
    }

    if (action === "undo") {
      const historyReadResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_ranking_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      );

      const {
        data: lastHistory,
        error: historyReadError,
      } = historyReadResult;

      if (historyReadError) {
        throw historyReadError;
      }

      if (!lastHistory) {
        return NextResponse.json({
          empty: true,
        });
      }

      const history = lastHistory as HistoryRow;

      const ratingReadResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_rankings")
          .select("*")
          .in("player_name", [
            history.winner,
            history.loser,
          ])
      );

      const {
        data: currentRows,
        error: ratingReadError,
      } = ratingReadResult;

      if (ratingReadError) {
        throw ratingReadError;
      }

      const rows = (currentRows ?? []) as RatingRow[];

      const currentWinner =
        rows.find(
          (row) => row.player_name === history.winner
        ) ?? defaultRating(history.winner);

      const currentLoser =
        rows.find(
          (row) => row.player_name === history.loser
        ) ?? defaultRating(history.loser);

      const restoredWinner: RatingRow = {
        player_name: history.winner,
        elo: history.winner_before,
        wins: Math.max(0, currentWinner.wins - 1),
        losses: currentWinner.losses,
        comparisons: Math.max(
          0,
          currentWinner.comparisons - 1
        ),
      };

      const restoredLoser: RatingRow = {
        player_name: history.loser,
        elo: history.loser_before,
        wins: currentLoser.wins,
        losses: Math.max(0, currentLoser.losses - 1),
        comparisons: Math.max(
          0,
          currentLoser.comparisons - 1
        ),
      };

      const restoreResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_rankings")
          .upsert(
            [
              {
                ...restoredWinner,
                updated_at: new Date().toISOString(),
              },
              {
                ...restoredLoser,
                updated_at: new Date().toISOString(),
              },
            ],
            {
              onConflict: "player_name",
            }
          )
      );

      if (restoreResult.error) {
        throw restoreResult.error;
      }

      const deleteHistoryResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_ranking_history")
          .delete()
          .eq("id", history.id)
      );

      if (deleteHistoryResult.error) {
        throw deleteHistoryResult.error;
      }

      return NextResponse.json({
        winner: formatRating(restoredWinner),
        loser: formatRating(restoredLoser),
        undoneHistoryId: history.id,
        matchup: {
          winner: history.winner,
          loser: history.loser,
        },
      });
    }

    if (action === "reset") {
      const playerNames: string[] = Array.isArray(
        body?.playerNames
      )
        ? body.playerNames
            .map((name: unknown) =>
              String(name ?? "").trim()
            )
            .filter(Boolean)
        : [];

      const historyDeleteResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_ranking_history")
          .delete()
          .neq("id", 0)
      );

      if (historyDeleteResult.error) {
        throw historyDeleteResult.error;
      }

      const rankingsDeleteResult = await withSupabaseRetry(() =>
        supabaseAdmin
          .from("hitter_rankings")
          .delete()
          .neq(
            "player_name",
            "__stream_starters_never__"
          )
      );

      if (rankingsDeleteResult.error) {
        throw rankingsDeleteResult.error;
      }

      if (playerNames.length) {
        const resetRows = playerNames.map(
          (playerName) => ({
            player_name: playerName,
            elo: STARTING_ELO,
            wins: 0,
            losses: 0,
            comparisons: 0,
            updated_at: new Date().toISOString(),
          })
        );

        const seedResult = await withSupabaseRetry(() =>
          supabaseAdmin
            .from("hitter_rankings")
            .upsert(resetRows, {
              onConflict: "player_name",
            })
        );

        if (seedResult.error) {
          throw seedResult.error;
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error: "Unknown action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error("POST hitter rankings error:", error);

    return NextResponse.json(
      {
        error: "Unable to update hitter rankings.",
      },
      {
        status: 500,
      }
    );
  }
}