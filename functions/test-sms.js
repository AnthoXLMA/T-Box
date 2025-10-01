import fetch from "node-fetch";
import "dotenv/config";

async function sendTestSms() {
  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: "TipBox",
        recipient: "+33624256710",
        content: "Test SMS TipBox"
      }),
    });

    const data = await response.json();
    console.log("Réponse Brevo :", data);

  } catch (err) {
    console.error("Erreur SMS :", err);
  }
}

sendTestSms();
