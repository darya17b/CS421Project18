import { Link } from "react-router-dom";

export const LandingSections = () => {
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

        <div className="landing-card">
          <h2>Script Request</h2>
          <p>Fill out form for creation of new script.</p>
          <p>Will be reviewed by Virtual Clinical Center administration.</p>
          <Link to="/request-new" className="landing-action text-[#981e32]">
            Submit Script Request &rsaquo;
          </Link>
        </div>
      </div>
    </section>
  );
};

const Home = () => <LandingSections />;

export default Home;
