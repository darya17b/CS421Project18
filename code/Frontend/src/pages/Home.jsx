import { Link } from "react-router-dom";

export const LandingSections = () => {
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("role") === "admin";
  return (
    <section className="w-full">
      <div className="flex flex-col gap-6">
        <div className="landing-card landing-card--accent">
          <h2>Script Library</h2>
          <p>Search for and access Standardized Patient scripts.</p>
          <p>Find actors that have previously played Standardized Patients.</p>
          <p>Download documentation like full scripts, door notes, and medication cards.</p>
          <Link to="/forms-search" className="landing-action">
            Enter Script Library &rsaquo;
          </Link>
        </div>

        {!isAdmin ? (
          <div className="landing-card">
            <h2>Script Request</h2>
            <p>Fill out a form to create a new script request.</p>
            <p>Requests will be reviewed by Virtual Clinical Center administration.</p>
            <Link to="/request-new" className="landing-action text-[#981e32]">
              Submit Script Request &rsaquo;
            </Link>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="landing-card landing-card--accent">
            <h2>View Script Requests</h2>
            <p>See incoming or pending script requests from faculty and staff.</p>
            <p>Manage follow-up and approvals as they arrive.</p>
            <Link to="/requests" className="landing-action text-[#981e32]">
              View Script Requests &rsaquo;
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};

const Home = () => <LandingSections />;

export default Home;
