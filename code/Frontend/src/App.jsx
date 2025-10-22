import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SpSearch from "./pages/SpSearch";
import FormsReviewer from "./pages/FormsReviewer";
import FormsSearch from "./pages/FormsSearch";
import Home from "./pages/Home";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />

          
          <Route path="dashboard" element={<Dashboard />}>
            <Route path="sp-search" element={<SpSearch />} />
            <Route path="forms-reviewer" element={<FormsReviewer />} />
          </Route>

          
          <Route path="forms-search" element={<FormsSearch />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
