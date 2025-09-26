// src/components/ModalQRCode.jsx
import React from "react";
import QRCode from "react-qr-code";

export default function ModalQRCode({ isOpen, onClose, value, serviceName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl p-6 shadow-xl text-center relative max-w-lg w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          Scannez pour laisser un pourboire – <span className="text-indigo-600">{serviceName}</span>
        </h2>
        <div className="flex justify-center mb-6">
          <QRCode value={value} size={250} />
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
