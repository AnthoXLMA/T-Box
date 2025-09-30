// triggers.js
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const newUserCreated = onDocumentCreated("users/{uid}", (event) => {
  const newUser = event.data;
  console.log("Nouvel utilisateur créé :", newUser);
});
