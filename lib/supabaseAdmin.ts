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

type SupabaseErrorShape = {
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export async function withSupabaseRetry<T>(
  operation: () => PromiseLike<T>,
  retries = 4
): Promise<T> {
  let lastResult: T | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await operation();
    lastResult = result;

    const error = (result as SupabaseErrorShape)?.error;

    if (!error) {
      return result;
    }

    const isFutureJwtError =
      error.code === "PGRST303" ||
      error.message
        ?.toLowerCase()
        .includes("jwt issued at future");

    if (!isFutureJwtError) {
      return result;
    }

    const delays = [400, 900, 1600, 2500];
    const delay = delays[Math.min(attempt, delays.length - 1)];

    await new Promise<void>((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  if (lastResult === undefined) {
    throw new Error("Supabase operation did not return a result.");
  }

  return lastResult;
}