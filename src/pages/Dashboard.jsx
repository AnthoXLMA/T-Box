// src/pages/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { auth, signOut, onAuthStateChanged } from "../firebase";
import { useNavigate } from "react-router-dom";
import ModalQRCode from "../components/ModalQRCode";
import { motion } from "framer-motion";
import { FaEnvelope, FaSms, FaPrint } from "react-icons/fa";
import QRCode from "react-qr-code";
import QRCodeLib from "qrcode";


function Dashboard() {
  const [services, setServices] = useState([]);
  const [tips, setTips] = useState([]);
  const [uid, setUid] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [loadingTips, setLoadingTips] = useState(true);
  const [sendModal, setSendModal] = useState({ open: false, type: "", service: null });
  const [contactInfo, setContactInfo] = useState("");
  const [sending, setSending] = useState(false);
  const qrRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        setUid(user.uid);
        setServices([
          { id: "1", name: "Staff", uid: user.uid },
          { id: "2", name: "Bar", uid: user.uid },
          { id: "3", name: "Spa", uid: user.uid },
          { id: "4", name: "Housekeeping", uid: user.uid },
          { id: "5", name: "Réception", uid: user.uid },
          { id: "6", name: "Restaurant", uid: user.uid },
          { id: "7", name: "Commercial", uid: user.uid },
        ]);

        fetch(`http://localhost:4242/tips?uid=${user.uid}`)
          .then(res => res.json())
          .then(data => {
            setTips(data);
            setLoadingTips(false);
          });
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const totalTips = tips.reduce((sum, t) => sum + t.amount, 0) / 100;
  const avgTip = tips.length ? (totalTips / tips.length).toFixed(2) : 0;

  const qrValue = selectedService
    ? `${window.location.origin}?service=${selectedService.name}&uid=${uid}`
    : "";

  const handleSend = async () => {
    if (!contactInfo) return alert("Veuillez saisir un email ou numéro valide");
    setSending(true);
    try {
      await fetch("http://localhost:4242/send-qr", {
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

  const handlePrint = async (service) => {
  const value = `${window.location.origin}?service=${service.name}&uid=${uid}`;
  try {
    // Génération du QR code SVG
    const svgString = await QRCodeLib.toString(value, { type: "svg", width: 300 });

    // Ouvre nouvelle fenêtre pour impression
    const printWindow = window.open("", "_blank");
    printWindow.document.write("<html><head><title>QR Code</title></head><body>");
    printWindow.document.write(`<h3 style="text-align:center;">${service.name}</h3>`);
    printWindow.document.write(`<div style="text-align:center;margin-top:20px;">${svgString}</div>`);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } catch (err) {
    console.error("Erreur génération QR code imprimable", err);
    alert("Impossible de générer le QR code pour impression");
  }
};


  if (!uid || loadingTips)
    return <div className="flex justify-center items-center h-screen">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 drop-shadow">Dashboard</h1>
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

      {/* Services */}
      <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Services</h2>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
      >
        {services.map(service => (
          <motion.div
            key={service.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between transition-transform duration-200"
          >
            <h3 className="text-lg font-semibold mb-4">{service.name}</h3>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => setSelectedService(service)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
              >
                📱 Afficher QR code
              </button>
              <button
                onClick={() => setSendModal({ open: true, type: "email", service })}
                className="px-4 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 transition flex items-center justify-center space-x-2"
              >
                <FaEnvelope /> <span>Email</span>
              </button>
              <button
                onClick={() => setSendModal({ open: true, type: "sms", service })}
                className="px-4 py-2 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-400 transition flex items-center justify-center space-x-2"
              >
                <FaSms /> <span>SMS</span>
              </button>
              <button
                onClick={() => handlePrint(service)}
                className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-semibold hover:bg-yellow-400 transition flex items-center justify-center space-x-2"
              >
                <FaPrint /> <span>Imprimer</span>
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Modal QRCode */}
      <ModalQRCode
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
        value={qrValue}
        serviceName={selectedService?.name}
      />

      {/* Modal Envoi Email/SMS */}
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
    </div>
  );
}

export default Dashboard;
