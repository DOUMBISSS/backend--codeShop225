import nodemailer from 'nodemailer';
import fs from 'fs-extra';

export const sendInvoiceByEmail = async (commande, filePath) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'TONEMAIL@gmail.com',
      pass: 'TON_MDP_APPLI' // Utiliser un mot de passe application Gmail
    }
  });

  const mailOptions = {
    from: 'TONEMAIL@gmail.com',
    to: 'CLIENT_EMAIL@exemple.com', // <-- tu peux utiliser commande.email ici
    subject: `Votre facture ${commande.numeroCommande}`,
    text: `Bonjour ${commande.name},\n\nVeuillez trouver ci-joint votre facture.`,
    attachments: [
      { filename: `facture-${commande.numeroCommande}.pdf`, path: filePath }
    ]
  };

  await transporter.sendMail(mailOptions);
}