// src/pages/LoginPage.jsx
import React, { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { FaHotel, FaUtensils, FaBuilding, FaMapMarkerAlt, FaPhone, FaSpa } from "react-icons/fa";
import { doc, runTransaction } from "firebase/firestore";
import TipBoxLogo from '../assets/TipBox.png';
import ConsentModal from '../components/ConsentModal';

// import "dotenv/config";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
console.log("Backend URL:", backendUrl);

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [managerServiceId, setManagerServiceId] = useState(null);

  // Consentements
  const [consentEmailMarketing, setConsentEmailMarketing] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  // Infos entreprise
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [hotelPhone, setHotelPhone] = useState("");
  const [hotelType, setHotelType] = useState("");
  const [hotelSiret, setHotelSiret] = useState("");

  // Step formulaire
  const [step, setStep] = useState(1);

  // Plan sélectionné
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [isRedirecting, setIsRedirecting] = useState(false);

  const plans = [
    { name: "Starter", monthlyFee: 12, includedQRCodes: 50 },
    { name: "Standard", monthlyFee: 23, includedQRCodes: 100 },
    { name: "Premium", monthlyFee: 34, includedQRCodes: 300 },
  ];

  // Redirection si déjà connecté
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {

        if (isRedirecting) return;

        const idTokenResult = await user.getIdTokenResult();
        const userRole = idTokenResult.claims.role || "director";
        const serviceId = idTokenResult.claims.serviceId || null;
        setRole(userRole);
        setManagerServiceId(serviceId);
        navigate("/dashboard");
      }
    });
    return unsubscribe;
  }, [navigate]);

  const isValidSiret = (siret) => /^\d{14}$/.test(siret);
  const setErrorAndReturn = (msg) => { setError(msg); return false; };

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
    if (step === 3 && !selectedPlan) return setErrorAndReturn("Veuillez sélectionner un plan");
    setError("");
    return true;
  };

  const handleNext = () => { if (validateStep()) setStep(prev => prev + 1); };
  const handleBack = () => setStep(prev => prev - 1);

const handleSubmit = async () => {
  if (!validateStep()) return;

  try {
    let userCredential;
    let user;

    if (isRegister) {
      // 1️⃣ Créer l’utilisateur Firebase
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      const userId = user.uid;

      // 2️⃣ Créer docs Firestore pour SIRET et entreprise, avec role director
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
          plan: selectedPlan,
          role: "director",
          createdAt: new Date(),
        });
      });

      // 3️⃣ Récupérer le token pour authentifier les fetchs backend
      const token = await user.getIdToken();
      console.log("Backend URL:", import.meta.env.VITE_BACKEND_URL);

      // 4️⃣ Appeler backend pour créer l’utilisateur côté serveur
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/register-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          hotelName,
          hotelAddress,
          hotelPhone,
          hotelType,
          siret: hotelSiret,
          plan: selectedPlan,
        }),
      });
      // Après la réponse backend
      await user.getIdToken(true);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur backend create-user: ${errText}`);
      }

      const data = await response.json();
      console.log("Hôtel enregistré côté backend:", data);

      // 5️⃣ Marquer redirection en cours et créer session Stripe
      setIsRedirecting(true);
      await handleSubscriptionCheckout(token);

      return;
    }

    // --- Connexion classique ---
    userCredential = await signInWithEmailAndPassword(auth, email, password);
    user = userCredential.user;

    // --- Détection role via document companies ---
    const companyDoc = await getDoc(doc(db, "companies", user.uid));
    const userRole = companyDoc.exists() ? "director" : (await user.getIdTokenResult()).claims.role || "manager";
    setRole(userRole);

    navigate("/dashboard");

  } catch (err) {
    console.error(err);
    const messages = {
      "auth/email-already-in-use": "Cet email est déjà utilisé",
      "auth/invalid-email": "Email invalide",
      "auth/user-not-found": "Utilisateur non trouvé",
      "auth/wrong-password": "Mot de passe incorrect"
    };
    setError(messages[err.code] || err.message);
  }
};


// -----------------------------
// Créer session Stripe et rediriger
// -----------------------------
const handleSubscriptionCheckout = async (token) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-subscription-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ plan: selectedPlan.name })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur backend Stripe: ${errText}`);
    }

    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      setError("Impossible de créer la session d’abonnement");
    }
  } catch (err) {
    console.error(err);
    setError(err.message || "Erreur serveur lors de la création de la session d’abonnement");
  }
};
  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Branding */}
      <div className="md:w-1/2 bg-gradient-to-br from-blue-800 to-indigo-600 text-white flex flex-col justify-center items-center p-10 space-y-6">
        <div className="flex items-center space-x-3">
          <img src={TipBoxLogo} alt="TipBox Logo" className="h-20 w-20 rounded-full shadow-md" />
          <h1 className="text-5xl font-extrabold tracking-wide drop-shadow-lg">TipBox</h1>
        </div>
        <p className="text-xl font-semibold text-center max-w-xs">
          Facilitez les pourboires de vos clients.
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
              {/* Intégration du ConsentForm */}
              <ConsentModal onSubmit={(consent) => {
                setConsent(consent); // tu crées un useState pour stocker ça dans LoginPage
              }} />

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

            {step === 3 && (
              <div className="space-y-4 w-80">
                <h3 className="text-lg font-bold mb-2">Choisissez votre plan</h3>
                <div className="flex flex-col space-y-2">
                  {plans.map(plan => (
                    <button
                      key={plan.name}
                      onClick={() => setSelectedPlan(plan)}
                      className={`border p-3 rounded w-full text-left ${selectedPlan?.name === plan.name ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800'}`}
                    >
                      {plan.name} - {plan.monthlyFee}€ / mois - {plan.includedQRCodes} QR codes inclus
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-500">{error}</p>}

            {/* Navigation Step */}
            <div className="flex justify-between w-80 mt-4">
              {step > 1 && <button onClick={handleBack} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">← Retour</button>}
              <button
                onClick={step < 3 ? handleNext : handleSubmit}
                className={`px-4 py-2 ${step < 3 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-green-600 hover:bg-green-700"} text-white rounded transition`}
              >
                {step < 3 ? "Suivant →" : "S'inscrire"}
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
        {isRedirecting && (
          <p className="text-indigo-600 font-semibold mt-2">
            Inscription réussie ! Vous allez être redirigé vers le paiement de votre abonnement…
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
