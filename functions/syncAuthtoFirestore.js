// syncAuthToFirestore.js
import admin from "./firebaseAdmin.js";

async function sync() {
  try {
    let nextPageToken = undefined;
    do {
      const list = await admin.auth().listUsers(1000, nextPageToken);
      for (const u of list.users) {
        const claims = u.customClaims || {};
        const hotelUid = claims.hotelUid || null;
        // skip users that don't belong to any hotel (optionnel)
        if (!hotelUid) continue;
        const doc = {
          email: u.email || "",
          displayName: u.displayName || "",
          firstName: "",
          lastName: "",
          role: claims.role || null,
          hotelUid,
          services: (claims.services || []).map(String),
          lockedServices: (claims.lockedServices || []).map(String),
          createdAt: new Date()
        };
        await admin.firestore().collection("users").doc(u.uid).set(doc, { merge: true });
        console.log("Synced user", u.uid);
      }
      nextPageToken = list.pageToken;
    } while (nextPageToken);
    console.log("Sync terminé");
    process.exit(0);
  } catch (err) {
    console.error("Erreur sync:", err);
    process.exit(1);
  }
}

sync();
