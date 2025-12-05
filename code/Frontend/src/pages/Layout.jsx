import { Link, Outlet, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { useStore } from "../store";

const shieldIcon = "/images/wsu-icon.svg";
const lockupImage = "/images/wsu-com-lockup.png";
const FULL_NAME = "Washington State University Elson S. Floyd College of Medicine";

const Layout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const store = useStore();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const user = localStorage.getItem("user");

  return (
    <>
      <header className="sticky top-0 z-40 shadow-sm">
        <div className="bg-[#dedede] text-[0.7rem] tracking-[0.6em] text-[#b21d32] uppercase py-2 text-center font-semibold">
          {FULL_NAME}
        </div>

        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <img
                src={lockupImage}
                alt="Washington State University Elson S. Floyd College of Medicine"
                className="h-16 w-auto object-contain"
                loading="lazy"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <button onClick={() => toast.show('No notifications yet.', { type: 'info' })} className="hover:text-[#981e32] px-3 py-1 rounded-full border border-transparent hover:border-[#981e32]">
                Notification
              </button>
              {user ? (
                <>
                  <button onClick={handleLogout} className="px-3 py-1 rounded-full border border-transparent hover:border-[#981e32]">Logout</button>
                  <button
                    onClick={() => {
                      try { toast.clear(); } catch {}
                      try { store.clearDrafts(); } catch {}
                      try { store.clearProposedFlags(); } catch {}
                    }}
                    className="px-3 py-1 rounded-full border border-transparent hover:border-[#981e32]"
                  >
                    Clear Notices
                  </button>
                  <button
                    onClick={() => {
                      try { store.resetData(); } catch {}
                      try { toast.show("Data reset to seed", { type: "success" }); } catch {}
                    }}
                    className="px-3 py-1 rounded-full border border-transparent hover:border-[#981e32]"
                  >
                    Reset Data
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-3 py-1 rounded-full border border-transparent hover:border-[#981e32]">Login</Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-8 w-full mx-auto min-h-screen max-w-6xl">
        <Outlet />
      </main>
    </>
  );
};

export default Layout;
