// Shared fake for ../api/client. Use with:
//   vi.mock("../api/client", () => import("../test/apiMock"));
import { vi } from "vitest";

export const api = {
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  requestAccess: vi.fn(),
  setupPassword: vi.fn(),
  listAccessRequests: vi.fn(),
  approveAccessRequest: vi.fn(),
  denyAccessRequest: vi.fn(),
};

// httpError mimics the errors api/client.js throws.
export const httpError = (status, text = "") => Object.assign(new Error(text), { status });
