import { useState } from "react";
import { useNavigate } from "react-router-dom";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

// handles login form
const LoginForm = ({ onSubmit, email, setEmail, password, setPassword, onSkipLogin, onSignInAdmin }) => (
  <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          onClick={onSkipLogin}
          className="flex-1 inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Skip Login
        </button>
        <button
          type="button"
          onClick={onSignInAdmin}
          className="flex-1 inline-flex items-center justify-center rounded-md border border-[#981e32] px-4 py-2 text-sm font-medium text-[#981e32] hover:bg-[#981e32] hover:text-white"
        >
          Admin
        </button>
      </div>
    </div>
  </form>
);

// handles login legacy
const LoginLegacy = ({ email, setEmail, password, setPassword, handleLogin, skipLogin, signInAdmin }) => (
  <LoginForm
    onSubmit={handleLogin}
    email={email}
    setEmail={setEmail}
    password={password}
    setPassword={setPassword}
    onSkipLogin={skipLogin}
    onSignInAdmin={signInAdmin}
  />
);

// handles login
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // handles sign in admin
  const signInAdmin = () => {
    localStorage.removeItem("token");
    localStorage.setItem("user", "admin");
    localStorage.setItem("role", "admin");
    navigate("/dashboard");
  };

  // handles handle login
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
    } catch {
      alert("Login failed");
    }
  };

  // handles skip login
  const skipLogin = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.setItem("user", "guest");
    navigate("/dashboard");
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      <LoginLegacy
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleLogin={handleLogin}
        skipLogin={skipLogin}
        signInAdmin={signInAdmin}
      />
    </section>
  );
};

export default Login;
