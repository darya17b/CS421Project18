import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";

// handles request access (create account)
const RequestAccess = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // handles handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.requestAccess(name, email);
      setSent(true);
    } catch (err) {
      setError(err?.status === 400 ? err.message.trim() : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">Create Account</h1>
      {sent ? (
        <p role="status">
          Thanks! An administrator will review your request. If it is approved, you will get an
          email with a link to set your password.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Name</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
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
            Request Access
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-[#981e32] hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
};

export default RequestAccess;
