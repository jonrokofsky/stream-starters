import { NextResponse } from "next/server";
import {
  supabaseAdmin,
  withSupabaseRetry,
} from "../../../lib/supabaseAdmin";

const STARTING_ELO = 1500;
const K_FACTOR = 32;

type RatingRow = {
  player_name: string;
  elo: number;
  wins: number;
  losses: number;
  comparisons: number;
  updated_at?: string;
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

type ReRankItem = {
  playerName: string;
  elo: number;
};

function expectedScore(
  ratingA: number,
  ratingB: number
) {
  return (
    1 /
    (1 +
      Math.pow(
        10,
        (ratingB - ratingA) / 400
      ))
  );
}

function mapRating(
  row: RatingRow
) {
  return {
    playerName: row.player_name,
    elo: row.elo,
    wins: row.wins,
    losses: row.losses,
    comparisons: row.comparisons,
  };
}

function mapHistory(
  row: HistoryRow
) {
  return {
    id: row.id,
    winner: row.winner,
    loser: row.loser,
    winnerBefore:
      row.winner_before,
    loserBefore:
      row.loser_before,
    winnerAfter:
      row.winner_after,
    loserAfter:
      row.loser_after,
    createdAt:
      row.created_at,
  };
}

async function getRating(
  playerName: string
): Promise<RatingRow> {
  const result =
    await withSupabaseRetry(
      () =>
        supabaseAdmin
          .from(
            "hitter_rankings"
          )
          .select(
            "player_name, elo, wins, losses, comparisons"
          )
          .eq(
            "player_name",
            playerName
          )
          .maybeSingle()
    );

  if (result.error) {
    throw result.error;
  }

  if (!result.data) {
    return {
      player_name:
        playerName,
      elo: STARTING_ELO,
      wins: 0,
      losses: 0,
      comparisons: 0,
    };
  }

  return result.data as RatingRow;
}

export async function GET() {
  try {
    const ratingsResult =
      await withSupabaseRetry(
        () =>
          supabaseAdmin
            .from(
              "hitter_rankings"
            )
            .select(
              "player_name, elo, wins, losses, comparisons"
            )
            .order(
              "elo",
              {
                ascending: false,
              }
            )
      );

    if (
      ratingsResult.error
    ) {
      throw ratingsResult.error;
    }

    const historyResult =
      await withSupabaseRetry(
        () =>
          supabaseAdmin
            .from(
              "hitter_ranking_history"
            )
            .select(
              "id, winner, loser, winner_before, loser_before, winner_after, loser_after, created_at"
            )
            .order(
              "created_at",
              {
                ascending: true,
              }
            )
            .limit(2000)
      );

    if (
      historyResult.error
    ) {
      throw historyResult.error;
    }

    const ratings =
      (
        ratingsResult.data ??
        []
      ).map((row) =>
        mapRating(
          row as RatingRow
        )
      );

    const history =
      (
        historyResult.data ??
        []
      ).map((row) =>
        mapHistory(
          row as HistoryRow
        )
      );

    return NextResponse.json({
      ratings,
      history,
    });
  } catch (error) {
    console.error(
      "GET hitter rankings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load hitter rankings.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const action =
      body?.action;

    if (
      action === "rerank"
    ) {
      const requested:
        ReRankItem[] =
        Array.isArray(
          body?.rankings
        )
          ? body.rankings
          : [];

      const valid =
        requested.filter(
          (item) =>
            typeof item?.playerName ===
              "string" &&
            item.playerName.trim() &&
            Number.isFinite(
              Number(item.elo)
            )
        );

      if (!valid.length) {
        return NextResponse.json(
          {
            error:
              "No valid rankings supplied.",
          },
          {
            status: 400,
          }
        );
      }

      const playerNames =
        valid.map(
          (item) =>
            item.playerName.trim()
        );

      const existingResult =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_rankings"
              )
              .select(
                "player_name, elo, wins, losses, comparisons"
              )
              .in(
                "player_name",
                playerNames
              )
        );

      if (
        existingResult.error
      ) {
        throw existingResult.error;
      }

      const existingMap =
        new Map<
          string,
          RatingRow
        >();

      (
        existingResult.data ??
        []
      ).forEach((row) => {
        const rating =
          row as RatingRow;

        existingMap.set(
          rating.player_name,
          rating
        );
      });

      const upsertRows =
        valid.map(
          (item) => {
            const name =
              item.playerName.trim();

            const existing =
              existingMap.get(
                name
              );

            return {
              player_name:
                name,
              elo: Math.round(
                Number(
                  item.elo
                )
              ),
              wins:
                existing?.wins ??
                0,
              losses:
                existing?.losses ??
                0,
              comparisons:
                existing?.comparisons ??
                0,
              updated_at:
                new Date().toISOString(),
            };
          }
        );

      const saveResult =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_rankings"
              )
              .upsert(
                upsertRows,
                {
                  onConflict:
                    "player_name",
                }
              )
              .select(
                "player_name, elo, wins, losses, comparisons"
              )
        );

      if (
        saveResult.error
      ) {
        throw saveResult.error;
      }

      const ratings =
        (
          saveResult.data ??
          []
        )
          .map((row) =>
            mapRating(
              row as RatingRow
            )
          )
          .sort(
            (a, b) =>
              b.elo - a.elo
          );

      return NextResponse.json({
        success: true,
        ratings,
      });
    }

    if (
      action === "undo"
    ) {
      const historyResult =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_ranking_history"
              )
              .select(
                "id, winner, loser, winner_before, loser_before, winner_after, loser_after, created_at"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle()
        );

      if (
        historyResult.error
      ) {
        throw historyResult.error;
      }

      if (
        !historyResult.data
      ) {
        return NextResponse.json({
          empty: true,
        });
      }

      const history =
        historyResult.data as HistoryRow;

      const winnerCurrent =
        await getRating(
          history.winner
        );

      const loserCurrent =
        await getRating(
          history.loser
        );

      const winnerRestored =
        {
          player_name:
            history.winner,
          elo:
            history.winner_before,
          wins: Math.max(
            0,
            winnerCurrent.wins -
              1
          ),
          losses:
            winnerCurrent.losses,
          comparisons:
            Math.max(
              0,
              winnerCurrent.comparisons -
                1
            ),
          updated_at:
            new Date().toISOString(),
        };

      const loserRestored =
        {
          player_name:
            history.loser,
          elo:
            history.loser_before,
          wins:
            loserCurrent.wins,
          losses: Math.max(
            0,
            loserCurrent.losses -
              1
          ),
          comparisons:
            Math.max(
              0,
              loserCurrent.comparisons -
                1
            ),
          updated_at:
            new Date().toISOString(),
        };

      const restoreResult =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_rankings"
              )
              .upsert(
                [
                  winnerRestored,
                  loserRestored,
                ],
                {
                  onConflict:
                    "player_name",
                }
              )
        );

      if (
        restoreResult.error
      ) {
        throw restoreResult.error;
      }

      const deleteResult =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_ranking_history"
              )
              .delete()
              .eq(
                "id",
                history.id
              )
        );

      if (
        deleteResult.error
      ) {
        throw deleteResult.error;
      }

      return NextResponse.json({
        empty: false,

        undoneHistoryId:
          history.id,

        matchup: {
          winner:
            history.winner,
          loser:
            history.loser,
        },

        winner: mapRating(
          winnerRestored
        ),

        loser: mapRating(
          loserRestored
        ),
      });
    }

    if (
      action === "reset"
    ) {
      const playerNames:
        string[] =
        Array.isArray(
          body?.playerNames
        )
          ? body.playerNames.filter(
              (
                name: unknown
              ) =>
                typeof name ===
                  "string" &&
                name.trim()
            )
          : [];

      const historyDelete =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_ranking_history"
              )
              .delete()
              .gte(
                "id",
                0
              )
        );

      if (
        historyDelete.error
      ) {
        throw historyDelete.error;
      }

      const rankingsDelete =
        await withSupabaseRetry(
          () =>
            supabaseAdmin
              .from(
                "hitter_rankings"
              )
              .delete()
              .neq(
                "player_name",
                ""
              )
        );

      if (
        rankingsDelete.error
      ) {
        throw rankingsDelete.error;
      }

      if (
        playerNames.length
      ) {
        const rows =
          playerNames.map(
            (
              playerName
            ) => ({
              player_name:
                playerName.trim(),
              elo:
                STARTING_ELO,
              wins: 0,
              losses: 0,
              comparisons: 0,
              updated_at:
                new Date().toISOString(),
            })
          );

        const seedResult =
          await withSupabaseRetry(
            () =>
              supabaseAdmin
                .from(
                  "hitter_rankings"
                )
                .upsert(
                  rows,
                  {
                    onConflict:
                      "player_name",
                  }
                )
          );

        if (
          seedResult.error
        ) {
          throw seedResult.error;
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (
      action !== "pick"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    const winnerName =
      typeof body?.winner ===
      "string"
        ? body.winner.trim()
        : "";

    const loserName =
      typeof body?.loser ===
      "string"
        ? body.loser.trim()
        : "";

    if (
      !winnerName ||
      !loserName ||
      winnerName === loserName
    ) {
      return NextResponse.json(
        {
          error:
            "Winner and loser are required.",
        },
        {
          status: 400,
        }
      );
    }

    const [
      winnerCurrent,
      loserCurrent,
    ] = await Promise.all([
      getRating(
        winnerName
      ),
      getRating(
        loserName
      ),
    ]);

    const winnerExpected =
      expectedScore(
        winnerCurrent.elo,
        loserCurrent.elo
      );

    const loserExpected =
      expectedScore(
        loserCurrent.elo,
        winnerCurrent.elo
      );

    const winnerAfter =
      Math.round(
        winnerCurrent.elo +
          K_FACTOR *
            (1 -
              winnerExpected)
      );

    const loserAfter =
      Math.round(
        loserCurrent.elo +
          K_FACTOR *
            (0 -
              loserExpected)
      );

    const winnerUpdated =
      {
        player_name:
          winnerName,
        elo: winnerAfter,
        wins:
          winnerCurrent.wins +
          1,
        losses:
          winnerCurrent.losses,
        comparisons:
          winnerCurrent.comparisons +
          1,
        updated_at:
          new Date().toISOString(),
      };

    const loserUpdated =
      {
        player_name:
          loserName,
        elo: loserAfter,
        wins:
          loserCurrent.wins,
        losses:
          loserCurrent.losses +
          1,
        comparisons:
          loserCurrent.comparisons +
          1,
        updated_at:
          new Date().toISOString(),
      };

    const upsertResult =
      await withSupabaseRetry(
        () =>
          supabaseAdmin
            .from(
              "hitter_rankings"
            )
            .upsert(
              [
                winnerUpdated,
                loserUpdated,
              ],
              {
                onConflict:
                  "player_name",
              }
            )
      );

    if (
      upsertResult.error
    ) {
      throw upsertResult.error;
    }

    const historyInsert =
      await withSupabaseRetry(
        () =>
          supabaseAdmin
            .from(
              "hitter_ranking_history"
            )
            .insert({
              winner:
                winnerName,

              loser:
                loserName,

              winner_before:
                winnerCurrent.elo,

              loser_before:
                loserCurrent.elo,

              winner_after:
                winnerAfter,

              loser_after:
                loserAfter,
            })
            .select(
              "id, winner, loser, winner_before, loser_before, winner_after, loser_after, created_at"
            )
            .single()
      );

    if (
      historyInsert.error
    ) {
      throw historyInsert.error;
    }

    return NextResponse.json({
      winner:
        mapRating(
          winnerUpdated
        ),

      loser:
        mapRating(
          loserUpdated
        ),

      history:
        mapHistory(
          historyInsert.data as HistoryRow
        ),
    });
  } catch (error) {
    console.error(
      "POST hitter rankings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to update hitter rankings.",
      },
      {
        status: 500,
      }
    );
  }
}