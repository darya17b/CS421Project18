import { Link, Outlet, useNavigate } from "react-router-dom";

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = localStorage.getItem("user");

  return (
    <>
      <header className="p-4 border-b border-gray-300">
        <nav className="flex gap-4">
          <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
              <button onClick={handleLogout} className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
          )}
        </nav>
      </header>

      <main className="p-4">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
