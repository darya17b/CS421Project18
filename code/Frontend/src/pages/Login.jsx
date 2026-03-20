import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOktaAuth } from '@okta/okta-react';

const useMock = import.meta.env.VITE_USE_MOCK === "true";

const Login = () => {
  const navigate = useNavigate();
  const { oktaAuth, authState } = useOktaAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (authState?.isAuthenticated) {
      navigate("/dashboard");
    }
  }, [authState, navigate]);

  const handleOktaLogin = async () => {
    await oktaAuth.signInWithRedirect();
  };

  const signInAdmin = () => {
    localStorage.setItem("user", "admin");
    localStorage.setItem("role", "admin");
    navigate("/dashboard");
  };

  // Legacy login (keep for backward compatibility)
  const handleLogin = async (e) => {
    e.preventDefault();
    if (useMock) {
      localStorage.removeItem("role");
      localStorage.setItem("user", email || "guest");
      navigate("/dashboard");
      return;
    }
    try {
      const { api } = await import("../api/client");
      const res = await api.login(email, password);
      if (res?.token) localStorage.setItem("token", res.token);
      if (res?.user?.email || email) localStorage.setItem("user", res.user?.email || email);
      localStorage.removeItem("role");
      navigate("/dashboard");
    } catch (err) {
      alert("Login failed");
    }
  };

  const skipLogin = () => {
    localStorage.removeItem("role");
    localStorage.setItem("user", "guest");
    navigate("/dashboard");
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Login</h1>

      {/* WSU Okta Login - Primary Option */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleOktaLogin}
          className="w-full inline-flex items-center justify-center rounded-md bg-[#981e32] px-4 py-3 text-white font-medium hover:bg-[#7a1828] transition-colors"
        >
          Login with WSU
        </button>
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Legacy Login Form (for development/testing) */}
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
          >
            Login
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={skipLogin}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Skip Login
            </button>
            <button
              type="button"
              onClick={signInAdmin}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-[#981e32] px-4 py-2 text-sm font-medium text-[#981e32] hover:bg-[#981e32] hover:text-white"
            >
              Admin
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};

export default Login;
