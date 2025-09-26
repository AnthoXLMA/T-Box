// src/components/Layout.jsx
import React, { useEffect, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Layout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header fixe ou sticky selon besoin */}
      <Header user={user} onLogout={handleLogout} />

      {/* Main content: padding responsive et max-width pour desktop */}
      <main className="flex-1 w-full px-4 sm:px-6 md:px-10 lg:px-20 py-6 mx-auto max-w-7xl">
        {children}
      </main>

      {/* Footer avec padding et responsive */}
{/*      <Footer className="w-full px-4 sm:px-6 md:px-10 lg:px-20 py-4 mt-auto" />
*/}    </div>
  );
}
