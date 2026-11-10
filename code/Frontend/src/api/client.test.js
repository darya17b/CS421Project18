import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";
import { setSession } from "../auth/session";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("api client auth", () => {
  let fetchMock;
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse({}));
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1);
    return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
  };

  it("attaches the in-memory JWT as a Bearer token", async () => {
    setSession({ token: "jwt-abc", role: "admin" });
    await api.getCurrentUser();
    expect(lastCall().init.headers.Authorization).toBe("Bearer jwt-abc");
  });

  it("sends no Authorization header without a session, even if localStorage has an old token", async () => {
    localStorage.setItem("token", "stale-token");
    try {
      await api.getCurrentUser();
      expect(lastCall().init.headers.Authorization).toBeUndefined();
    } finally {
      localStorage.removeItem("token");
    }
  });

  it("calls the auth and admin endpoints correctly", async () => {
    await api.login("a@example.com", "pw");
    expect(lastCall()).toMatchObject({ url: "/api/auth/login", init: { method: "POST" }, body: { email: "a@example.com", password: "pw" } });

    await api.requestAccess("Pat", "pat@example.com");
    expect(lastCall()).toMatchObject({ url: "/api/access-requests", init: { method: "POST" }, body: { name: "Pat", email: "pat@example.com" } });

    await api.setupPassword("tok", "a long password");
    expect(lastCall()).toMatchObject({ url: "/api/auth/setup-password", init: { method: "POST" }, body: { token: "tok", password: "a long password" } });

    await api.listAccessRequests();
    expect(lastCall()).toMatchObject({ url: "/api/admin/requests", init: { method: "GET" } });

    await api.approveAccessRequest(7, "script editor");
    expect(lastCall()).toMatchObject({ url: "/api/admin/requests/7/approve", init: { method: "POST" }, body: { role: "script editor" } });

    await api.denyAccessRequest(7);
    expect(lastCall()).toMatchObject({ url: "/api/admin/requests/7/deny", init: { method: "POST" } });
  });

  it("does not log the setup token", async () => {
    await api.setupPassword("secret-setup-token", "a long password");
    const logged = [...console.log.mock.calls, ...console.error.mock.calls].flat().join(" ");
    expect(logged).not.toContain("secret-setup-token");
  });

  it("throws errors carrying the HTTP status", async () => {
    fetchMock.mockResolvedValueOnce(new Response("invalid or expired setup link\n", { status: 400 }));
    await expect(api.setupPassword("x", "y")).rejects.toMatchObject({ status: 400, message: "invalid or expired setup link\n" });
  });
});
