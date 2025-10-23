import { Link, Outlet, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useMockStore } from "../store/mockStore";

const Layout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const store = useMockStore();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = localStorage.getItem("user");

  return (
    <>
      <header className="p-4 border-b border-gray-300 bg-[#DC143C]/90 sticky top-0 z-40">
        <nav className="flex items-center justify-center gap-4">
          <Link to="/" className="text-black font-semibold rounded px-3 py-1 hover:bg-white/10">VCC Scripts</Link>
          <Link to="/forms-search" className="text-black rounded px-3 py-1 hover:bg-white/10">Forms Search</Link>
          <Link to="/request-new" className="text-black rounded px-3 py-1 hover:bg-white/10">Request New</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-black rounded px-3 py-1 hover:bg-white/10">Dashboard</Link>
              <button onClick={handleLogout} className="text-black px-3 py-1 rounded hover:bg-white/10">Logout</button>
              <button
                onClick={() => {
                  // Clear toast popups, remove any draft clones, and clear proposed flags
                  try { toast.clear(); } catch {}
                  try { store.clearDrafts(); } catch {}
                  try { store.clearProposedFlags(); } catch {}
                }}
                className="text-black px-3 py-1 rounded hover:bg-white/10"
              >
                Clear Notices
              </button>
              <button
                onClick={() => {
                  try { store.resetData(); } catch {}
                  try { toast.show('Data reset to seed', { type: 'success' }); } catch {}
                }}
                className="text-black px-3 py-1 rounded hover:bg-white/10"
              >
                Reset Data
              </button>
            </>
          ) : (
            <Link to="/login" className="text-black rounded px-3 py-1 hover:bg-white/10">Login</Link>
          )}
        </nav>
      </header>

      <main className="p-8 w-full max-w-none mx-auto min-h-screen">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
