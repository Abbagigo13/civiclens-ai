import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function isAuthEnabled(): boolean {
  return (process.env.API_KEY ?? "").length > 0;
}

function keysEqual(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

// Guards write endpoints with a shared operator key. When no API_KEY
// is configured the server runs open (local development) and warns
// at startup instead of locking anything.
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.API_KEY ?? "";

  if (expected.length === 0) {
    next();
    return;
  }

  const header = req.headers.authorization ?? "";
  const separator = header.indexOf(" ");
  const scheme = separator === -1 ? "" : header.slice(0, separator);
  const token = separator === -1 ? "" : header.slice(separator + 1);

  if (scheme !== "Bearer" || token.length === 0 || !keysEqual(token, expected)) {
    res.status(401).json({ error: "Invalid or missing API key." });
    return;
  }

  next();
}
