// // src/components/ModalQRCode.jsx
// import React from "react";
// import QRCode from "react-qr-code";

// export default function ModalQRCode({ isOpen, onClose, value, serviceName }) {
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
//       <div className="bg-white rounded-2xl p-6 shadow-xl text-center relative max-w-lg w-full mx-4">
//         <h2 className="text-xl font-bold mb-4">
//           Scannez pour laisser un pourboire – <span className="text-indigo-600">{serviceName}</span>
//         </h2>
//         <div className="flex justify-center mb-6">
//           <QRCode value={value} size={250} />
//         </div>
//         <button
//           onClick={onClose}
//           className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition"
//         >
//           Fermer
//         </button>
//       </div>
//     </div>
//   );
// }
import React from "react";
import QRCode from "react-qr-code";

function ModalQRCode({ isOpen, onClose, value, serviceName }) {
  if (!isOpen) return null;

 const tipLink = value; // ton `value` contient déjà l’URL vers /tip

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl text-center space-y-4">
        <h2 className="text-xl font-bold">QR Code - {serviceName}</h2>
        <div className="p-4 bg-gray-100 rounded-lg">
          <QRCode value={value} size={180} />
        </div>
       {/* Lien direct vers la page Tip */}
       <div className="mt-4">
         <a
           href={tipLink}
           target="_blank"
           rel="noopener noreferrer"
           className="text-indigo-600 font-semibold underline"
         >
           Ouvrir la page Tip
         </a>
       </div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

export default ModalQRCode;
