import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaHotel, FaUtensils, FaBuilding, FaMapMarkerAlt, FaPhone, FaSpa } from "react-icons/fa";
import { doc, runTransaction } from "firebase/firestore";
import TipBoxLogo from '../assets/TipBox.png';


function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Infos entreprise
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelType, setHotelType] = useState("");
  const [hotelSiret, setHotelSiret] = useState("");

  // Step formulaire
  const [step, setStep] = useState(1);

  // Redirection si déjà connecté
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) navigate("/dashboard");
    });
    return unsubscribe;
  }, [navigate]);

  const isValidSiret = (siret) => /^\d{14}$/.test(siret);

  const setErrorAndReturn = (msg) => {
    setError(msg);
    return false;
  };

  const validateStep = () => {
    if (step === 1) {
      if (!email || !password) return setErrorAndReturn("Email et mot de passe obligatoires");
      if (isRegister && password.length < 6) return setErrorAndReturn("Mot de passe minimum 6 caractères");
    }
    if (step === 2) {
      if (!hotelName || !hotelAddress || !hotelPhone || !hotelType || !hotelSiret)
        return setErrorAndReturn("Tous les champs entreprise sont obligatoires, y compris le SIRET");
      if (!isValidSiret(hotelSiret)) return setErrorAndReturn("SIRET invalide (14 chiffres requis)");
    }
    setError("");
    return true;
  };

  const handleNext = async () => {
    if (validateStep()) setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);


  const handleSubmit = async () => {
    if (!(validateStep())) return;

    try {
      if (isRegister) {
        // Création du compte utilisateur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;

        const siretRef = doc(db, "sirets", hotelSiret);
        const companyRef = doc(db, "companies", userId);

        await runTransaction(db, async (transaction) => {
          const siretDoc = await transaction.get(siretRef);
          if (siretDoc.exists()) throw new Error("Ce SIRET est déjà utilisé");

          transaction.set(siretRef, { companyId: userId });
          transaction.set(companyRef, {
            hotelName,
            hotelAddress,
            hotelPhone,
            hotelType,
            siret: hotelSiret,
            createdAt: new Date()
          });
        });

      } else {
        // Connexion
        await signInWithEmailAndPassword(auth, email, password);
      }

      navigate("/dashboard");

    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "Cet email est déjà utilisé",
        "auth/invalid-email": "Email invalide",
        "auth/user-not-found": "Utilisateur non trouvé",
        "auth/wrong-password": "Mot de passe incorrect"
      };
      setError(messages[err.code] || err.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Branding */}
      <div className="md:w-1/2 bg-gradient-to-br from-blue-800 to-indigo-600 text-white flex flex-col justify-center items-center p-10 space-y-6">
        <div className="flex items-center space-x-3">
          <img
          src={TipBoxLogo}
          alt="TipBox Logo"
          className="h-20 w-20 rounded-full shadow-md"
          />
          <h1 className="text-5xl font-extrabold tracking-wide drop-shadow-lg">TipBox</h1>
        </div>
        <p className="text-xl font-semibold text-center max-w-xs">
          La tirelire de vos équipiers
        </p>
        <div className="flex space-x-4 mt-6">
          <FaHotel size={40} className="opacity-80" />
          <FaUtensils size={40} className="opacity-80" />
          <FaSpa size={40} className="opacity-80" />
        </div>
      </div>
      {/* Login / Register */}
      <div className="md:w-1/2 flex flex-col justify-center items-center bg-gray-100 p-10 space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">
          {isRegister ? "Créer un compte entreprise" : "Connexion"}
        </h2>

        {isRegister ? (
          <>
            {step === 1 && (
              <div className="space-y-4 w-80">
                <input type="email" placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} className="border p-3 rounded w-full shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="border p-3 rounded w-full shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 w-80">
                <div className="flex items-center space-x-2">
                  <FaBuilding className="text-gray-500" />
                  <input type="text" placeholder="Nom de l'entreprise" value={hotelName} onChange={e => setHotelName(e.target.value)} className="flex-1 border p-2 rounded focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex items-center space-x-2">
                  <FaMapMarkerAlt className="text-gray-500" />
                  <input type="text" placeholder="Adresse complète" value={hotelAddress} onChange={e => setHotelAddress(e.target.value)} className="flex-1 border p-2 rounded focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="flex items-center space-x-2">
                  <FaPhone className="text-gray-500" />
                  <input type="text" placeholder="Téléphone" value={hotelPhone} onChange={e => setHotelPhone(e.target.value)} className="flex-1 border p-2 rounded focus:ring-2 focus:ring-indigo-400" />
                </div>
                <input type="text" placeholder="Type d'entreprise (Hôtel, Restaurant…)" value={hotelType} onChange={e => setHotelType(e.target.value)} className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-400" />
                <input type="text" placeholder="SIRET de l'entreprise" value={hotelSiret} onChange={e => setHotelSiret(e.target.value)} className="border p-2 rounded w-full focus:ring-2 focus:ring-indigo-400" />
              </div>
            )}

            {error && <p className="text-red-500">{error}</p>}

            <div className="flex justify-between w-80 mt-2">
              {step > 1 && <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">← Retour</button>}
              <button onClick={step < 2 ? handleNext : handleSubmit} className={`px-4 py-2 ${step < 2 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-600 hover:bg-green-700"} text-white rounded transition`}>
                {step < 2 ? "Suivant →" : "S'inscrire"}
              </button>
            </div>
          </>
        ) : (
          <>
            <input type="email" placeholder="Email professionnel" value={email} onChange={e => setEmail(e.target.value)} className="border p-3 rounded w-80 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="border p-3 rounded w-80 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            {error && <p className="text-red-500">{error}</p>}
            <button onClick={handleSubmit} className="w-80 py-3 text-lg font-bold text-white rounded-xl shadow-lg bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition">
              Se connecter
            </button>
          </>
        )}

        <button onClick={() => { setIsRegister(!isRegister); setError(""); setStep(1); }} className="text-indigo-600 font-semibold hover:underline mt-2">
          {isRegister ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
