import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase";
import ServiceAccessModal from "./ServiceAccessModal";

function StaffTable({ hotelUid }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalService, setModalService] = useState(null);

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:4173"
      : "https://us-central1-tipbox-a4f99.cloudfunctions.net/apiV2";

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${idToken}` },
          params: { hotelUid },
        });
        setUsers(res.data || []);
      } catch (err) {
        console.error("Erreur récupération utilisateurs", err);
      } finally {
        setLoading(false);
      }
    };

    if (hotelUid) fetchUsers();
  }, [hotelUid]);

  // Ouvre la modal pour modifier l'accès à un service spécifique
  const openServiceModal = (serviceId) => {
    setModalService(serviceId);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Mon Staff</h2>
      {loading ? (
        <p>StaffTable.</p>
      ) : users.length === 0 ? (
        <p>Aucun utilisateur</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Nom</th>
              <th className="px-4 py-2 text-left">Rôle</th>
              <th className="px-4 py-2 text-left">Services</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.uid} className="border-b">
                <td className="px-4 py-2">{u.firstName} {u.lastName}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">
                  {u.services?.map(s => (
                    <span key={s} className="inline-block bg-gray-200 px-2 py-1 rounded mr-1">
                      {s}
                    </span>
                  ))}
                </td>
                <td className="px-4 py-2">
                  <button
                    className="px-2 py-1 bg-purple-600 text-white rounded"
                    onClick={() => openServiceModal(u)}
                  >
                    Modifier accès
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}


      {modalService && (
        <ServiceAccessModal
          service={modalService}
          onClose={() => setModalService(null)}
          hotelUid={hotelUid}
        />
      )}
    </div>
  );
}

export default StaffTable;
