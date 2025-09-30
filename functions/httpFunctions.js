// httpFunctions.js
import { onRequest } from "firebase-functions/v2/https";
import { createApp } from "./server.js";
import * as functions from "firebase-functions/v2";

// Récupère les config prod
const stripeKey = process.env.STRIPE_KEY || functions.config().stripe?.key;
const emailUser = process.env.EMAIL_USER || functions.config().email?.user;
const emailPass = process.env.EMAIL_PASS || functions.config().email?.pass;


// Crée l'application Express
const app = createApp({ stripeKey, emailUser, emailPass });

// Export pour Firebase
export const apiV2 = onRequest(app);
