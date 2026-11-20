import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { clearSession } from "../auth/session";

afterEach(() => {
  cleanup();
  clearSession();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
