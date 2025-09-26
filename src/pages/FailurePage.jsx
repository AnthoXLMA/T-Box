// src/pages/FailurePage.jsx
import React from "react";
import { FaTimesCircle } from "react-icons/fa";

function FailurePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        {/* Icône échec */}
        <div className="flex justify-center">
          <FaTimesCircle className="text-red-500 text-6xl drop-shadow-md" />
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-extrabold text-red-600">
          Oups ! Paiement échoué ❌
        </h1>

        {/* Sous-texte */}
        <p className="text-gray-600 text-lg">
          Malheureusement, votre transaction n’a pas pu être effectuée.
          Veuillez réessayer ou contacter l’accueil si le problème persiste.
        </p>

        {/* Bouton retour */}
        <a
          href="/"
          className="inline-block w-full py-3 text-lg font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition"
        >
          ↩️ Retour à l’accueil
        </a>
      </div>
    </div>
  );
}

export default FailurePage;
