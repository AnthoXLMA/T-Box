import * as functions from "firebase-functions";
import { createApp } from "./server.js";

// Récupérer les configs Firebase Functions
const stripeKey = functions.config().stripe.key;
const emailUser = functions.config().email.user;
const emailPass = functions.config().email.pass;

// Créer l'app Express avec les clés
const app = createApp({ stripeKey, emailUser, emailPass });

// Déployer l’API
export const api = functions.https.onRequest(app);
