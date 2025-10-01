// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { auth, signOut, onAuthStateChanged } from "../firebase";
import { useNavigate } from "react-router-dom";
import ModalQRCode from "../components/ModalQRCode";
import ServiceAccessModal from "../components/ServiceAccessModal";
import { motion } from "framer-motion";
import { FaEnvelope, FaSms, FaPrint } from "react-icons/fa";
import QRCodeLib from "qrcode";
import { fetchServices } from "../firebase"; // adapter le chemin
import tipboxLogo from "../assets/TipBox.png";

// --- API URL dynamique ---
const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:4242"
    : "https://us-central1-tipbox-a4f99.cloudfunctions.net/apiV2";

function Dashboard() {
  const [services, setServices] = useState([]);
  const [tips, setTips] = useState([]);
  const [uid, setUid] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [accessModal, setAccessModal] = useState({ open: false, service: null });
  const [role, setRole] = useState(null);
  const [managerServiceId, setManagerServiceId] = useState(null);
  const [loadingTips, setLoadingTips] = useState(true);

  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", role: "manager" });
  const [creatingUser, setCreatingUser] = useState(false);

  const [sendModal, setSendModal] = useState({ open: false, type: "", service: null });
  const [contactInfo, setContactInfo] = useState("");
  const [sending, setSending] = useState(false);

  const navigate = useNavigate();

  // --- Auth & récupération services ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const userRole = idTokenResult.claims.role || "director";
        const serviceId = idTokenResult.claims.serviceId || null;

        setUid(user.uid);
        setRole(userRole);
        setManagerServiceId(serviceId);

        const allServices = await fetchServices();
        setServices(
          userRole === "manager" && serviceId
            ? allServices.filter(s => s.id === serviceId)
            : allServices
        );
        setLoadingTips(false);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // --- Logout ---
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // --- Création utilisateur ---
  const handleCreateUser = async () => {
    const { firstName, lastName, email, role: userRole } = newUser;
    if (!firstName || !lastName || !email) return alert("Veuillez compléter tous les champs");

    setCreatingUser(true);
    try {
      const res = await fetch(`${API_URL}/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          role: userRole,
          hotelUid: uid,
          serviceIds: services.map(s => s.id),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erreur création utilisateur");

      if (!data.isNewUser) {
        alert("Cet utilisateur existe déjà !");
        return;
      }

      alert("Utilisateur créé avec succès et email envoyé !");
      setNewUser({ firstName: "", lastName: "", email: "", role: "manager" });
    } catch (err) {
      console.error(err);
      alert("Impossible de créer l'utilisateur : " + err.message);
    } finally {
      setCreatingUser(false);
    }
  };


  // --- Envoi QR (email/SMS) ---
  const handleSend = async () => {
    if (!contactInfo) return alert("Veuillez saisir un email ou numéro valide");
    setSending(true);
    try {
      await fetch(`${API_URL}/send-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: sendModal.service.name,
          uid,
          type: sendModal.type,
          contact: contactInfo,
        }),
      });
      alert("QR code envoyé avec succès !");
      setSendModal({ open: false, type: "", service: null });
      setContactInfo("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  // --- Impression QR ---
  const handlePrint = async (service) => {
    const value = `${window.location.origin}/tip?service=${service.name}&uid=${uid}`;
    try {
      const svgString = await QRCodeLib.toString(value, { type: "svg", width: 300 });
      const printWindow = window.open("", "_blank");

      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code ${service.name}</title>
            <style>
              body { font-family: Arial; text-align: center; margin: 0; padding: 40px; background: #fff; }
              .qr-container { margin-top: 20px; }
            </style>
          </head>
          <body>
            <img src="${tipboxLogo}" alt="Tipbox Logo" style="width:120px; display:block; margin:0 auto;" />
            <div class="qr-container">
              ${svgString.replace('<svg ', '<svg style="width:200px; height:auto;" ')}
            </div>
            <p style="font-size:14px; color:#555; margin:5px 0 10px 0;">Scannez ce QR code pour accéder à votre service Tipbox</p>
            <h2 style="font-size:12px; font-weight:normal; color:#999; margin:0;">${service.name}</h2>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error("Erreur génération QR code imprimable", err);
      alert("Impossible de générer le QR code pour impression");
    }
  };

  // --- Calcul statistiques ---
  const totalTips = tips.reduce((sum, t) => sum + t.amount, 0) / 100;
  const avgTip = tips.length ? (totalTips / tips.length).toFixed(2) : 0;

  const qrValue = selectedService
    ? `${window.location.origin}/tip?service=${selectedService.name}&uid=${uid}`
    : "";

  if (!uid || loadingTips)
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 drop-shadow">Dashboard</h1>
        {/*<button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Déconnexion
        </button>*/}
      </div>

      {/* Statistiques */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg text-center">
          <p className="text-lg">Total Pourboires</p>
          <p className="text-2xl font-bold">{totalTips.toFixed(2)} €</p>
        </div>
        <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg text-center">
          <p className="text-lg">Transactions</p>
          <p className="text-2xl font-bold">{tips.length}</p>
        </div>
        <div className="bg-yellow-500 text-white p-6 rounded-xl shadow-lg text-center">
          <p className="text-lg">Moyenne</p>
          <p className="text-2xl font-bold">{avgTip} €</p>
        </div>
      </motion.div>

      {/* Création utilisateur */}
      {role === "director" && (
        <div className="bg-white p-6 rounded-xl shadow-lg space-y-4">
          <h2 className="text-xl font-bold">Ajouter un manager</h2>
          <input
            type="text"
            placeholder="Prénom"
            value={newUser.firstName}
            onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
            className="w-full border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Nom"
            value={newUser.lastName}
            onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
            className="w-full border p-2 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            className="w-full border p-2 rounded"
          />
          <select
            value={newUser.role}
            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            className="w-full border p-2 rounded"
          >
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleCreateUser}
            disabled={creatingUser}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {creatingUser ? "Création..." : "Créer"}
          </button>
        </div>
      )}

      {/* Services */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Services</h2>
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {services.map(service => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between"
          >
            <h3 className="text-lg font-semibold mb-4">{service.name}</h3>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setSelectedService(service)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
              >
                📱 Afficher QR code
              </button>
              <button
                onClick={() => setSendModal({ open: true, type: "email", service })}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 flex items-center justify-center space-x-2"
              >
                <FaEnvelope /> <span>Email</span>
              </button>
              <button
                onClick={() => setSendModal({ open: true, type: "sms", service })}
                className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-400 flex items-center justify-center space-x-2"
              >
                <FaSms /> <span>SMS</span>
              </button>
              <button
                onClick={() => handlePrint(service)}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-semibold hover:bg-yellow-400 flex items-center justify-center space-x-2"
              >
                <FaPrint /> <span>Imprimer</span>
              </button>
              {role === "director" && (
                <button
                  onClick={() => setAccessModal({ open: true, service })}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 flex items-center justify-center space-x-2"
                >
                  🔑 <span>Gérer accès</span>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Modal Envoi QR */}
      {sendModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80 space-y-4">
            <h3 className="text-xl font-bold">
              Envoyer QR code par {sendModal.type === "email" ? "Email" : "SMS"}
            </h3>
            <input
              type="text"
              placeholder={sendModal.type === "email" ? "Adresse email" : "Numéro de téléphone"}
              value={contactInfo}
              onChange={e => setContactInfo(e.target.value)}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSendModal({ open: false, type: "", service: null })}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QRCode */}
      <ModalQRCode
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        value={qrValue}
        serviceName={selectedService?.name}
      />

      {/* Modal Gestion des accès */}
      {accessModal.open && (
        <ServiceAccessModal
          service={accessModal.service}
          onClose={() => setAccessModal({ open: false, service: null })}
          uid={uid}
        />
      )}
    </div>
  );
}

export default Dashboard;
