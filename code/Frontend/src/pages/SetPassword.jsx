import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";

const MIN_PASSWORD_LENGTH = 8;

// Read once at first render, before the effect below strips it from the URL.
const readTokenFromUrl = () => new URLSearchParams(window.location.search).get("token") || "";

// handles set password
const SetPassword = () => {
  const navigate = useNavigate();
  const [token] = useState(readTokenFromUrl);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Keep the token out of browser history and anything that reads the address bar.
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, []);

  // handles handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.setupPassword(token, password);
      navigate("/login", { replace: true, state: { notice: "Your password is set. You can now log in." } });
    } catch (err) {
      setError(err?.status === 400 ? err.message.trim() : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      {/* React hoists this into <head>; the server also sends Referrer-Policy for this page. */}
      <meta name="referrer" content="no-referrer" />
      <h1 className="text-3xl font-bold mb-6">Set Password</h1>
      {!token ? (
        <p role="alert" className="text-sm text-red-700">
          This link is missing its token. Open the link from your approval email, or{" "}
          <Link to="/request-access" className="text-[#981e32] hover:underline">
            request access
          </Link>{" "}
          again.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="new-password" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              aria-describedby="new-password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span id="new-password-hint" className="text-xs text-gray-500">
              At least {MIN_PASSWORD_LENGTH} characters.
            </span>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            Set Password
          </button>
        </form>
      )}
    </section>
  );
};

export default SetPassword;
