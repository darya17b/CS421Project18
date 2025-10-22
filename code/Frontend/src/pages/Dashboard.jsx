import { Link, Outlet} from "react-router-dom";


const Dashboard = () => {
  const user = localStorage.getItem("user") || "guest";
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-6">Welcome, {user}!</p>

      <div className="flex flex-wrap gap-3">
        <Link to="/forms-search" className="inline-block">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-black font-medium hover:bg-blue-700">Forms Search</button>
        </Link>
        <Link to="/sp-search" className="inline-block">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-black font-medium hover:bg-indigo-700">SP Search</button>
        </Link>
        <Link to="/forms-reviewer" className="inline-block">
          <button className="rounded-md bg-green-600 px-4 py-2 text-black font-medium hover:bg-green-700">Forms Reviewer</button>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
