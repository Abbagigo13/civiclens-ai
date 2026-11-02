import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";

// Filing a report is free and open: no operator key is configured or
// sent, and writes must still succeed. A stray API_KEY in the
// environment must not gate visitors either.
process.env.REPORTS_DB_PATH = ":memory:";
process.env.API_KEY = "leftover-key-must-not-gate-anyone";
process.env.MODEL_API_KEY ??= "unit-test-dummy-key";

const { default: reportsRouter } = await import("./reports.js");

describe("open report filing", () => {
  let server: Server;
  let base = "";

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api", reportsRouter);
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    assert.ok(address && typeof address === "object");
    base = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("creates a report with no Authorization header", async () => {
    const response = await fetch(`${base}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Pothole on Airport Road",
        category: "Road infrastructure",
        location: "Kakuri, Kaduna",
      }),
    });
    assert.equal(response.status, 201);
    const payload = (await response.json()) as {
      report: { id: string; status: string };
    };
    assert.match(payload.report.id, /^CL-/);
    assert.equal(payload.report.status, "Submitted");
  });

  it("updates status with no Authorization header", async () => {
    const created = await fetch(`${base}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Blocked Drainage",
        category: "Drainage",
        location: "Kakuri, Kaduna",
      }),
    });
    const { report } = (await created.json()) as {
      report: { id: string };
    };
    const response = await fetch(
      `${base}/api/reports/${report.id}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      },
    );
    assert.equal(response.status, 200);
  });
});
