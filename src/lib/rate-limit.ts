import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 s"),
    prefix: "voiceiq",
  });
  return ratelimit;
}

export type RateLimitResult = { success: boolean; remaining: number };

/**
 * Upstash isn't connected yet (no account created), so this fails open with
 * a warning rather than blocking all traffic or crashing at import time.
 * Once UPSTASH_REDIS_REST_URL/TOKEN are set, limits are enforced immediately
 * with no code change.
 */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getRatelimit();
  if (!limiter) {
    console.warn(
      "Rate limiting is not configured (missing UPSTASH_REDIS_REST_URL/TOKEN) — allowing request."
    );
    return { success: true, remaining: Infinity };
  }

  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}
