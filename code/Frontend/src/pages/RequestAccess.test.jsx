import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RequestAccess from "./RequestAccess";
import { api, httpError } from "../test/apiMock";

vi.mock("../api/client", () => import("../test/apiMock"));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RequestAccess />
    </MemoryRouter>
  );

const fillAndSubmit = async (name, email) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), name);
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Request Access" }));
};

describe("Create Account page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends name and email and shows a confirmation", async () => {
    api.requestAccess.mockResolvedValue({ message: "request received" });
    renderPage();
    await fillAndSubmit("Pat Doe", "pat@example.com");

    expect(api.requestAccess).toHaveBeenCalledWith("Pat Doe", "pat@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(/administrator will review/i);
    expect(screen.queryByRole("button", { name: "Request Access" })).not.toBeInTheDocument();
  });

  it("shows the server's validation message", async () => {
    api.requestAccess.mockRejectedValue(httpError(400, "valid email is required\n"));
    renderPage();
    await fillAndSubmit("Pat", "pat@example");

    expect(await screen.findByRole("alert")).toHaveTextContent("valid email is required");
    expect(screen.getByRole("button", { name: "Request Access" })).toBeEnabled();
  });

  it("shows a generic message for other failures", async () => {
    api.requestAccess.mockRejectedValue(httpError(500, "internal error"));
    renderPage();
    await fillAndSubmit("Pat", "pat@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("links to the login page", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });
});
