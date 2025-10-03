import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase"; // ajuste le chemin selon ton projet

function ServiceAccessModal({ service, onClose, hotelUid }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:4173"
      : "https://us-central1-tipbox-a4f99.cloudfunctions.net/apiV2";

  // --- Charger tous les users de l’hôtel ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { hotelUid },
        });
        const usersData = res.data || [];
        console.log("Utilisateurs récupérés:", usersData);

        setUsers(usersData);

        // Initialiser l'état avec accès au service
        const initSelection = {};
        usersData.forEach(u => {
          initSelection[u.uid] = (u.services || []).includes(service.id);
        });
        setSelectedUsers(initSelection);
      } catch (err) {
        console.error("Erreur récupération utilisateurs", err);
      }
    };
    if (hotelUid) fetchUsers();
  }, [hotelUid, service.id]);

  // --- Toggle accès d’un user pour ce service ---
  const toggleUserAccess = (userId) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // --- Sauvegarde ---
  const handleSave = async () => {
    setLoading(true);
    try {
      const idToken = await auth.currentUser.getIdToken();

      await Promise.all(
        users.map(async u => {
          const shouldHaveAccess = selectedUsers[u.uid];
          await axios.post(
            `${API_URL}/update-user-services`,
            { uid: u.uid, serviceId: service.id, grantAccess: shouldHaveAccess },
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
        })
      );

      alert("Accès mis à jour !");
    } catch (err) {
      console.error("Erreur mise à jour accès", err);
      alert("Erreur lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto space-y-4">
        <h3 className="text-xl font-bold mb-2">
          Gérer accès - {service?.name}
        </h3>

        {/* Liste utilisateurs */}
        <div className="space-y-2">
          {users.length === 0 && <p>Aucun utilisateur</p>}
          {users.map(u => (
            <div
              key={u.uid}
              className="p-2 border rounded flex justify-between items-center"
            >
              <p>{u.email} - {u.role}</p>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!selectedUsers[u.uid]}
                  onChange={() => toggleUserAccess(u.uid)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span>Accès</span>
              </label>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
          >
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            {loading ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceAccessModal;
