import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { ToastProvider } from "./components/Toast";
import { setSession } from "./auth/session";
import { api } from "./test/apiMock";

vi.mock("./api/client", () => import("./test/apiMock"));

const renderAt = (path) =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </ToastProvider>
  );

describe("routes and admin visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listAccessRequests.mockResolvedValue([]);
  });

  it("serves the public pages without a session", () => {
    renderAt("/request-access");
    expect(screen.getByRole("heading", { name: "Create Account" })).toBeInTheDocument();
  });

  it("sends logged-out users to login from the admin page", () => {
    renderAt("/admin/requests");
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(api.listAccessRequests).not.toHaveBeenCalled();
  });

  for (const role of ["requester", "script viewer", "script editor"]) {
    it(`hides admin UI from ${role}`, () => {
      setSession({ token: "t", email: "u@example.com", id: 2, role });
      renderAt("/admin/requests");
      expect(screen.queryByRole("link", { name: "Access Requests" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Access Requests" })).not.toBeInTheDocument();
      expect(api.listAccessRequests).not.toHaveBeenCalled();
    });
  }

  it("shows the Access Requests tab and page to admins", async () => {
    setSession({ token: "t", email: "admin@example.com", id: 1, role: "admin" });
    renderAt("/admin/requests");
    expect(screen.getByRole("link", { name: "Access Requests" })).toHaveAttribute("href", "/admin/requests");
    expect(screen.getByRole("heading", { name: "Access Requests" })).toBeInTheDocument();
    expect(await screen.findByText("No pending requests.")).toBeInTheDocument();
  });

  it("logs out by clearing the in-memory session", async () => {
    setSession({ token: "t", email: "admin@example.com", id: 1, role: "admin" });
    renderAt("/");
    screen.getByRole("button", { name: "Logout" }).click();
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Access Requests" })).not.toBeInTheDocument();
  });
});
