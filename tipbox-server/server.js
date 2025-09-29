import express from "express";
import Stripe from "stripe";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "./firebaseAdmin.js";

export function createApp({ stripeKey, emailUser, emailPass }) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Stripe
  const stripe = new Stripe(stripeKey);

  // Nodemailer
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass }
  });

  // --- Fonction utilitaire pour envoyer un mail d’invitation ---
  async function sendInvitationEmail(email, tempPassword) {
    await transporter.sendMail({
      from: `"TipBox" <${emailUser}>`,
      to: email,
      subject: "Invitation TipBox - Configurez votre mot de passe",
      text: `Bienvenue sur TipBox !\n\nVotre mot de passe temporaire : ${tempPassword}\nConnectez-vous pour définir votre mot de passe définitif.\n`
    });
  }

  // --- Helpers ---
  const toStrArray = arr => (arr || []).map(String);

  async function upsertUserDoc(userRecord, { firstName = "", lastName = "", role, hotelUid, serviceIds = [] } = {}) {
    const uid = userRecord.uid;
    const email = userRecord.email || "";
    const displayName = userRecord.displayName || `${firstName} ${lastName}`.trim();
    const services = Array.from(new Set([...(userRecord.customClaims?.services || []).map(String), ...toStrArray(serviceIds)]));
    const lockedServices = (userRecord.customClaims?.lockedServices || []).map(String);

    const doc = {
      email,
      displayName,
      firstName,
      lastName,
      role: role || userRecord.customClaims?.role || null,
      hotelUid: hotelUid || userRecord.customClaims?.hotelUid || null,
      services,
      lockedServices,
      updatedAt: new Date()
    };

    await admin.firestore().collection("users").doc(uid).set(doc, { merge: true });
  }

  async function createOrUpdateUser({ email, firstName, lastName, role, hotelUid, serviceIds = [] }) {
    let userRecord;
    let isNewUser = false;
    let tempPassword;

    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        tempPassword = Math.random().toString(36).slice(-8);
        userRecord = await admin.auth().createUser({
          email,
          password: tempPassword,
          displayName: `${firstName} ${lastName}`
        });
        isNewUser = true;
        await sendInvitationEmail(email, tempPassword);
      } else throw err;
    }

    const currentServices = userRecord.customClaims?.services || [];
    const newServices = Array.from(new Set([...currentServices.map(String), ...toStrArray(serviceIds)]));

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...userRecord.customClaims,
      role,
      hotelUid,
      services: newServices
    });

    await upsertUserDoc(userRecord, { firstName, lastName, role, hotelUid, serviceIds: newServices });

    return { uid: userRecord.uid, isNewUser };
  }

//--- Toutes tes routes restent identiques ---
// --- Routes utilisateurs ---
app.get("/users", async (req, res) => {
  const { hotelUid } = req.query;
  if (!hotelUid) return res.status(400).json({ error: "hotelUid manquant" });

  try {
    const snap = await admin.firestore().collection("users").where("hotelUid", "==", hotelUid).get();
    const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    console.error("Erreur récupération utilisateurs", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/create-user", async (req, res) => {
  const { email, firstName, lastName, role, hotelUid, serviceIds = [] } = req.body;
  if (!email || !role || !hotelUid) return res.status(400).json({ error: "Champs manquants" });

  try {
    const result = await createOrUpdateUser({ email, firstName, lastName, role, hotelUid, serviceIds });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Erreur create-user:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/add-service-user", async (req, res) => {
  const { email, firstName, lastName, role, serviceId, hotelUid } = req.body;
  if (!email || !role || !serviceId || !hotelUid)
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });

  try {
    let userRecord;
    let isNewUser = false;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        isNewUser = true;
        const tempPassword = Math.random().toString(36).slice(-8);
        userRecord = await admin.auth().createUser({
          email,
          password: tempPassword,
          displayName: `${firstName} ${lastName}`,
        });
        await sendInvitationEmail(email, tempPassword);
      } else throw err;
    }

    const currentServices = userRecord.customClaims?.services || [];
    if (currentServices.map(String).includes(String(serviceId)))
      return res.status(400).json({ error: "Utilisateur déjà assigné à ce service" });

    const updated = Array.from(new Set([...currentServices.map(String), String(serviceId)]));

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      ...userRecord.customClaims,
      services: updated,
      role,
      hotelUid,
    });

    await upsertUserDoc(userRecord, { firstName, lastName, role, hotelUid, serviceIds: updated });

    res.json({ success: true, uid: userRecord.uid, isNewUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/update-user-services", async (req, res) => {
  const { uid, serviceId, grantAccess } = req.body;
  if (!uid || !serviceId) return res.status(400).json({ error: "uid et serviceId obligatoires" });

  try {
    const user = await admin.auth().getUser(uid);
    const currentServices = user.customClaims?.services || [];
    const updatedServices = grantAccess
      ? Array.from(new Set([...currentServices.map(String), String(serviceId)]))
      : currentServices.filter(s => String(s) !== String(serviceId));

    await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, services: updatedServices });
    await upsertUserDoc(user, { serviceIds: updatedServices });

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur update-user-services:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/remove-service-user", async (req, res) => {
  const { uid, serviceId } = req.body;
  if (!uid || !serviceId) return res.status(400).json({ error: "uid et serviceId obligatoires" });

  try {
    const user = await admin.auth().getUser(uid);
    const currentServices = user.customClaims?.services || [];
    const updatedServices = currentServices.filter(s => String(s) !== String(serviceId));

    await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, services: updatedServices });
    await upsertUserDoc(user, { serviceIds: updatedServices });

    res.json({ success: true });
  } catch (err) {
    console.error("Erreur remove-service-user:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Routes services (Firestore) ---
app.post("/services", async (req, res) => {
  const { name, uid } = req.body;
  if (!name || !uid) return res.status(400).json({ error: "Nom et uid obligatoires" });

  try {
    const docRef = await admin.firestore().collection("services").add({ name, uid, createdAt: new Date() });
    res.json({ id: docRef.id, name, uid });
  } catch (err) {
    console.error("Erreur création service:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/services", async (req, res) => {
  const { uid } = req.query;
  if (!uid) return res.status(400).json({ error: "uid manquant" });

  try {
    const snap = await admin.firestore().collection("services").where("uid", "==", uid).get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (err) {
    console.error("Erreur récupération services:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Route spéciale pour créer un directeur depuis le frontend ---
app.post("/create-user-director", async (req, res) => {
  const { uid, email, password, companyData } = req.body;
  if (!uid || !email || !password || !companyData) {
    return res.status(400).json({ error: "uid, email, password et companyData sont obligatoires" });
  }

  try {
    // 1️⃣ Créer l’utilisateur dans Firebase Auth si nécessaire
    let userRecord;
    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({
          uid,
          email,
          password,
          displayName: companyData.hotelName
        });
      } else {
        throw err;
      }
    }

    // 2️⃣ Définir les claims (role director)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "director", companyId: companyData.id });

    // 3️⃣ Créer le document company
    await admin.firestore().collection("companies").doc(companyData.id).set({
      ...companyData,
      ownerUid: userRecord.uid,
      createdAt: new Date()
    });

    // 4️⃣ Ajouter le SIRET à la collection `sirets` pour éviter les doublons
    await admin.firestore().collection("sirets").doc(companyData.siret).set({
      companyId: companyData.id,
      createdAt: new Date()
    });

    res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    console.error("Erreur create-user-director:", err);
    res.status(500).json({ error: err.message });
  }
});


  // --- Exemple pour Stripe Checkout ---
  app.post("/create-checkout-session", async (req, res) => {
    try {
      const { amount, message, service, uid } = req.body;

      if (!service) return res.status(400).json({ error: "Le service est obligatoire" });

      const unitAmount = Math.round(Number(amount));
      if (isNaN(unitAmount) || unitAmount < 50)
        return res.status(400).json({ error: "Montant invalide (minimum 0,50€)" });

      const productData = { name: `Pourboire - Service: ${service}` };
      if (message && message.trim()) productData.description = message.trim();

      const lineItem = {
        price_data: {
          currency: "eur",
          product_data: productData,
          unit_amount: unitAmount,
        },
        quantity: 1,
      };

      const metadata = { service };
      if (message && message.trim()) metadata.message = message.trim();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [lineItem],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/tip-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/tip-cancel`,
        metadata,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout error :", err);
      res.status(500).json({ error: "Erreur serveur Stripe" });
    }
  });

  // --- Webhook Stripe ---
  app.post("/webhook", express.raw({ type: 'application/json' }), (req, res) => res.status(200).send('ok'));

  return app;
}


// import express from "express";
// import Stripe from "stripe";
// import cors from "cors";
// import nodemailer from "nodemailer";
// import admin from "./firebaseAdmin.js";
// import * as functions from "firebase-functions";

// // dotenv.config()

// // --- Config Firebase Functions ---
// const stripeKey = functions.config().stripe.key;
// const emailUser = functions.config().email.user;
// const emailPass = functions.config().email.pass;

// // --- Express app ---
// const app = express();

// // --- Stripe ---
// const stripe = new Stripe(stripeKey);

// // --- Nodemailer ---
// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.sendinblue.com",
//   port: 587,
//   secure: false,
//   auth: { user: emailUser, pass: emailPass }
// });

// // --- Middleware ---
// app.use(cors());
// app.use(express.json());


// // --- Fonction utilitaire pour envoyer un mail d’invitation ---
// async function sendInvitationEmail(email, tempPassword) {
//   await transporter.sendMail({
//     from: `"TipBox" <${emailUser}>`,
//     to: email,
//     subject: "Invitation TipBox - Configurez votre mot de passe",
//     text: `Bienvenue sur TipBox !\n\nVotre mot de passe temporaire : ${tempPassword}\nConnectez-vous pour définir votre mot de passe définitif.\n`
//   });
// }

// // --- Helpers ---
// const toStrArray = arr => (arr || []).map(String);

// async function upsertUserDoc(userRecord, { firstName = "", lastName = "", role, hotelUid, serviceIds = [] } = {}) {
//   const uid = userRecord.uid;
//   const email = userRecord.email || "";
//   const displayName = userRecord.displayName || `${firstName} ${lastName}`.trim();
//   const services = Array.from(new Set([...(userRecord.customClaims?.services || []).map(String), ...toStrArray(serviceIds)]));
//   const lockedServices = (userRecord.customClaims?.lockedServices || []).map(String);

//   const doc = {
//     email,
//     displayName,
//     firstName,
//     lastName,
//     role: role || userRecord.customClaims?.role || null,
//     hotelUid: hotelUid || userRecord.customClaims?.hotelUid || null,
//     services,
//     lockedServices,
//     updatedAt: new Date()
//   };

//   await admin.firestore().collection("users").doc(uid).set(doc, { merge: true });
// }

// async function createOrUpdateUser({ email, firstName, lastName, role, hotelUid, serviceIds = [] }) {
//   let userRecord;
//   let isNewUser = false;
//   let tempPassword;

//   try {
//     userRecord = await admin.auth().getUserByEmail(email);
//   } catch (err) {
//     if (err.code === "auth/user-not-found") {
//       tempPassword = Math.random().toString(36).slice(-8);
//       userRecord = await admin.auth().createUser({
//         email,
//         password: tempPassword,
//         displayName: `${firstName} ${lastName}`
//       });
//       isNewUser = true;
//       await sendInvitationEmail(email, tempPassword);
//     } else throw err;
//   }

//   const currentServices = userRecord.customClaims?.services || [];
//   const newServices = Array.from(new Set([...currentServices.map(String), ...toStrArray(serviceIds)]));

//   await admin.auth().setCustomUserClaims(userRecord.uid, {
//     ...userRecord.customClaims,
//     role,
//     hotelUid,
//     services: newServices
//   });

//   await upsertUserDoc(userRecord, { firstName, lastName, role, hotelUid, serviceIds: newServices });

//   return { uid: userRecord.uid, isNewUser };
// }

// // --- Routes utilisateurs ---
// app.get("/users", async (req, res) => {
//   const { hotelUid } = req.query;
//   if (!hotelUid) return res.status(400).json({ error: "hotelUid manquant" });

//   try {
//     const snap = await admin.firestore().collection("users").where("hotelUid", "==", hotelUid).get();
//     const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
//     res.json(users);
//   } catch (err) {
//     console.error("Erreur récupération utilisateurs", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/create-user", async (req, res) => {
//   const { email, firstName, lastName, role, hotelUid, serviceIds = [] } = req.body;
//   if (!email || !role || !hotelUid) return res.status(400).json({ error: "Champs manquants" });

//   try {
//     const result = await createOrUpdateUser({ email, firstName, lastName, role, hotelUid, serviceIds });
//     res.json({ success: true, ...result });
//   } catch (err) {
//     console.error("Erreur create-user:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/add-service-user", async (req, res) => {
//   const { email, firstName, lastName, role, serviceId, hotelUid } = req.body;
//   if (!email || !role || !serviceId || !hotelUid)
//     return res.status(400).json({ error: "Tous les champs sont obligatoires" });

//   try {
//     let userRecord;
//     let isNewUser = false;
//     try {
//       userRecord = await admin.auth().getUserByEmail(email);
//     } catch (err) {
//       if (err.code === "auth/user-not-found") {
//         isNewUser = true;
//         const tempPassword = Math.random().toString(36).slice(-8);
//         userRecord = await admin.auth().createUser({
//           email,
//           password: tempPassword,
//           displayName: `${firstName} ${lastName}`,
//         });
//         await sendInvitationEmail(email, tempPassword);
//       } else throw err;
//     }

//     const currentServices = userRecord.customClaims?.services || [];
//     if (currentServices.map(String).includes(String(serviceId)))
//       return res.status(400).json({ error: "Utilisateur déjà assigné à ce service" });

//     const updated = Array.from(new Set([...currentServices.map(String), String(serviceId)]));

//     await admin.auth().setCustomUserClaims(userRecord.uid, {
//       ...userRecord.customClaims,
//       services: updated,
//       role,
//       hotelUid,
//     });

//     await upsertUserDoc(userRecord, { firstName, lastName, role, hotelUid, serviceIds: updated });

//     res.json({ success: true, uid: userRecord.uid, isNewUser });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/update-user-services", async (req, res) => {
//   const { uid, serviceId, grantAccess } = req.body;
//   if (!uid || !serviceId) return res.status(400).json({ error: "uid et serviceId obligatoires" });

//   try {
//     const user = await admin.auth().getUser(uid);
//     const currentServices = user.customClaims?.services || [];
//     const updatedServices = grantAccess
//       ? Array.from(new Set([...currentServices.map(String), String(serviceId)]))
//       : currentServices.filter(s => String(s) !== String(serviceId));

//     await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, services: updatedServices });
//     await upsertUserDoc(user, { serviceIds: updatedServices });

//     res.json({ success: true });
//   } catch (err) {
//     console.error("Erreur update-user-services:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.post("/remove-service-user", async (req, res) => {
//   const { uid, serviceId } = req.body;
//   if (!uid || !serviceId) return res.status(400).json({ error: "uid et serviceId obligatoires" });

//   try {
//     const user = await admin.auth().getUser(uid);
//     const currentServices = user.customClaims?.services || [];
//     const updatedServices = currentServices.filter(s => String(s) !== String(serviceId));

//     await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, services: updatedServices });
//     await upsertUserDoc(user, { serviceIds: updatedServices });

//     res.json({ success: true });
//   } catch (err) {
//     console.error("Erreur remove-service-user:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // --- Routes services (Firestore) ---
// app.post("/services", async (req, res) => {
//   const { name, uid } = req.body;
//   if (!name || !uid) return res.status(400).json({ error: "Nom et uid obligatoires" });

//   try {
//     const docRef = await admin.firestore().collection("services").add({ name, uid, createdAt: new Date() });
//     res.json({ id: docRef.id, name, uid });
//   } catch (err) {
//     console.error("Erreur création service:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// app.get("/services", async (req, res) => {
//   const { uid } = req.query;
//   if (!uid) return res.status(400).json({ error: "uid manquant" });

//   try {
//     const snap = await admin.firestore().collection("services").where("uid", "==", uid).get();
//     res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
//   } catch (err) {
//     console.error("Erreur récupération services:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // --- Route spéciale pour créer un directeur depuis le frontend ---
// app.post("/create-user-director", async (req, res) => {
//   const { uid, email, password, companyData } = req.body;
//   if (!uid || !email || !password || !companyData) {
//     return res.status(400).json({ error: "uid, email, password et companyData sont obligatoires" });
//   }

//   try {
//     // 1️⃣ Créer l’utilisateur dans Firebase Auth si nécessaire
//     let userRecord;
//     try {
//       userRecord = await admin.auth().getUser(uid);
//     } catch (err) {
//       if (err.code === "auth/user-not-found") {
//         userRecord = await admin.auth().createUser({
//           uid,
//           email,
//           password,
//           displayName: companyData.hotelName
//         });
//       } else {
//         throw err;
//       }
//     }

//     // 2️⃣ Définir les claims (role director)
//     await admin.auth().setCustomUserClaims(userRecord.uid, { role: "director", companyId: companyData.id });

//     // 3️⃣ Créer le document company
//     await admin.firestore().collection("companies").doc(companyData.id).set({
//       ...companyData,
//       ownerUid: userRecord.uid,
//       createdAt: new Date()
//     });

//     // 4️⃣ Ajouter le SIRET à la collection `sirets` pour éviter les doublons
//     await admin.firestore().collection("sirets").doc(companyData.siret).set({
//       companyId: companyData.id,
//       createdAt: new Date()
//     });

//     res.json({ success: true, uid: userRecord.uid });
//   } catch (err) {
//     console.error("Erreur create-user-director:", err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // --- Stripe Checkout & Tips ---
// app.post("/create-checkout-session", async (req, res) => {
//   try {
//     console.log("Requête reçue pour Stripe checkout :", req.body);

//     const { amount, message, service, uid } = req.body;

//     if (!service) {
//       console.log("Erreur : service manquant");
//       return res.status(400).json({ error: "Le service est obligatoire" });
//     }

//     const unitAmount = Math.round(Number(amount));
//     console.log("Montant reçu :", amount, "→ converti en centimes :", unitAmount);

//     if (isNaN(unitAmount) || unitAmount < 50) {
//       console.log("Erreur : montant invalide");
//       return res.status(400).json({ error: "Montant invalide (minimum 0,50€)" });
//     }

//     // Construire product_data sans description si message vide
//     const productData = { name: `Pourboire - Service: ${service}` };
//     if (message && message.trim()) {
//       productData.description = message.trim();
//       console.log("Description ajoutée :", productData.description);
//     } else {
//       console.log("Pas de description pour Stripe (message vide ou absent)");
//     }

//     const lineItem = {
//       price_data: {
//         currency: "eur",
//         product_data: productData,
//         unit_amount: unitAmount,
//       },
//       quantity: 1,
//     };

//     console.log("Line item préparé pour Stripe :", lineItem);

//     const metadata = { service };
//     if (message && message.trim()) {
//       metadata.message = message.trim();
//     }
//     console.log("Metadata Stripe :", metadata);

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [lineItem],
//       mode: "payment",
//       success_url: `${process.env.FRONTEND_URL}/tip-success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.FRONTEND_URL}/tip-cancel`,
//       metadata,
//     });

//     console.log("Session Stripe créée avec succès :", session.id);
//     console.log("URL de redirection :", session.url);

//     res.json({ url: session.url });
//   } catch (err) {
//     console.error("Stripe checkout error :", err);
//     res.status(500).json({ error: "Erreur serveur Stripe" });
//   }
// });


// // Optionnel : webhook Stripe
// app.post("/webhook", express.raw({ type: 'application/json' }), (req, res) => {
//   // Ici tu pourras gérer les événements Stripe (paiement réussi, échec, etc.)
//   res.status(200).send('ok');
// });

// // app.listen(4242, () => console.log("✅ Server running on http://localhost:4242"));
// // const PORT = process.env.PORT || 4242; // fallback pour dev local
// // app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

//   return app; // pour que index.js puisse l’importer
// }
