import { describe, expect, it, vi } from "vitest";
import { clearSession, getSession, getToken, isAdmin, setSession, subscribe } from "./session";

describe("session", () => {
  it("starts empty", () => {
    expect(getSession()).toBeNull();
    expect(getToken()).toBeNull();
    expect(isAdmin()).toBe(false);
  });

  it("stores the token and role in memory only", () => {
    setSession({ token: "jwt-123", email: "a@example.com", id: 1, role: "admin" });
    expect(getToken()).toBe("jwt-123");
    expect(isAdmin()).toBe(true);
    expect(JSON.stringify({ ...localStorage })).not.toContain("jwt-123");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("jwt-123");
    expect(document.cookie).not.toContain("jwt-123");
  });

  it("is not admin for other roles", () => {
    for (const role of ["requester", "script viewer", "script editor", "", undefined]) {
      setSession({ token: "t", role });
      expect(isAdmin()).toBe(false);
    }
  });

  it("notifies subscribers on change and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setSession({ token: "t", role: "requester" });
    clearSession();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getSession()).toBeNull();

    unsubscribe();
    setSession({ token: "t" });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
