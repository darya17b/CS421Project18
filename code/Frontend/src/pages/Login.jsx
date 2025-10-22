import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  // all login info works here, this will need to be changed
  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem("user", email || "guest");
    navigate("/dashboard");
  };

  const skipLogin = () => {
    localStorage.setItem("user", "guest");
    navigate("/dashboard");
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
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
        <div className="flex gap-3">
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">
            Login
          </button>
          <button type="button" onClick={skipLogin} className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 font-medium hover:bg-gray-50">
            Skip Login
          </button>
        </div>
      </form>
    </section>
  );
};

export default Login;
