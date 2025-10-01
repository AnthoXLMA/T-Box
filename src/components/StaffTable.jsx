import React, { useState, useEffect } from "react";
import ServiceAccessModal from "./ServiceAccessModal";

function StaffTable({ hotelUid, users: initialUsers = [], refreshUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [modalService, setModalService] = useState(null);

  useEffect(() => {
    setUsers(initialUsers); // mise à jour si la liste change
  }, [initialUsers]);

  const openServiceModal = (user) => {
    setModalService(user);
  };

  return (
    <div>
      {users.length === 0 ? (
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
          service={modalService} // ici l'utilisateur complet
          onClose={() => setModalService(null)}
          hotelUid={hotelUid}
          refreshUsers={refreshUsers} // optionnel si modal met à jour les services
        />
      )}
    </div>
  );
}

export default StaffTable;
