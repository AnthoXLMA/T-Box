// src/components/Header.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaUserCircle, FaSignOutAlt, FaTachometerAlt, FaChartBar, FaBars, FaTimes } from "react-icons/fa";
import ModalStats from "./ModalStats";

import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth } from "../firebase";

export default function Header({ user, onLogout, stats }) {
  const [showStats, setShowStats] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await getIdTokenResult(user);
        setUserRole(token.claims.role || "staff");
      } else {
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-800 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto flex flex-wrap justify-between items-center py-4 px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="TipBox Logo" className="h-10 w-10 rounded-full shadow-md" />
          <h1 className="text-2xl font-extrabold tracking-wide drop-shadow-lg">TipBox</h1>
        </div>

        {/* Burger pour mobile */}
        <button
          className="md:hidden text-white text-2xl focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation */}
        <nav className={`flex-col md:flex-row md:flex items-center w-full md:w-auto mt-4 md:mt-0 ${mobileMenuOpen ? "flex" : "hidden md:flex"} space-y-2 md:space-y-0 md:space-x-6 text-lg font-medium`}>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="flex items-center space-x-1 px-3 py-2 rounded hover:bg-white hover:text-indigo-700 transition-colors duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FaTachometerAlt /> <span>Dashboard</span>
              </Link>

              {userRole === "manager" && (
                <button
                  onClick={() => setShowStats(true)}
                  className="flex items-center space-x-1 px-3 py-2 rounded bg-indigo-500 hover:bg-indigo-400 transition"
                >
                  <FaChartBar /> <span>Stats</span>
                </button>
              )}

              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded backdrop-blur-md">
                <FaUserCircle className="text-xl" />
                <span className="font-semibold text-sm md:text-base truncate max-w-xs">{user.email}</span>
              </div>

              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="flex items-center space-x-1 px-3 py-2 rounded bg-red-600 hover:bg-red-500 transition"
              >
                <FaSignOutAlt /> <span>Logout</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded bg-white text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors duration-300"
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Modal Stats visible uniquement pour les managers */}
      {userRole === "manager" && stats && (
        <ModalStats
          isOpen={showStats}
          onClose={() => setShowStats(false)}
          totalTips={stats.totalTips}
          totalCount={stats.totalCount}
          avgTip={stats.avgTip}
        />
      )}
    </header>
  );
}
