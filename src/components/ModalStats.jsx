// src/components/ModalStats.jsx
import React from "react";

export default function ModalStats({ isOpen, onClose, totalTips, totalCount, avgTip }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-lg w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-indigo-700">
          📊 Statistiques Globales
        </h2>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg">
            <p className="text-lg">Total Pourboires</p>
            <p className="text-2xl font-bold">{totalTips.toFixed(2)} €</p>
          </div>
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
            <p className="text-lg">Transactions</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
          <div className="bg-yellow-500 text-white p-6 rounded-xl shadow-lg">
            <p className="text-lg">Moyenne</p>
            <p className="text-2xl font-bold">{avgTip} €</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
