// src/pages/SuccessPage.jsx
import React from "react";
import { FaCheckCircle } from "react-icons/fa";

function SuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        {/* Icône succès */}
        <div className="flex justify-center">
          <FaCheckCircle className="text-green-500 text-6xl drop-shadow-md" />
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-extrabold text-green-700">
          Merci pour votre générosité ! 🎉
        </h1>

        {/* Sous-texte */}
        <p className="text-gray-600 text-lg">
          Votre pourboire a été enregistré avec succès.
          L’équipe vous remercie chaleureusement 💙
        </p>

        {/* Bouton retour */}
        <a
          href="/"
          className="inline-block w-full py-3 text-lg font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition"
        >
          ↩️ Retour à l’accueil
        </a>
      </div>
    </div>
  );
}

export default SuccessPage;
