import { describe, expect, it } from "vitest";
import { completedOnTime, elapsedSeconds, isOverdue, totalDurationSeconds, variance } from "./taskTimeRules.js";

describe("task time rules", () => {
  it("calculates server timestamp duration", () => expect(elapsedSeconds(new Date("2026-10-08T09:00:00Z"), new Date("2026-10-08T09:50:00Z"))).toBe(3000));
  it("aggregates closed and active sessions", () => expect(totalDurationSeconds([{ startedAt: new Date(0), durationSeconds: 3000 }, { startedAt: new Date("2026-10-08T11:30:00Z") }], new Date("2026-10-08T12:02:00Z"))).toBe(4920));
  it("calculates variance and safely handles zero estimates", () => { expect(variance(9000, 7200)).toEqual({ varianceSeconds: 1800, variancePercentage: 25 }); expect(variance(10, 0)).toEqual({ varianceSeconds: null, variancePercentage: null }); });
  it("derives overdue and on-time completion", () => { const due = new Date("2026-10-08T10:00:00Z"); expect(isOverdue(due, "IN_PROGRESS", new Date("2026-10-08T11:00:00Z"))).toBe(true); expect(isOverdue(due, "COMPLETED", new Date("2026-10-08T11:00:00Z"))).toBe(false); expect(completedOnTime(due, new Date("2026-10-08T09:00:00Z"))).toBe(true); });
});
