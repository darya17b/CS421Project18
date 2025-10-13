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
    <section style={{ maxWidth: "400px", margin: "2rem auto" }}>
      <h1>Login </h1>
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
        <button type="button" onClick={skipLogin}>Skip Login</button>
      </form>
    </section>
  );
};

export default Login;
