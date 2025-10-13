import { Link, Outlet} from "react-router-dom";


const Dashboard = () => {
  const user = localStorage.getItem("user") || "guest";
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user}!</p>
      <Link to = "/forms-search">
      <button> Forms Search</button>
      </Link>
     

      <Link to ="/sp-search">
      <button> SP Search </button>
      </Link>
      
      <br /> <br />

      <Link to = "forms-reviewer"><button>
        Forms Reviewer</button>
        </Link>
        
    </div>
  );
};

export default Dashboard;
