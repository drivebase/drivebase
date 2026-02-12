import { describe, expect, it } from "bun:test";
import { requireAuth, requireRole } from "../../graphql/resolvers/auth-helpers";

describe("auth helpers", () => {
  it("requireAuth throws when user is missing", () => {
    expect(() => requireAuth({ user: null })).toThrow("Authentication required");
  });

  it("requireAuth returns user when present", () => {
    const user = { userId: "user-1", role: "admin" };
    expect(requireAuth({ user })).toBe(user);
  });

  it("requireRole throws when role is not allowed", () => {
    const context = { user: { userId: "user-1", role: "viewer" } };
    expect(() => requireRole(context, ["admin", "owner"])).toThrow(
      "Insufficient permissions"
    );
  });

  it("requireRole returns user when role is allowed", () => {
    const context = { user: { userId: "user-1", role: "owner" } };
    expect(requireRole(context, ["admin", "owner"])).toBe(context.user);
  });
});
