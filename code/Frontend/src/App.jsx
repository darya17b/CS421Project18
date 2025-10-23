import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SpSearch from "./pages/SpSearch";
import FormsReviewer from "./pages/FormsReviewer";
import FormsSearch from "./pages/FormsSearch";
import Home from "./pages/Home";
import RequestNew from "./pages/RequestNew";
import ScriptDetail from "./pages/ScriptDetail";
import { MockStoreProvider } from "./store/mockStore";
import { ToastProvider } from "./components/Toast";
import RequireAuth from "./components/RequireAuth";

const App = () => {
  return (
    <MockStoreProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              } />
              <Route path="login" element={<Login />} />
              <Route path="dashboard" element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              } />
              <Route path="forms-search" element={
                <RequireAuth>
                  <FormsSearch />
                </RequireAuth>
              } />
              <Route path="request-new" element={
                <RequireAuth>
                  <RequestNew />
                </RequireAuth>
              } />
              <Route path="forms/:id" element={
                <RequireAuth>
                  <ScriptDetail />
                </RequireAuth>
              } />
              <Route path="sp-search" element={
                <RequireAuth>
                  <SpSearch />
                </RequireAuth>
              } />
              <Route path="forms-reviewer" element={
                <RequireAuth>
                  <FormsReviewer />
                </RequireAuth>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </MockStoreProvider>
  );
};

export default App;
