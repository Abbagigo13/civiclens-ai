import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";

const { isAuthEnabled, requireApiKey } = await import("./auth.js");

const originalKey = process.env.API_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.API_KEY;
  } else {
    process.env.API_KEY = originalKey;
  }
});

function mockExchange(authorization?: string) {
  const calls = { status: 200, body: undefined as unknown, next: false };

  const res = {} as {
    status: (code: number) => Response;
    json: (payload: unknown) => Response;
  };

  res.status = (code: number) => {
    calls.status = code;
    return res as unknown as Response;
  };

  res.json = (payload: unknown) => {
    calls.body = payload;
    return res as unknown as Response;
  };

  const req = {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;

  const next = (() => {
    calls.next = true;
  }) as unknown as NextFunction;

  return { req, res: res as unknown as Response, next, calls };
}

describe("api key auth", () => {
  it("is disabled without an API_KEY", () => {
    delete process.env.API_KEY;
    assert.equal(isAuthEnabled(), false);

    process.env.API_KEY = "";
    assert.equal(isAuthEnabled(), false);
  });

  it("lets every request through when disabled", () => {
    delete process.env.API_KEY;
    const { req, res, next, calls } = mockExchange();

    requireApiKey(req, res, next);

    assert.equal(calls.next, true);
    assert.equal(calls.status, 200);
  });

  it("accepts the correct bearer key", () => {
    process.env.API_KEY = "secret-key";
    const { req, res, next, calls } = mockExchange("Bearer secret-key");

    requireApiKey(req, res, next);

    assert.equal(calls.next, true);
  });

  it("rejects missing, wrong, and malformed credentials with 401", () => {
    process.env.API_KEY = "secret-key";

    for (const authorization of [
      undefined,
      "Bearer wrong-key",
      "Bearer secret-key ",
      "Token secret-key",
      "secret-key",
    ]) {
      const { req, res, next, calls } = mockExchange(authorization);

      requireApiKey(req, res, next);

      assert.equal(calls.next, false);
      assert.equal(calls.status, 401);
      assert.deepEqual(calls.body, {
        error: "Invalid or missing API key.",
      });
    }
  });
});
