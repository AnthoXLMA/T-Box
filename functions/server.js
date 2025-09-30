import express from "express";
import Stripe from "stripe";
import cors from "cors";
import nodemailer from "nodemailer";
import admin from "./firebaseAdmin.js";
import "dotenv/config";

export function createApp({ stripeKey, emailUser, emailPass }) {
  const app = express();

  const FRONTEND_URL = process.env.FRONTEND_URL || "https://tipbox-a4f99.web.app";

  // --- Middleware CORS global ---
  const corsOptions = {
    origin: ["https://tipbox-a4f99.web.app"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));


  // Middleware pour tous les headers et préflight
  // app.use((req, res, next) => {
  //   res.header("Access-Control-Allow-Origin", FRONTEND_URL);
  //   res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  //   res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
  //   if (req.method === "OPTIONS") return res.sendStatus(204);
  //   next();
  // });

  // Middleware JSON
  app.use(express.json());

  // --- Stripe ---
  const stripe = new Stripe(
  stripeKey || process.env.STRIPE_KEY || ""
    );
    if (!stripeKey && !process.env.STRIPE_KEY) {
      console.warn("⚠️ Aucune clé Stripe trouvée, certaines routes vont échouer");
  }

  // --- Nodemailer ---
  const transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    secure: false,
    auth: { user: emailUser, pass: emailPass }
  });

  // --- Helpers ---
  const toStrArray = arr => (arr || []).map(String);

  async function sendInvitationEmail(email, tempPassword) {
    await transporter.sendMail({
      from: `"TipBox" <${emailUser}>`,
      to: email,
      subject: "Invitation TipBox - Configurez votre mot de passe",
      text: `Bienvenue sur TipBox !\n\nVotre mot de passe temporaire : ${tempPassword}\nConnectez-vous pour définir votre mot de passe définitif.\n`
    });
  }

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

  // --- Middleware token Firebase ---
  async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(403).json({ error: "No token" });

    const idToken = authHeader.split("Bearer ")[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (err) {
      console.error("Token invalide :", err);
      res.status(403).json({ error: "Unauthorized" });
    }
  }

// --- Routes utilisateurs ---
// Récupérer tous les utilisateurs d’un hôtel
app.get("/users", verifyToken, async (req, res) => {
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

// Créer ou mettre à jour un utilisateur
app.post("/create-user", verifyToken, async (req, res) => {
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

// Ajouter un service à un utilisateur
app.post("/add-service-user", verifyToken, async (req, res) => {
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

// Mettre à jour les services d’un utilisateur
app.post("/update-user-services", verifyToken, async (req, res) => {
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

// Retirer un service à un utilisateur
app.post("/remove-service-user", verifyToken, async (req, res) => {
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

// Verrouiller un service pour un utilisateur
app.post("/lock-service-user", verifyToken, async (req, res) => {
  const { uid, serviceId } = req.body;
  if (!uid || !serviceId) return res.status(400).json({ error: "uid et serviceId obligatoires" });

  try {
    const user = await admin.auth().getUser(uid);
    const currentLocked = user.customClaims?.lockedServices || [];
    const updatedLocked = currentLocked.includes(String(serviceId))
      ? currentLocked
      : [...currentLocked.map(String), String(serviceId)];

    await admin.auth().setCustomUserClaims(uid, {
      ...user.customClaims,
      lockedServices: updatedLocked
    });

    await admin.firestore().collection("users").doc(uid).set({
      lockedServices: updatedLocked,
      updatedAt: new Date()
    }, { merge: true });

    res.json({ success: true, lockedServices: updatedLocked });
  } catch (err) {
    console.error("Erreur lock-service-user:", err);
    res.status(500).json({ error: err.message });
  }
});

  // --- Routes services ---
  app.post("/services", verifyToken, async (req, res) => {
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

  app.get("/services", verifyToken, async (req, res) => {
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

app.post("/tip-qr", async (req, res) => {
  const { service, uid, amount, message } = req.body;
  if (!service || !uid || !amount) return res.status(400).json({ error: "Paramètres manquants" });

  const unitAmount = Math.round(Number(amount));
  if (isNaN(unitAmount) || unitAmount < 50) return res.status(400).json({ error: "Montant invalide" });

  if (!stripe) return res.status(500).json({ error: "Stripe non configuré !" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Pourboire - ${service}`, description: message || "" },
          unit_amount: unitAmount
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `${FRONTEND_URL}/tip-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/tip-cancel`,
    });

    res.json({ url: session.url }); // renvoyer l'URL au lieu de redirection directe

  } catch (err) {
    console.error("Erreur Stripe tip-qr:", err);
    res.status(500).json({ error: "Erreur serveur Stripe" });
  }
});


  // --- Stripe Checkout ---
  app.post("/create-checkout-session", async (req, res) => {
    if (!stripe) return res.status(500).json({ error: "Stripe non configuré" });
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
        success_url: `${FRONTEND_URL}/tip-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/tip-cancel`,
        metadata,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error("Stripe checkout error :", err);
      res.status(500).json({ error: "Erreur serveur Stripe" });
    }
  });

  // --- Stripe Webhook ---
  app.options('/webhook', cors(corsOptions));
  app.post("/webhook", cors(corsOptions), express.raw({ type: 'application/json' }), (req, res) => res.status(200).send('ok'));

  return app;
}
