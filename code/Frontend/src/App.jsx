import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Security, LoginCallback } from "@okta/okta-react";
import { toRelativeUrl } from "@okta/okta-auth-js";
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
import { isOktaConfigured, oktaAuth } from "./oktaConfig";

/* Defines routes, wraps app in storeprovider, toastprovider,browserrouter
applies layout as shared cell for nested pages. Switches authentication 
behavior based on okta config, enabling okta security wrapper and callback 
route when configured. Enforces admin route access through requireauth
*/
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route
        index
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <Home />
          </RequireAuth>
        }
      />
      <Route path="login" element={<Login oktaEnabled={isOktaConfigured} />} />
      {isOktaConfigured ? <Route path="login/callback" element={<LoginCallback />} /> : null}
      <Route
        path="dashboard"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route
        path="forms-search"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <FormsSearch />
          </RequireAuth>
        }
      />
      <Route
        path="requests"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <Requests />
          </RequireAuth>
        }
      />
      <Route
        path="request-new"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured} requiredRole="admin" redirectTo="/create-script">
            <RequestNew />
          </RequireAuth>
        }
      />
      <Route
        path="clone-new"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured} requiredRole="admin" redirectTo="/create-script">
            <RequestNew mode="clone" />
          </RequireAuth>
        }
      />
      <Route
        path="create-script"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <CreateScript />
          </RequireAuth>
        }
      />
      <Route
        path="forms/:id"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <ScriptDetail />
          </RequireAuth>
        }
      />
      <Route
        path="requests/forms/:id"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <ScriptDetail requestInlineOnly />
          </RequireAuth>
        }
      />
      <Route
        path="sp-search"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <SpSearch />
          </RequireAuth>
        }
      />
      <Route
        path="forms-reviewer"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <FormsReviewer />
          </RequireAuth>
        }
      />
      <Route
        path="actor-database"
        element={
          <RequireAuth oktaEnabled={isOktaConfigured}>
            <ActorDatabase />
          </RequireAuth>
        }
      />
    </Route>
  </Routes>
);

// handles app
const App = () => {
  // handles restore original uri
  const restoreOriginalUri = async (_okta, originalUri) => {
    const next = toRelativeUrl(String(originalUri || "/dashboard"), window.location.origin);
    window.location.replace(next);
  };

  return (
    <StoreProvider>
      <ToastProvider>
        <BrowserRouter>
          {isOktaConfigured && oktaAuth ? (
            <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
              <AppRoutes />
            </Security>
          ) : (
            <AppRoutes />
          )}
        </BrowserRouter>
      </ToastProvider>
    </StoreProvider>
  );
};

export default App;
