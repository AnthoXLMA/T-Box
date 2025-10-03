// src/components/AccountModal.jsx
import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function AccountModal({ isOpen, onClose, userId }) {
  const [loading, setLoading] = useState(true);
  const [hotelData, setHotelData] = useState({
    hotelName: "",
    hotelAddress: "",
    hotelPhone: "",
    hotelType: "",
    plan: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      const fetchData = async () => {
        try {
          const docRef = doc(db, "companies", userId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setHotelData(docSnap.data());
          }
        } catch (err) {
          console.error(err);
          setError("Impossible de charger les données");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, userId]);

  const handleChange = (e) => {
    setHotelData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "companies", userId);
      await updateDoc(docRef, hotelData);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
        <h2 className="text-xl font-bold mb-4">Gestion du compte</h2>

        {loading ? (
          <p>AccountModal</p>
        ) : (
          <div className="space-y-3">
            {error && <p className="text-red-500">{error}</p>}

            <input
              type="text"
              name="hotelName"
              placeholder="Nom de l'entreprise"
              value={hotelData.hotelName}
              onChange={handleChange}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="hotelAddress"
              placeholder="Adresse complète"
              value={hotelData.hotelAddress}
              onChange={handleChange}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="hotelPhone"
              placeholder="Téléphone"
              value={hotelData.hotelPhone}
              onChange={handleChange}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              name="hotelType"
              placeholder="Type d'entreprise"
              value={hotelData.hotelType}
              onChange={handleChange}
              className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-500"
            />

            {hotelData.plan && (
              <p className="text-gray-700 mt-2">
                Plan actuel : <strong>{hotelData.plan.name}</strong> - {hotelData.plan.monthlyFee}€/mois
              </p>
            )}

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
