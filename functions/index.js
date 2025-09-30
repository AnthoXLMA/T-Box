// functions/index.js
import { createApp } from "./server.js";
import admin from "firebase-admin";
import * as functions from "firebase-functions/v2";

export { apiV2 } from "./httpFunctions.js";
export { newUserCreated } from "./triggers.js";
