import React, { useEffect, useState } from "react";
import { auth } from "../firebase"; // ton fichier firebase config
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // ton Firestore

const StripeConnectStatus = () => {
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStripeAccount = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const docRef = doc(db, "companies", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setStripeAccountId(docSnap.data().stripeAccountId || null);
        }
      } catch (err) {
        console.error("Erreur récupération compte Stripe:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStripeAccount();
  }, []);

  const handleConnectStripe = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/create-connected-account`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert("Impossible de créer le compte Stripe Connect");
    }
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div>
      {stripeAccountId ? (
        <p style={{ color: "green", fontWeight: "bold" }}>Compte Stripe connecté ✅</p>
      ) : (
        <button
          onClick={handleConnectStripe}
          style={{
            padding: "10px 20px",
            backgroundColor: "#6772E5",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Connecter mon compte Stripe
        </button>
      )}
    </div>
  );
};

export default StripeConnectStatus;
