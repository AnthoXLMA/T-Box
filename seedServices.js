import fs from "fs";
import admin from "firebase-admin";

// Lis le fichier qui est dans tipbox-server
const serviceAccount = JSON.parse(
  fs.readFileSync("./tipbox-server/serviceAccountKey.json", "utf-8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const services = [
  { id: "restaurant", name: "Restaurant" },
  { id: "bar", name: "Bar" },
  { id: "spa", name: "Spa" },
  { id: "staff", name: "Staff" },
  { id: "concierge", name: "Conciergerie" },
  { id: "réception", name: "Réception" },
  { id: "housekeeping", name: "Housekeeping" },
  { id: "gym", name: "Coach" },
  { id: "commercial", name: "Commercial" },
];

async function seedServices() {
  for (const s of services) {
    try {
      await db.collection("services").doc(s.id).set(s, { merge: true });
      console.log(`✅ Service ajouté : ${s.name}`);
    } catch (err) {
      console.error("Erreur création service:", err);
    }
  }
  process.exit();
}

seedServices();
