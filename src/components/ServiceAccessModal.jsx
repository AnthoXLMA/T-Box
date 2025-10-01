import React, { useState, useEffect } from "react";
import axios from "axios";
import { auth } from "../firebase"; // ajuste le chemin selon ton projet

function ServiceAccessModal({ service, onClose, hotelUid }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState({});
  const [loading, setLoading] = useState(false);

  const API_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:4242"
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



// import React, { useState, useEffect } from "react";
// import axios from "axios";

// function ServiceAccessModal({ service, onClose, uid }) {
//   const [users, setUsers] = useState([]);
//   const [allServices, setAllServices] = useState([]);
//   const [selectedUsers, setSelectedUsers] = useState({});
//   const [lockedServices, setLockedServices] = useState({});
//   const [loading, setLoading] = useState(false);

//   // --- URL dynamique selon environnement ---
//   const API_URL =
//     window.location.hostname === "localhost"
//       ? "http://localhost:4242"
//       : "https://us-central1-tipbox-a4f99.cloudfunctions.net/apiV2";

//   // --- Charger tous les utilisateurs ---
//   // useEffect(() => {
//   //   const fetchUsers = async () => {
//   //     try {
//   //       const res = await axios.get(`${API_URL}/users`, { params: { hotelUid: uid } });
//   //       const usersData = res.data || [];
//   //       setUsers(usersData);

//   //       // Initialiser selectedUsers et lockedServices
//   //       const initSelection = {};
//   //       const initLocked = {};
//   //       usersData.forEach(u => {
//   //         initSelection[u.uid] = (u.services || []).map(String); // forcer string
//   //         initLocked[u.uid] = (u.lockedServices || []).map(String);
//   //       });
//   //       setSelectedUsers(initSelection);
//   //       setLockedServices(initLocked);
//   //     } catch (err) {
//   //       console.error("Erreur récupération utilisateurs", err);
//   //     }
//   //   };
//   //   if (uid) fetchUsers();
//   // }, [uid, API_URL]);

//   // --- Charger tous les services ---
//   useEffect(() => {
//     const fetchServices = async () => {
//       try {
//         const res = await axios.get(`${API_URL}/services`, { params: { uid } });
//         setAllServices(res.data || []);
//       } catch (err) {
//         console.error("Erreur récupération services", err);
//       }
//     };
//     if (uid) fetchServices();
//   }, [uid, API_URL]);

//   // --- Toggle accès utilisateur ---
//   const toggleUserService = (userId, serviceId) => {
//     setSelectedUsers(prev => {
//       const current = prev[userId] || [];
//       const updated = current.includes(serviceId)
//         ? current.filter(s => s !== serviceId)
//         : [...current, serviceId];
//       return { ...prev, [userId]: updated };
//     });
//   };

//   // --- Toggle verrouillage utilisateur ---
//   const toggleLockService = (userId, serviceId) => {
//     setLockedServices(prev => {
//       const current = prev[userId] || [];
//       const updated = current.includes(serviceId)
//         ? current.filter(s => s !== serviceId)
//         : [...current, serviceId];
//       return { ...prev, [userId]: updated };
//     });
//   };

//   // --- Enregistrer modifications ---
//   const handleSave = async () => {
//     setLoading(true);
//     try {
//       await Promise.all(
//         Object.keys(selectedUsers).map(async userId => {
//           const user = users.find(u => u.uid === userId);
//           const servicesToAssign = selectedUsers[userId] || [];
//           const servicesToRemove = (user?.services || []).filter(s => !servicesToAssign.includes(String(s)));

//           // Attribution services
//           await Promise.all(
//             servicesToAssign.map(sId =>
//               axios.post(`${API_URL}/update-user-services`, { uid: userId, serviceId: sId, grantAccess: true })
//             )
//           );

//           // Retrait services
//           await Promise.all(
//             servicesToRemove.map(sId =>
//               axios.post(`${API_URL}/update-user-services`, { uid: userId, serviceId: sId, grantAccess: false })
//             )
//           );

//           // Sauvegarde des verrouillages
//           await Promise.all(
//             (lockedServices[userId] || []).map(sId =>
//               axios.post(`${API_URL}/lock-service-user`, { uid: userId, serviceId: sId })
//             )
//           );
//         })
//       );
//       alert("Accès mis à jour !");
//       const res = await axios.get(`${API_URL}/users`, { params: { hotelUid: uid } });
//       setUsers(res.data || []);
//     } catch (err) {
//       console.error(err);
//       alert("Erreur lors de la mise à jour des accès");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // --- Supprimer utilisateur ---
//   const handleDeleteUser = async (userId) => {
//     if (!window.confirm("Supprimer cet utilisateur ?")) return;
//     try {
//       const userServices = selectedUsers[userId] || [];
//       await Promise.all(
//         userServices.map(sId =>
//           axios.post(`${API_URL}/remove-service-user`, { uid: userId, serviceId: sId })
//         )
//       );
//       setUsers(prev => prev.filter(u => u.uid !== userId));
//       setSelectedUsers(prev => {
//         const copy = { ...prev };
//         delete copy[userId];
//         return copy;
//       });
//       setLockedServices(prev => {
//         const copy = { ...prev };
//         delete copy[userId];
//         return copy;
//       });
//     } catch (err) {
//       console.error(err);
//       alert("Erreur suppression utilisateur");
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
//       <div className="bg-white p-6 rounded-xl shadow-xl w-[500px] max-h-[90vh] overflow-y-auto space-y-4">
//         <h3 className="text-xl font-bold mb-2">Gérer accès - {service?.name}</h3>

//         {/* Liste utilisateurs */}
//         <div className="space-y-2">
//           <h4 className="font-semibold">Utilisateurs existants</h4>
//           {users.length === 0 && <p>Aucun utilisateur</p>}
//           {users.map(u => (
//             <div key={u.uid} className="p-2 border rounded flex justify-between items-center">
//               <p>{u.email} - {u.role}</p>
//               <label className="flex items-center space-x-2 cursor-pointer">
//                 <input
//                   type="checkbox"
//                   checked={(selectedUsers[u.uid] || []).includes(service.id)}
//                   onChange={() => toggleUserService(u.uid, service.id)}
//                   className="w-4 h-4 accent-indigo-600"
//                 />
//                 <span>Accès</span>
//               </label>
//             </div>
//           ))}
//         </div>

//         {/* Footer */}
//         <div className="flex justify-end space-x-2 mt-2">
//           <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
//             Fermer
//           </button>
//           <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition">
//             {loading ? "Enregistrement..." : "Enregistrer"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default ServiceAccessModal;
