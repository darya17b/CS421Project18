import { Link } from "react-router-dom";

const Home = () => {
  return (
    <section className="w-full p-4 text-center">
      <h1 className="text-3xl font-bold mb-3">Welcome</h1>
      <p className="text-gray-600 mb-6">Click on buttons below user</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link to="/forms-search">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700">Forms Search</button>
        </Link>
        <Link to="/request-new">
          <button className="rounded-md bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-700">Request New</button>
        </Link>
      </div>
    </section>
  );
};

export default Home;
