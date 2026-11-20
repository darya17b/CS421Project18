import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";
import { api, httpError } from "../test/apiMock";
import { getSession, getToken } from "../auth/session";

vi.mock("../api/client", () => import("../test/apiMock"));

const renderLogin = (state) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );

const submit = async (email, password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Login" }));
};

describe("Login page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps the JWT in memory, loads the role from the server and navigates", async () => {
    let tokenWhenAskingWhoAmI;
    api.login.mockResolvedValue({ token: "jwt-xyz" });
    api.getCurrentUser.mockImplementation(async () => {
      tokenWhenAskingWhoAmI = getToken();
      return { id: 3, role: "script editor" };
    });

    renderLogin();
    await submit("pat@example.com", "correct horse battery");

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith("pat@example.com", "correct horse battery");
    expect(tokenWhenAskingWhoAmI).toBe("jwt-xyz");
    expect(getSession()).toEqual({ token: "jwt-xyz", email: "pat@example.com", id: 3, role: "script editor" });
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain("jwt-xyz");
  });

  it("shows one message for bad credentials and stores nothing", async () => {
    api.login.mockRejectedValue(httpError(401, "invalid email or password"));
    renderLogin();
    await submit("pat@example.com", "wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(getSession()).toBeNull();
  });

  it("clears the session if loading the user fails after login", async () => {
    api.login.mockResolvedValue({ token: "jwt-xyz" });
    api.getCurrentUser.mockRejectedValue(httpError(401, "invalid token"));
    renderLogin();
    await submit("pat@example.com", "correct horse battery");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(getSession()).toBeNull();
    expect(screen.queryByText("Dashboard page")).not.toBeInTheDocument();
  });

  it("shows a notice passed from the set-password page", () => {
    renderLogin({ notice: "Your password is set. You can now log in." });
    expect(screen.getByRole("status")).toHaveTextContent("Your password is set.");
  });

  it("links to the Create Account page", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: "Request access" })).toHaveAttribute("href", "/request-access");
  });
});
