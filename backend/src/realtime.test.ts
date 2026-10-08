import { describe, expect, it } from "vitest";
import { publish, subscribe } from "./realtime.js";
describe("realtime isolation", () => {
  it("publishes only to recipient ids and removes subscriptions", () => {
    const a: any[] = [],
      b: any[] = [],
      stop = subscribe("employee-a", (event, payload) =>
        a.push({ event, payload }),
      );
    subscribe("employee-b", (event, payload) => b.push({ event, payload }));
    publish(["employee-a"], "task.updated", { id: "task-1" });
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(0);
    stop();
    publish(["employee-a"], "task.updated", {});
    expect(a).toHaveLength(1);
  });
});
