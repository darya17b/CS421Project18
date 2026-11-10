import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SetPassword from "./SetPassword";
import { api, httpError } from "../test/apiMock";

vi.mock("../api/client", () => import("../test/apiMock"));

const LoginStub = () => <p>Login page: {useLocation().state?.notice}</p>;

// The page reads the real window URL (that is what the email link opens), so set it first.
const renderAt = (url) => {
  window.history.replaceState(null, "", url);
  return render(
    <MemoryRouter initialEntries={["/set-password"]}>
      <Routes>
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>
  );
};

const submitPassword = async (password) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("New password"), password);
  await user.click(screen.getByRole("button", { name: "Set Password" }));
};

describe("Set Password page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the token, then strips it from the address bar", () => {
    renderAt("/set-password?token=raw-token-123");
    expect(window.location.search).toBe("");
    expect(window.location.href).not.toContain("raw-token-123");
    expect(window.location.pathname).toBe("/set-password");
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("sets a no-referrer policy for the page", () => {
    renderAt("/set-password?token=raw-token-123");
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });

  it("submits the token from the URL and goes to login with a notice", async () => {
    api.setupPassword.mockResolvedValue("");
    renderAt("/set-password?token=raw-token-123");
    await submitPassword("correct horse battery");

    expect(api.setupPassword).toHaveBeenCalledWith("raw-token-123", "correct horse battery");
    expect(await screen.findByText(/Login page: Your password is set/)).toBeInTheDocument();
  });

  it("shows the server's message for a bad or expired link", async () => {
    api.setupPassword.mockRejectedValue(httpError(400, "invalid or expired setup link\n"));
    renderAt("/set-password?token=used-token");
    await submitPassword("correct horse battery");

    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or expired setup link");
    expect(screen.getByRole("button", { name: "Set Password" })).toBeEnabled();
  });

  it("asks for at least 8 characters", () => {
    renderAt("/set-password?token=t");
    expect(screen.getByLabelText("New password")).toHaveAttribute("minLength", "8");
  });

  it("explains when the link has no token", () => {
    renderAt("/set-password");
    expect(screen.getByRole("alert")).toHaveTextContent(/missing its token/);
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});
