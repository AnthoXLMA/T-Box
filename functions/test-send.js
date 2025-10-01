import nodemailer from "nodemailer";
import "dotenv/config";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.sendinblue.com",
  port: 587,
  secure: false, // TLS false pour port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTest() {
  try {
    const info = await transporter.sendMail({
      from: `"Test TipBox" <${process.env.EMAIL_USER}>`,
      to: "anthonymania1982@gmail.com",
      subject: "Test SMTP Sendinblue",
      text: "Si tu reçois ça, ton SMTP fonctionne !",
    });
    console.log("Email envoyé :", info);
  } catch (err) {
    console.error("Erreur SMTP :", err);
  }
}

sendTest();
