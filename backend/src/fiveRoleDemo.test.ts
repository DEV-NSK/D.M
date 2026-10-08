import { describe, expect, it } from "vitest";
import { accounts, DEMO_SLUG } from "../prisma/fiveRoleDemo.js";
describe("five-role demo definition", () => {
  it("contains exactly the required unique internal accounts", () => {
    expect(accounts).toHaveLength(5);
    expect(new Set(accounts.map((x) => x[1])).size).toBe(5);
    expect(accounts.map((x) => x[3])).toEqual([
      "CEO",
      "MANAGER",
      "TEAM_LEAD",
      "EMPLOYEE",
      "EMPLOYEE",
    ]);
  });
  it("uses a dedicated cleanup boundary", () =>
    expect(DEMO_SLUG).toBe("dm-five-role-demo"));
});
