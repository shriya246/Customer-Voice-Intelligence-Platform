import { NextResponse } from "next/server";
import type { z } from "zod";

export type ParsedBody<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Parses and validates a request's JSON body against a Zod schema.
 * Every API route should validate its input through this before touching it.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema
): Promise<ParsedBody<z.infer<Schema>>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Validation failed", issues: result.error.flatten() },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}
