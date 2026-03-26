import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SpSearch from "./pages/SpSearch";
import FormsReviewer from "./pages/FormsReviewer";
import FormsSearch from "./pages/FormsSearch";
import Home from "./pages/Home";
import Requests from "./pages/Requests";
import RequestNew from "./pages/RequestNew";
import CreateScript from "./pages/CreateScript";
import ScriptDetail from "./pages/ScriptDetail";
import ActorDatabase from "./pages/ActorDatabase";
import { StoreProvider } from "./store";
import { ToastProvider } from "./components/Toast";
import RequireAuth from "./components/RequireAuth";

const App = () => {
  return (
    <StoreProvider>
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
              <Route path="requests" element={
                <RequireAuth>
                  <Requests />
                </RequireAuth>
              } />
              <Route path="request-new" element={
                <RequireAuth>
                  <RequestNew />
                </RequireAuth>
              } />
              <Route path="create-script" element={
                <RequireAuth>
                  <CreateScript />
                </RequireAuth>
              } />
              <Route path="forms/:id" element={
                <RequireAuth>
                  <ScriptDetail />
                </RequireAuth>
              } />
              <Route path="requests/forms/:id" element={
                <RequireAuth>
                  <ScriptDetail requestInlineOnly />
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
              <Route path="actor-database" element={
                <RequireAuth>
                  <ActorDatabase />
                </RequireAuth>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
};

export default App;
