import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { createStore, parseReportInput } = await import(
  "./reportsStore.js"
);

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Pothole on Airport Road",
    category: "Road Damage",
    location: "Kaduna",
    description: "A large pothole is visible in the road surface.",
    ...overrides,
  };
}

describe("parseReportInput", () => {
  it("accepts a minimal valid report with defaults", () => {
    const result = parseReportInput(validInput());

    assert.equal(result.title, "Pothole on Airport Road");
    assert.equal(result.status, "Submitted");
    assert.equal(result.priority, null);
    assert.equal(result.latitude, null);
    assert.deepEqual(result.visibleEvidence, []);
  });

  it("rejects a missing title with a 400 error", () => {
    assert.throws(() => parseReportInput(validInput({ title: "  " })), (
      error: unknown,
    ) => {
      assert.equal(
        (error as { statusCode?: unknown }).statusCode,
        400,
      );
      return true;
    });
  });

  it("rejects an unknown status with a 400 error", () => {
    assert.throws(
      () => parseReportInput(validInput({ status: "Archived" })),
      (error: unknown) => {
        assert.equal(
          (error as { statusCode?: unknown }).statusCode,
          400,
        );
        return true;
      },
    );
  });

  it("rejects an unknown priority with a 400 error", () => {
    assert.throws(
      () => parseReportInput(validInput({ priority: "Urgent" })),
      (error: unknown) => {
        assert.equal(
          (error as { statusCode?: unknown }).statusCode,
          400,
        );
        return true;
      },
    );
  });

  it("rejects out-of-range coordinates with a 400 error", () => {
    assert.throws(
      () => parseReportInput(validInput({ latitude: 120 })),
      (error: unknown) => {
        assert.equal(
          (error as { statusCode?: unknown }).statusCode,
          400,
        );
        return true;
      },
    );
  });
});

describe("reports store", () => {
  it("creates and lists reports newest-first", () => {
    const store = createStore(":memory:");

    try {
      const first = store.createReport(validInput());
      const second = store.createReport(
        validInput({ title: "Blocked drain" }),
      );

      assert.match(first.id, /^CL-/);
      assert.notEqual(first.id, second.id);

      const listed = store.listReports();
      assert.equal(listed.length, 2);
      assert.equal(listed[0].id, second.id);
      assert.equal(listed[1].id, first.id);
    } finally {
      store.close();
    }
  });

  it("records status history on create and update", () => {
    const store = createStore(":memory:");

    try {
      const created = store.createReport(validInput());
      const updated = store.updateStatus(created.id, "Resolved");

      assert.equal(updated?.status, "Resolved");

      const history = store.getHistory(created.id);
      assert.equal(history.length, 2);
      assert.equal(history[0].fromStatus, null);
      assert.equal(history[0].toStatus, "Submitted");
      assert.equal(history[1].fromStatus, "Submitted");
      assert.equal(history[1].toStatus, "Resolved");
    } finally {
      store.close();
    }
  });

  it("deletes a report and its history", () => {
    const store = createStore(":memory:");

    try {
      const created = store.createReport(validInput());
      assert.equal(store.deleteReport(created.id), true);
      assert.equal(store.getReport(created.id), null);
      assert.deepEqual(store.getHistory(created.id), []);
    } finally {
      store.close();
    }
  });

  it("updates priority without touching history", () => {
    const store = createStore(":memory:");

    try {
      const created = store.createReport(validInput());
      const updated = store.updatePriority(created.id, "High");

      assert.equal(updated?.priority, "High");
      assert.equal(store.getHistory(created.id).length, 1);
      assert.equal(store.updatePriority("CL-UNKNOWN", "High"), null);
    } finally {
      store.close();
    }
  });

  it("lists recent activity newest-first", () => {
    const store = createStore(":memory:");

    try {
      const first = store.createReport(validInput());
      const second = store.createReport(
        validInput({ title: "Blocked drain" }),
      );
      store.updateStatus(first.id, "Resolved");

      const feed = store.listActivity();

      assert.equal(feed.length, 3);
      assert.equal(feed[0].type, "resolved");
      assert.equal(feed[0].reportId, first.id);
      assert.equal(feed[1].type, "created");
      assert.equal(feed[1].reportId, second.id);
      assert.equal(feed[2].type, "created");
      assert.equal(feed[2].reportId, first.id);
      assert.equal(store.listActivity(2).length, 2);
    } finally {
      store.close();
    }
  });

  it("stores and serves report photos", () => {
    const dir = mkdtempSync(join(tmpdir(), "civiclens-test-"));
    const store = createStore(join(dir, "test.db"));

    try {
      const created = store.createReport(validInput());
      assert.equal(created.hasPhoto, false);

      const bytes = Buffer.from([137, 80, 78, 71]);
      const updated = store.setPhoto(created.id, bytes, "image/png");

      assert.equal(updated?.hasPhoto, true);

      const photo = store.getPhoto(created.id);
      assert.equal(photo?.mime, "image/png");
      assert.deepEqual(photo?.data, bytes);

      assert.equal(store.deleteReport(created.id), true);
      assert.equal(store.getPhoto(created.id), null);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("stores photos for in-memory databases", () => {
    const store = createStore(":memory:");

    try {
      const created = store.createReport(validInput());
      store.setPhoto(created.id, Buffer.from([1, 2, 3]), "image/jpeg");

      assert.equal(store.getPhoto(created.id)?.mime, "image/jpeg");
    } finally {
      store.close();
    }
  });

  it("rejects photos for unknown reports and bad mime types", () => {
    const store = createStore(":memory:");

    try {
      assert.equal(
        store.setPhoto("CL-UNKNOWN", Buffer.from([1]), "image/png"),
        null,
      );
      assert.equal(store.getPhoto("CL-UNKNOWN"), null);

      const created = store.createReport(validInput());
      assert.throws(
        () => store.setPhoto(created.id, Buffer.from([1]), "image/gif"),
        (error: unknown) => {
          assert.equal(
            (error as { statusCode?: unknown }).statusCode,
            400,
          );
          return true;
        },
      );
    } finally {
      store.close();
    }
  });

  it("returns null for unknown ids", () => {
    const store = createStore(":memory:");

    try {
      assert.equal(store.getReport("CL-UNKNOWN"), null);
      assert.equal(store.updateStatus("CL-UNKNOWN", "Resolved"), null);
      assert.equal(store.deleteReport("CL-UNKNOWN"), false);
    } finally {
      store.close();
    }
  });
});
