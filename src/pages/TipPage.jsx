// src/pages/TipPage.jsx
import React, { useState } from "react";
import QRCode from "react-qr-code";
import { FaEuroSign, FaRegCommentDots } from "react-icons/fa";
import { motion } from "framer-motion";

function TipPage() {
  const [amount, setAmount] = useState(500);
  const [message, setMessage] = useState("");

  const queryParams = new URLSearchParams(window.location.search);
  const service = queryParams.get("service") || "Concierge";
  const uid = queryParams.get("uid") || "";

  const handleQuickAmount = (val) => setAmount(val);

  const handleCheckout = async () => {
  // Forcer un montant minimum
  const finalAmount = Math.max(50, Math.round(amount));

  // Vérifier uid et service
  if (!uid || !service) return alert("Erreur : service ou utilisateur manquant");

  try {
    console.log("Envoi au serveur :", { amount: finalAmount, message, service, uid });

    const res = await fetch("http://localhost:4242/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: finalAmount, message, service, uid }),
    });

    const data = await res.json();
    if (!data.url) return alert("Erreur : impossible de créer la session");
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert("Erreur serveur, réessayez plus tard");
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6"
      >
        {/* Titre */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            💶 Laisser un pourboire
          </h1>
          <p className="text-gray-600 mt-2">
            Pour le service : <span className="font-semibold">{service}</span>
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
            <QRCode
              value={`${window.location.origin}/tippage?service=${service}&uid=${uid}`}
              size={160}
            />
          </div>
        </div>

        {/* Montants rapides */}
        <div className="grid grid-cols-3 gap-3">
          {[200, 500, 1000].map((val) => (
            <button
              key={val}
              onClick={() => handleQuickAmount(val)}
              className={`px-4 py-3 rounded-xl font-bold transition ${
                amount === val
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              }`}
            >
              {val / 100}€
            </button>
          ))}
        </div>

        {/* Champ montant personnalisé */}
        <div className="flex items-center space-x-2">
          <FaEuroSign className="text-gray-500" />
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={amount / 100}
            onChange={(e) => setAmount(Number(e.target.value) * 100)}
            className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-400"
            placeholder="0,50€ minimum"
          />
        </div>

        {/* Message optionnel */}
        <div>
          <label className="flex items-center text-gray-600 mb-1">
            <FaRegCommentDots className="mr-2" /> Message (facultatif)
          </label>
          <textarea
            placeholder="Un mot sympa pour l'équipe..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Bouton paiement */}
        <button
          onClick={handleCheckout}
          className="w-full py-3 text-lg font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition"
        >
          ✅ Payer {amount / 100}€
        </button>
      </motion.div>
    </div>
  );
}

export default TipPage;


// import React, { useState } from "react";
// import QRCode from "react-qr-code";
// import { FaEuroSign, FaRegCommentDots } from "react-icons/fa";
// import { motion } from "framer-motion";

// function TipPage() {
//   const [amount, setAmount] = useState(500); // en centimes
//   const [message, setMessage] = useState("");

//   const queryParams = new URLSearchParams(window.location.search);
//   const service = queryParams.get("service") || "Concierge";
//   // const uid = queryParams.get("uid") || "";

//   const handleQuickAmount = (val) => setAmount(val);

//   const handleCheckout = async () => {
//     if (amount < 50) return alert("Le montant minimum est de 0,50€");

//     try {
//       const res = await fetch("http://localhost:4242/create-checkout-session", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ amount, message, service }),
//       });


//       const data = await res.json();
//       if (!data.url) {
//         console.error("Stripe URL non reçue :", data);
//         alert("Erreur : impossible de créer la session");
//         return;
//       }

//       window.location.href = data.url;
//     } catch (err) {
//       console.error("Erreur création session Stripe :", err);
//       alert("Erreur serveur, réessayez plus tard");
//     }
//   };

//   const qrUrl = `${window.location.origin}/tippage?service=${service}`;

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 px-4">
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6 }}
//         className="bg-white shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6"
//       >
//         <div className="text-center">
//           <h1 className="text-3xl font-extrabold text-indigo-700">💶 Laisser un pourboire</h1>
//           <p className="text-gray-600 mt-2">
//             Pour le service : <span className="font-semibold">{service}</span>
//           </p>
//         </div>

//         <div className="flex justify-center">
//           <div className="p-4 bg-gray-50 rounded-xl shadow-inner">
//             <QRCode value={qrUrl} size={160} />
//           </div>
//         </div>

//         <div className="grid grid-cols-3 gap-3">
//           {[200, 500, 1000].map((val) => (
//             <button
//               key={val}
//               onClick={() => handleQuickAmount(val)}
//               className={`px-4 py-3 rounded-xl font-bold transition ${
//                 amount === val
//                   ? "bg-indigo-600 text-white shadow-md"
//                   : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
//               }`}
//             >
//               {val / 100}€
//             </button>
//           ))}
//         </div>

//         <div className="flex items-center space-x-2">
//           <FaEuroSign className="text-gray-500" />
//           <input
//             type="number"
//             min={0.5}
//             step={0.5}
//             value={amount / 100}
//             onChange={(e) => setAmount(Number(e.target.value) * 100)}
//             className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-400"
//             placeholder="0,50€ minimum"
//           />
//         </div>

//         <div>
//           <label className="flex items-center text-gray-600 mb-1">
//             <FaRegCommentDots className="mr-2" /> Message (facultatif)
//           </label>
//           <textarea
//             placeholder="Un mot sympa pour le service..."
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             className="w-full border border-gray-300 rounded-lg p-3 h-24 focus:ring-2 focus:ring-indigo-400"
//           />
//         </div>

//         <button
//           onClick={handleCheckout}
//           className="w-full py-3 text-lg font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition"
//         >
//           ✅ Payer {amount / 100}€
//         </button>
//       </motion.div>
//     </div>
//   );
// }

// export default TipPage;
