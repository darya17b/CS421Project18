import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { clearSession, setSession } from "../auth/session";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

// handles login
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const notice = location.state?.notice;

  // handles handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (useMock) {
      setSession({ token: null, email: email || "guest", role: "" });
      navigate("/dashboard");
      return;
    }

    setBusy(true);
    try {
      const { token } = await api.login(email, password);
      // The token must be in place before asking the server who we are.
      setSession({ token, email });
      const me = await api.getCurrentUser();
      setSession({ token, email, id: me.id, role: me.role });
      navigate("/dashboard");
    } catch (err) {
      clearSession();
      setError(err?.status === 401 ? "Invalid email or password." : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      {notice ? (
        <p role="status" className="mb-4 text-sm text-green-700">
          {notice}
        </p>
      ) : null}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          aria-label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          required={!useMock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
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
          Login
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-600">
        Need an account?{" "}
        <Link to="/request-access" className="text-[#981e32] hover:underline">
          Request access
        </Link>
      </p>
    </section>
  );
};

export default Login;
