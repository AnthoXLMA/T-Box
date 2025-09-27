import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import TipPage from "./pages/TipPage";
import SuccessPage from "./pages/SuccessPage";
import LoginPage from "./pages/LoginPage";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { auth } from "./firebase";
import Layout from "./components/Layout";

function PrivateRoute({ children }) {
  return auth.currentUser ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tip" element={<TipPage />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
      </Layout>
    </Router>
  );
}

export default App;
