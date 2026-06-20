/**
 * Simple in-memory rate limiter.
 * In a serverless environment (like Vercel), this state resets on every cold start.
 * However, it is still highly effective at mitigating immediate bot spam/brute-force attacks.
 * For true distributed rate-limiting, consider Redis (e.g. Upstash).
 */

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const rateLimiterStore = new Map<string, RateLimitTracker>();

export function rateLimit(ip: string, limit: number, windowMs: number): { success: boolean; limit: number; remaining: number } {
  const now = Date.now();
  const record = rateLimiterStore.get(ip);

  // If no record or record has expired, create a new one
  if (!record || now > record.resetAt) {
    rateLimiterStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, limit, remaining: limit - 1 };
  }

  // If record exists and is within window
  if (record.count < limit) {
    record.count += 1;
    return { success: true, limit, remaining: limit - record.count };
  }

  // Rate limit exceeded
  return { success: false, limit, remaining: 0 };
}

/**
 * Extracts IP address from the request.
 * Useful for Next.js App Router Request object.
 */
export function getIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1'; // Fallback
}
