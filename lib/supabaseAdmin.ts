import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  retries = 4
): Promise<T> {
  let lastResult: T | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await operation();
    lastResult = result;

    const maybeResult = result as {
      error?: {
        code?: string;
        message?: string;
      } | null;
    };

    const error = maybeResult?.error;

    if (!error) {
      return result;
    }

    const isFutureJwtError =
      error.code === "PGRST303" ||
      error.message?.toLowerCase().includes("jwt issued at future");

    if (!isFutureJwtError) {
      return result;
    }

    const delay =
      attempt === 0
        ? 400
        : attempt === 1
        ? 900
        : attempt === 2
        ? 1600
        : 2500;

    await new Promise((resolve) =>
      setTimeout(resolve, delay)
    );
  }

  return lastResult as T;
}