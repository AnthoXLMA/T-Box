import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaUserCircle, FaSignOutAlt, FaTachometerAlt, FaChartBar, FaBars, FaTimes
} from "react-icons/fa";
import ModalStats from "./ModalStats";
import AccountModal from "./AccountModal";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import TipBoxLogo from '../assets/TipBox.png';
import StripeConnectStatus from "./StripeConnectStatus";
import DeleteAccountButton from "./DeleteAccountButton";

export default function Header({ user, onLogout, stats }) {
  const [showStats, setShowStats] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [companyData, setCompanyData] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await getIdTokenResult(user);
        setUserRole(token.claims.role || null);

        const companyDoc = await getDoc(doc(db, "companies", user.uid));
        setCompanyData(companyDoc.exists() ? companyDoc.data() : null);
      } else {
        setUserRole(null);
        setCompanyData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-900 to-indigo-700 text-white shadow-lg fixed w-full z-50">
      <div className="container mx-auto flex flex-wrap justify-between items-center py-4 px-6">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <img src={TipBoxLogo} alt="TipBox Logo" className="h-10 w-10 rounded-full shadow-md" />
          <h1 className="text-2xl font-extrabold tracking-wide drop-shadow-lg">TipBox</h1>
        </div>

        {/* Burger menu mobile */}
        <button
          className="md:hidden text-white text-2xl focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation */}
        <nav className={`flex-col md:flex-row md:flex items-center w-full md:w-auto mt-4 md:mt-0
          ${mobileMenuOpen ? "flex" : "hidden md:flex"} space-y-2 md:space-y-0 md:space-x-6 text-lg font-medium`}>

          {user && companyData ? (
            <>
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white hover:text-indigo-700 transition-all duration-300 shadow-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                <FaTachometerAlt /> <span>Dashboard</span>
              </Link>

              {/* Stripe status */}
              <StripeConnectStatus />

              {/* Stats */}
              {stats && (
                <button
                  onClick={() => setShowStats(true)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-all duration-300 shadow-md"
                >
                  <FaChartBar /> <span>Stats</span>
                </button>
              )}

              {/* Compte Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => {
                    setMobileMenuOpen(true);
                    setAccountDropdownOpen(!accountDropdownOpen);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition-all duration-300 shadow-md"
                >
                  <FaUserCircle className="text-xl" />
                  <span>Mon compte</span>
                </button>

                {/* Dropdown menu */}
                <div className={`absolute right-0 mt-2 w-60 bg-white text-gray-800 rounded-lg shadow-xl z-50 flex flex-col transition-transform duration-200 transform ${accountDropdownOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}`}>
                  <button
                    className="px-4 py-3 hover:bg-gray-100 flex items-center space-x-2 rounded-t"
                    onClick={() => { setShowAccount(true); setAccountDropdownOpen(false); }}
                  >
                    <FaUserCircle /> <span>Gestion du compte</span>
                  </button>
                  <DeleteAccountButton className="px-4 py-3 hover:bg-gray-100 flex items-center space-x-2" />
                  <button
                    className="px-4 py-3 hover:bg-gray-100 flex items-center space-x-2 text-red-600 rounded-b"
                    onClick={() => { onLogout(); setAccountDropdownOpen(false); setMobileMenuOpen(false); }}
                  >
                    <FaSignOutAlt /> <span>Logout</span>
                  </button>
                </div>
              </div>

              {/* Email affiché */}
              <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-4 py-2 rounded-xl backdrop-blur-md truncate max-w-xs shadow-inner">
                <FaUserCircle className="text-xl" />
                <span className="font-semibold text-sm md:text-base">{user.email}</span>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-100 transition-colors duration-300 shadow-md"
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Modals */}
      {companyData && stats && <ModalStats isOpen={showStats} onClose={() => setShowStats(false)} totalTips={stats.totalTips} totalCount={stats.totalCount} avgTip={stats.avgTip} />}
      {companyData && user && <AccountModal isOpen={showAccount} onClose={() => setShowAccount(false)} userId={user.uid} />}
    </header>
  );
}
