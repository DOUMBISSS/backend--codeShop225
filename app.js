import express from 'express';
import Database from './db/database.js';
import bodyParser from 'body-parser';
// import {routes} from "./routes/routes.js";
import Product from './db/models/Product.js';
// import Cart from './db/models/cart.js';
import cors from "cors";
// import dotenv from 'dotenv'
import 'dotenv/config';
import Commandes from './db/models/Commandes.js';
import Client from './db/models/Client.js';
// import Category from './db/models/category.js';
import moment from 'moment'; 
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
// import { generatePDFInvoice } from './services/pdfServices.js';
// import PDFDocument from 'pdfkit';
// import qr from 'qr-image';
import fs from 'fs';
import path from 'path';
// import QRCode from 'qrcode';
import { fileURLToPath } from 'url';
import multer from 'multer';
import Admin from './db/models/Admin.js';
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
// import { faker } from "@faker-js/faker";
import User from './db/models/users.js';
// import upload from './upload.js';
import  { uploadAdminImage } from './upload.js';
import  { uploadUserPhoto } from './upload.js';
import  { uploadProduct } from './upload.js';
import server from './server.js'
// import FormData from 'form-data';
// import axios from "axios";
import Comment from './db/models/comment.js';
import { uploadFields } from './upload.js';
import News from './db/models/Newsletter.js';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
// import multer from 'multer';
import PromoCode from './db/models/PromoCode.js';
import cron from 'node-cron';
import ArchiveArticle from './db/models/ArchiveArticle.js';
import Message from './db/models/Message.js';
import crypto from 'crypto';






/* =========================
   🔥 CORS — AVANT TOUT
========================= */
app.use(cors({
  origin: [
    "https://codeshop225.ci",
    "https://www.codeshop225.ci",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
}));

// 🔥 GESTION DU PREFLIGHT
app.options("*", cors());

/* =========================
   🔥 BODY PARSERS
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   🔥 FICHIERS STATIQUES
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Configuration Multer pour enregistrer les fichiers dans /uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');  // dossier de destination (doit exister)
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     const ext = path.extname(file.originalname);
//     cb(null, uniqueSuffix + ext);
//   }
// });

// const upload = multer({ storage });
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'codeshop_upload', // Dossier dans Cloudinary
      resource_type: 'image',
      format: ['jpg', 'png', 'jpeg', 'webp'], // ou 'png'
      public_id: `${Date.now()}-${file.originalname}`
    };
  },
});

const upload = multer({ storage });

export async function deleteImageFromCloudinary(url) {
  try {
    // Ex: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folder/nom_image.jpg
    const urlObj = new URL(url);
    const pathname = urlObj.pathname; // ex: /ds3eogn8u/image/upload/v1234567890/folder/nom_image.jpg

    // Extraire la partie après "/upload/"
    const parts = pathname.split('/upload/');
    if (parts.length < 2) {
      console.error('URL Cloudinary invalide :', url);
      return;
    }

    // Supprimer la version "v1234567890/"
    let publicIdWithExt = parts[1];
    publicIdWithExt = publicIdWithExt.replace(/^v\d+\//, '');

    // Enlever l'extension
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    await cloudinary.v2.uploader.destroy(publicId);
  } catch (err) {
    console.error('Erreur suppression Cloudinary:', err);
  }
}

const database = new Database();

Database.connect();

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur depuis la DB
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Utilisateur introuvable" });

    req.user = user; // ✅ on ajoute user à la requête
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Token invalide" });
  }
};


const transporter = nodemailer.createTransport({
  host: "mac42.winihost.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.SMTP_USER, // infos@codeshop225.ci
    pass: process.env.SMTP_PASS, // 🔴 vrai mot de passe email
  },
  tls: {
    rejectUnauthorized: false,
  },
});
export default transporter;

app.post("/user/register", uploadUserPhoto.single("photo"), async (req, res) => {
  try {
    console.log("Body reçu :", req.body);
    console.log("Fichier reçu :", req.file);

    const { name, surname, address, ville, number, email, password, password2 } = req.body;

    if (!name || !surname || !address || !ville || !number || !email || !password || !password2) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }

    if (password !== password2) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Cet email est déjà utilisé." });

    const newUser = new User({
      name,
      surname,
      address,
      ville,
      number,
      email,
      password,
      photo: req.file ? req.file.filename : "",
    });

    await newUser.save();

    // 🔹 Préparer le mail de bienvenue
    const mailOptions = {
  from: `"CodeShop225" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "Bienvenue sur CodeShop225 ! 🎉",
  html: `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 2rem; background: #f9fafb; color: #111827; border-radius: 1rem; box-shadow: 0 20px 50px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; padding-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb;">
      <h1 style="margin: 0; font-size: 2.5rem; color: #667eea;">Bienvenue sur CodeShop225 ! 🎉</h1>
      <p style="margin: 0.5rem 0 0; font-size: 1.1rem; color: #6b7280;">Votre aventure digitale commence ici</p>
    </div>

    <!-- Body -->
    <div style="padding: 2rem 0; line-height: 1.6;">
      <h2 style="margin: 0 0 1rem; font-size: 1.8rem; color: #111827;">Bonjour ${name} ${surname},</h2>
      <p>Merci pour votre inscription sur <strong>CodeShop225</strong> ! Nous sommes ravis de vous compter parmi nos clients.</p>
      <p>Vous pouvez dès à présent vous connecter et découvrir nos <strong>produits digitaux</strong> et nos <strong>promotions exclusives</strong>.</p>

      <div style="text-align: center; margin: 2rem 0;">
        <a href="https://codeshop225.com/login" style="background: linear-gradient(90deg, #667eea, #764ba2); color: #fff; text-decoration: none; padding: 1rem 2rem; border-radius: 1rem; font-weight: 700; font-size: 1.1rem; display: inline-block; box-shadow: 0 10px 20px rgba(102,126,234,0.3); transition: all 0.3s ease;">
          Se connecter maintenant
        </a>
      </div>

      <p style="margin: 2rem 0 0; font-size: 0.95rem; color: #6b7280;">
        Si vous avez des questions ou besoin d'aide, notre équipe est là pour vous aider 24/7.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; font-size: 0.9rem; color: #9ca3af;">
      <p>— L'équipe CodeShop225</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} CodeShop225. Tous droits réservés.</p>
    </div>
  </div>
  `
};

    // 🔹 Envoyer le mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erreur envoi email :", error);
      } else {
        console.log("Email envoyé :", info.response);
      }
    });

    res.status(201).json({ message: "Inscription réussie", user: newUser });

  } catch (err) {
    console.error("Erreur côté serveur :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// ➤ Connexion client
app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email ou mot de passe invalide" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Email ou mot de passe invalide" });

    const token = jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET, // ✅ OBLIGATOIRE
  { expiresIn: "24h" }
);

    const { _id, name, surname, address, ville, number, commandes } = user;

    res.json({
      token,
      user: {
        _id,
        name,
        surname,
        address,
        ville,
        number,
        email,
        commandes,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// 🔹 Route POST pour demander la réinitialisation
app.post('/user/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Veuillez fournir votre email.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    // 🔹 Générer un token temporaire
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpire = Date.now() + 3600 * 1000; // 1h

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetTokenExpire;
    await user.save();

    // 🔹 Envoyer le mail avec le lien
    const resetUrl = `https://codeshop225.ci/reset-password/${resetToken}`;

  const mailOptions = {
  from: `"CodeShop225" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "🔐 Réinitialisation de votre mot de passe – CodeShop225",
  html: `
  <div style="background:#f4f6fb; padding:40px 0; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08);">
      
      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#667eea,#764ba2); padding:30px; text-align:center;">
          <h1 style="margin:0; font-size:26px; color:#ffffff; font-weight:700;">
            CodeShop225
          </h1>
          <p style="margin:8px 0 0; color:#e0e4ff; font-size:14px;">
            Plateforme de vente digitale sécurisée
          </p>
        </td>
      </tr>

      <!-- CONTENT -->
      <tr>
        <td style="padding:40px 35px;">
          <h2 style="margin:0 0 15px; font-size:22px; color:#1f2937;">
            Bonjour ${user.name},
          </h2>

          <p style="margin:0 0 18px; font-size:15px; color:#4b5563; line-height:1.7;">
            Vous avez récemment demandé la <strong>réinitialisation de votre mot de passe</strong> pour votre compte CodeShop225.
          </p>

          <p style="margin:0 0 25px; font-size:15px; color:#4b5563; line-height:1.7;">
            Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe sécurisé :
          </p>

          <!-- CTA BUTTON -->
          <div style="text-align:center; margin:35px 0;">
            <a href="${resetUrl}"
               style="
                 display:inline-block;
                 padding:14px 34px;
                 background:#667eea;
                 color:#ffffff;
                 font-size:15px;
                 font-weight:600;
                 text-decoration:none;
                 border-radius:10px;
               ">
              🔐 Réinitialiser mon mot de passe
            </a>
          </div>

          <p style="margin:0 0 20px; font-size:14px; color:#6b7280; line-height:1.6;">
            ⏱️ Ce lien est valable pendant <strong>1 heure</strong> pour des raisons de sécurité.
          </p>

          <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.6;">
            Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email en toute sécurité.
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#f9fafb; padding:25px; text-align:center;">
          <p style="margin:0 0 8px; font-size:13px; color:#9ca3af;">
            Besoin d’aide ? Contactez-nous à tout moment.
          </p>
          <p style="margin:0; font-size:13px; color:#9ca3af;">
            © ${new Date().getFullYear()} CodeShop225 — Tous droits réservés
          </p>
        </td>
      </tr>

    </table>

    <!-- FOOT NOTE -->
    <p style="text-align:center; margin-top:25px; font-size:12px; color:#9ca3af;">
      Cet email vous a été envoyé automatiquement, merci de ne pas y répondre.
    </p>

  </div>
  `,
};

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Lien de réinitialisation envoyé à votre email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
app.post("/user/reset-password/:token", async (req, res) => {
  try {
    const { password, password2 } = req.body;

    if (!password || !password2) {
      return res.status(400).json({ message: "Champs requis manquants" });
    }

    if (password !== password2) {
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
    }

    // 🔹 récupérer le token depuis l'URL
    const { token } = req.params;

    // 🔹 chercher l'utilisateur avec token valide
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou expiré" });
    }

    // ✅ ICI EXACTEMENT ⬇️⬇️⬇️
    user.password = password;           // ⬅️ le pre('save') va hasher
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    // ✅ FIN

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true });

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.get('/commandes/user/:userId', async (req, res) => {
  try {
    const commandes = await Commandes.find({ clientId: req.params.userId })
      .populate('cart.product') // si les produits sont référencés
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('commandes');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
app.get('/:adminId/users', async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: "adminId invalide." });
    }

   const users = await User.find({ adminId })  // ✅ On filtre bien les utilisateurs de l’admin connecté
  .sort({ DateProfilCreated: -1 })
  .populate('commandes'); // optionnel : pour avoir les détails de commandes

    res.json({ users });
  } catch (err) {
    console.error("Erreur récupération des utilisateurs :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});
// Annuler une commande par son ID
app.put('/commandes/:id/annuler', async (req, res) => {
  try {
    const commande = await Commandes.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: "Commande non trouvée" });

    if (commande.statut !== "En attente") {
      return res.status(400).json({ message: "Impossible d'annuler cette commande" });
    }

    commande.statut = "Annulée";
    await commande.save();
    res.json({ message: "Commande annulée avec succès", commande });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur", error: err.message });
  }
});

app.get('/commandes/client/:clientId', async (req, res) => {
  try {
    const commandes = await Commandes.find({ number: req.params.clientId });
    res.json({ commandes });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
// ➤ Connexion admin
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Email ou mot de passe invalide" });

    const isValid = await admin.comparePassword(password);
    if (!isValid) return res.status(400).json({ message: "Email ou mot de passe invalide" });

    const token = jwt.sign({ id: admin._id }, "secret_key", { expiresIn: "2h" });

    const { _id, nom, prenom, surnom, numero, adresse, photo } = admin;

    res.json({
      token,
      admin: {
        _id, // <-- CORRECT
        nom,
        prenom,
        surnom,
        email,
        numero,
        adresse,
        photo,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PUT /admin/:id — Modifier profil admin
app.put("/admin/:id", uploadAdminImage.single("photo"), async (req, res) => {
  const { id } = req.params;

  // Vérifier validité ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID invalide" });
  }

  try {
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin non trouvé" });
    }

    const { nom, prenom, surnom, numero, adresse, password, confirmPassword } = req.body;

    // Ne pas autoriser modification email
    if (req.body.email && req.body.email !== admin.email) {
      return res.status(400).json({ message: "Modification de l'email non autorisée" });
    }

    // Préparer données à mettre à jour (conserver anciennes si pas fournies)
    const updateData = {
      nom: nom || admin.nom,
      prenom: prenom || admin.prenom,
      surnom: surnom || admin.surnom,
      numero: numero || admin.numero,
      adresse: adresse || admin.adresse,
    };

    // Mise à jour mot de passe si fourni
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Gestion photo
    if (req.file) {
      // Nouvelle photo uploadée → supprimer ancienne photo physique si existante
      if (admin.photo) {
        const oldPhotoPath = path.resolve(__dirname, admin.photo.replace(/^\/+/g, "")); // retirer slash initial
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      // Enregistrer nouvelle photo (chemin relatif)
      updateData.photo = `/uploads/admins/${req.file.filename}`;
    } else if (req.body.photo === "") {
      // Suppression volontaire de la photo
      if (admin.photo) {
        const oldPhotoPath = path.resolve(__dirname, admin.photo.replace(/^\/+/g, ""));
        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }
      }
      updateData.photo = "";
    }
    // Sinon : ne pas modifier la photo → conserver l’ancienne

    // Sauvegarder mise à jour
    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, { new: true });

    res.json(updatedAdmin);
  } catch (error) {
    console.error("Erreur modification profil :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// ➤ Création d’un nouvel admin
app.post("/admin/register", uploadAdminImage.single("photo"), async (req, res) => {
  try {
    const { nom, prenom, surnom, email, password, numero, adresse } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email déjà utilisé" });

    const photoPath = req.file ? `/uploads/admins/${req.file.filename}` : null;

    // ❌ PAS de hachage ici — le .pre('save') s'en charge
    const newAdmin = new Admin({
      nom,
      prenom,
      surnom,
      email,
      password, // brut
      numero,
      adresse,
      photo: photoPath,
    });

    await newAdmin.save();
    res.status(201).json({ message: "Inscription réussie", admin: newAdmin });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});


app.get('/admin/:adminId', async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ message: 'adminId invalide.' });
    }

   const admin = await Admin.findById(adminId)
  .populate('products')
  .populate({
    path: 'commandes',
    populate: {
      path: 'client',
      model: 'User'
    }
  })
  .populate('clients');

    if (!admin) {
      return res.status(404).json({ message: 'Admin non trouvé.' });
    }

    res.json({ admin });
  } catch (err) {
    console.error('Erreur récupération admin :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

/* ========== LISTE COMPLETE ========== */
app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('Erreur liste produits :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID produit invalide" });
  }

  try {
    // On récupère le produit + on remplit le fournisseur (populate)
    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    res.json(product);

  } catch (error) {
    console.error("Erreur récupération produit :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.post('/Newproducts', async (req, res) => {
  try {
    const {
      title,
      reference,
      label,
      categorie,
      prixAchat,
      prixVente,
      promotion = 0,
      description,
      groupe,
      specifications,
      adminId,
      stock = 0,
      disponible = true,
      poids = '',
      videoUrl = '',
      nouveaute = true,
      img,          // URL Cloudinary principale (string)
      images = [],  // URLs Cloudinary secondaires
    } = req.body;

    // Validation des champs obligatoires
    if (!adminId) return res.status(400).json({ message: 'adminId requis' });
    if (!img) return res.status(400).json({ message: 'Image principale (URL) requise' });
    if (!title) return res.status(400).json({ message: 'Titre du produit requis' });
    if (!categorie) return res.status(400).json({ message: 'Catégorie requise' });
    if (!label) return res.status(400).json({ message: 'Marque requise' });

    // Calcul du prix final avec promotion
    let finalPrice = parseFloat(prixVente) || parseFloat(req.body.price) || 0;
    const promoValue = parseFloat(promotion) || 0;
    if (promoValue > 0) {
      finalPrice = finalPrice - (finalPrice * promoValue / 100);
    }

    // Construction de l'objet produit
    const productData = {
      title,
      reference,
      label,
      categorie,
      prixAchat: parseFloat(prixAchat) || 0,
      prixVente: parseFloat(prixVente) || 0,
      price: finalPrice,    // prix final après promotion
      promotion: promoValue,
      description,
      groupe,
      specifications,
      img,
      images,
      adminId,
      stock: parseInt(stock, 10) || 0,
      disponible: (disponible === 'false' || disponible === false) ? false : true,
      poids,
      videoUrl,
      nouveaute: (nouveaute === 'false' || nouveaute === false) ? false : true,
    };

    const savedProduct = await Product.create(productData);

    // Ajouter le produit à l'admin
    await Admin.findByIdAndUpdate(adminId, { $push: { products: savedProduct._id } });

    res.status(201).json({
      message: "Produit créé et lié à l'admin",
      product: savedProduct,
    });

  } catch (err) {
    console.error('Erreur lors de la création du produit :', err);
    res.status(500).json({ message: "Erreur serveur lors de l'ajout du produit" });
  }
});
/* ========== DETAIL PRODUIT ========== */
app.get('/detailProduct/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product)
      return res.status(404).json({ message: 'Produit non trouvé' });
    res.json(product);
  } catch (err) {
    console.error('Erreur récupération produit :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const produit = await Product.findById(req.params.id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    const prixVente = Number(req.body.prixVente) ?? produit.prixVente ?? 0;
    const promotion = Number(req.body.promotion) ?? 0;
    const prixAchat = Number(req.body.prixAchat) ?? produit.prixAchat ?? 0;
    const prixFinalManuel = Number(req.body.price); // optionnel pour forcer le prix final

    // Mettre à jour les champs généraux
    Object.assign(produit, {
      reference: req.body.reference ?? produit.reference,
      title: req.body.title ?? produit.title,
      description: req.body.description ?? produit.description,
      label: req.body.label ?? produit.label,
      categorie: req.body.categorie ?? produit.categorie,
      groupe: req.body.groupe ?? produit.groupe,
      videoUrl: req.body.videoUrl ?? produit.videoUrl,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : produit.stock,
      disponible: req.body.disponible !== undefined ? req.body.disponible : produit.disponible,
      nouveaute: req.body.nouveaute !== undefined ? req.body.nouveaute : produit.nouveaute,
      prixVente,
      prixAchat,
      promotion
    });

    // ⚡ Gestion prix original et prix final
    // Si prixOriginal n'existe pas, on le définit une seule fois comme prix réel de base
    if (!produit.prixOriginal) {
      produit.prixOriginal = prixVente;
    }

    if (promotion > 0) {
      // Appliquer promo sur le prix original
      produit.price = Math.round(produit.prixOriginal - (produit.prixOriginal * promotion / 100));
    } else {
      // Promo = 0 → prixFinal = prixVente ou prixFinalManuel
      produit.price = prixFinalManuel ?? prixVente;
      // Ne jamais écraser prixOriginal, on garde toujours le prix réel de base
    }

    await produit.save();
    res.json({ message: 'Produit mis à jour', produit });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


app.delete('/products/:id', async (req, res) => {
  const { id } = req.params;

  // ► valide l’ID Mongo
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID produit invalide.' });
  }

  try {
    // ► supprime le produit
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Produit non trouvé.' });
    }

    // ► si tes admins stockent un tableau products, on le nettoie
    await Admin.updateMany(
      { products: id },
      { $pull: { products: id } }
    );

    // ► répond OK
    res.json({ message: 'Produit supprimé avec succès.', product: deletedProduct });
  } catch (err) {
    console.error('Erreur suppression produit :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
/* ========== COMMENTAIRES ========== */
app.get('/products/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(comments);
  } catch (err) {
    console.error('Erreur chargement commentaires :', err);
    res.status(500).json({ message: 'Erreur serveur commentaires' });
  }
});

app.get('/products/promos', async (req, res) => {
  try {
    /* ---------- 1.  Lecture éventuelle des query-params ---------- */
    const {
      min       = 1,            // % mini (par défaut : toute promo > 0)
      categorie = '',           // ex. “Informatique”
      groupe    = '',           // ex. “Téléphonie”
      limit     = 20            // nombre max de produits renvoyés
    } = req.query;

    /* ---------- 2.  Construction dynamique du filtre ------------- */
    const filter = {
      disponible: true,
      promotion : { $gte: Number(min) }
    };

    if (categorie)
      filter.categorie = { $regex: new RegExp(categorie, 'i') };

    if (groupe)
      filter.groupe    = { $regex: new RegExp(groupe, 'i') };

    /* ---------- 3.  Requête : promo la plus forte puis récence ---- */
    const produits = await Product.find(filter)
      .sort({ promotion: -1, createdAt: -1 })
      .limit(Number(limit))
      .select('title img price promotion label categorie description')  // champs utiles
      .lean();

    res.json(produits);
  } catch (err) {
    console.error('Erreur récupération promos :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


/* ------------------------------------------------------------------ */
/*  MIDDLEWARE verifyJWT                                              */
/* ------------------------------------------------------------------ */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization || ''; // "Bearer <token>"
  const token      = authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded     = jwt.verify(token, 'user_secret_key'); // même clé que pour le login
    req.userId        = decoded.id;   // on stocke l’ID
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide' });
  }
}

/* ------------------------------------------------------------------ */
/*  ROUTE  POST  /products/:id/comments                               */
/* ------------------------------------------------------------------ */

app.get("products/:id/comments", async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.id })
      .populate("clients", "username"); // 🔹 ça va inclure username automatiquement

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// POST /products/:id/comments
app.post('/products/:id/comments', async (req, res) => {
  try {
    const { text, rating, userId } = req.body;
    const productId = req.params.id;

    if (!text || !userId) {
      return res.status(400).json({ message: "Données manquantes." });
    }

    // Création du commentaire
    const comment = new Comment({
      product: productId,
      clients: userId,
      text,
      rating: rating || 5,
    });

    await comment.save();

    // Attacher le commentaire au produit (optionnel)
    await Product.findByIdAndUpdate(productId, {
      $push: { comments: comment._id },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

app.get('/produits/statistiques', async (req, res) => {
  try {
    const { adminId } = req.query;

    const productFilter = {};
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      productFilter.adminId = adminId;
    }

    const produits = await Product.find(productFilter);

    const produitsDetails = produits.map(p => ({
      nom: p.title,
      quantiteVendue: p.vendu || 0,
      prixUnitaire: p.price || 0
    }));

    const totalProduits = produits.length;
    const totalProduitsVendus = produitsDetails.reduce((acc, p) => acc + p.quantiteVendue, 0);

    res.json({
      totalProduits,
      totalProduitsVendus,
      produitsDetails
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/products/:id/images/:filename', async (req, res) => {
  const { id, filename } = req.params;

  try {
    // Trouver le produit
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' });

    // Vérifier si l'image est bien dans les images secondaires
    if (!product.images.includes(filename)) {
      return res.status(400).json({ message: "Image secondaire non trouvée dans ce produit" });
    }

    // Retirer l'image du tableau images
    product.images = product.images.filter(img => img !== filename);

    // Sauvegarder le produit mis à jour
    await product.save();

    // Supprimer le fichier du disque
    const filePath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: "Image secondaire supprimée avec succès", images: product.images });

  } catch (error) {
    console.error("Erreur suppression image secondaire :", error);
    res.status(500).json({ message: "Erreur serveur lors de la suppression de l'image" });
  }
});

/* ------------------------------------------------------------------ */
/*  commandes                              */
/* ------------------------------------------------------------------ */

// Toutes les 12h
// ⏰ Toutes les 12 heures
cron.schedule("0 */12 * * *", async () => {
  try {
    const now = new Date();

    const result = await Commandes.deleteMany({
      paymentStatus: "non payé",
      status: { $in: ["en attente", "à livrer"] },
      deadline: { $lt: now }
    });

    console.log(`🗑️ Commandes non payées supprimées : ${result.deletedCount}`);
  } catch (err) {
    console.error("❌ Erreur suppression commandes expirées :", err);
  }
});

app.get('/commandes', async (req, res) => {
  try {
    const { adminId } = req.query;

    // Filtre facultatif sur l’admin
    const filter = {};
    if (adminId) {
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ message: 'adminId invalide.' });
      }
      filter.adminId = adminId;
    }

    // Récupération des commandes avec prixAchat des produits
    const commandes = await Commandes.find(filter)
      .sort({ createdAt: -1 })
      .populate('client', 'name surname email number address ville')
      .populate({
        path: 'cart.productId',
        select: 'title prixAchat price'  // récupère uniquement le titre, prix d'achat et prix de vente
      })
      .lean();

    // Ajouter le prixAchat dans chaque item du panier pour la réponse
    const commandesAvecPrixAchat = commandes.map(commande => {
      const cart = commande.cart.map(item => ({
        ...item,
        prixAchat: item.productId?.prixAchat || 0, // si produit supprimé, 0 par défaut
        productTitle: item.productId?.title || item.title,
        productPrice: item.productId?.price || item.price
      }));
      return { ...commande, cart };
    });

    res.json(commandesAvecPrixAchat);
  } catch (err) {
    console.error('Erreur récupération commandes :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
                      
app.get('/commandes/statistiques', async (req, res) => {
  try {
    const { periode, mois, annee, startDate, endDate, adminId } = req.query;

    let filter = {};

    if (periode === 'mois' && mois && annee) {
      const start = new Date(`${annee}-${mois}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (periode === 'annee' && annee) {
      const start = new Date(`${annee}-01-01`);
      const end = new Date(`${parseInt(annee) + 1}-01-01`);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (periode === 'personnalise' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.adminId = adminId;
      filter['cart.0'] = { $exists: true }; // 🧠 Commandes avec au moins un produit
    }

    const commandes = await Commandes.find(filter);
    const totalCommandes = commandes.length;
    const totalVentes = commandes.reduce((acc, c) => acc + parseFloat(c.totalAmount), 0);
    const totalClients = new Set(commandes.map(c => c.number)).size; // 🔐 clients uniques par téléphone

    res.json({ totalCommandes, totalVentes, totalClients, commandes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// routes ou app.js
app.get('/commandes/:id', async (req, res) => {
  const { id } = req.params;

  /* ► Vérifier la validité de l’ID Mongo ---------------------------- */
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID invalide' });
  }

  try {
    /* ► Récupération + population sélective ------------------------- */
    const commande = await Commandes.findById(id)
      // Produits du panier
      .populate('cart.productId', 'title img price stock reference')
      // Profil client – on expose seulement les champs utiles
      .populate('client', 'name surname email number address ville photo')
      .lean();     // renvoie un objet “pur” (pas un document Mongoose)

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(commande);
  } catch (err) {
    console.error('Erreur récupération commande :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// export async function updateCommandes() {
//   try {

//     // Récupérer toutes les commandes
//     const commandes = await Commandes.find({});
//     console.log(`Nombre de commandes à traiter : ${commandes.length}`);

//     for (const commande of commandes) {
//       let updated = false;
//       let totalMarge = 0;

//       // Mettre à jour chaque produit dans le panier
//       for (const item of commande.cart) {
//         // Si prixAchat déjà présent, on ne touche pas
//         if (item.prixAchat === undefined || item.prixAchat === null) {
//           const produit = await Product.findById(item.productId);
//           if (!produit) {
//             console.warn(`Produit introuvable pour item ${item.title} (${item.productId})`);
//             continue;
//           }

//           // Ajouter prixAchat et calculer marge
//           item.prixAchat = produit.prixAchat || 0;
//           item.marge = (item.price - item.prixAchat) * item.quantity;

//           updated = true;
//         }

//         // Ajouter à totalMarge
//         totalMarge += item.marge || 0;
//       }

//       // Mettre à jour la marge globale si modification
//       if (updated) {
//         commande.totalMarge = totalMarge;
//         await commande.save();
//         console.log(`Commande ${commande.numeroCommande} mise à jour.`);
//       }
//     }

//     console.log("✅ Mise à jour terminée pour toutes les commandes existantes.");
//     process.exit(0);
//   } catch (err) {
//     console.error("Erreur lors de la mise à jour des commandes :", err);
//     process.exit(1);
//   }
// }

// updateCommandes();


/* ==============================
   📦 CRÉATION COMMANDE
================================ */
app.post("/commandes", authMiddleware, async (req, res) => {
  try {
    const { cart, address, ville, livraisonAlt, promoCode } = req.body;
    const client = req.user._id;

    if (!Array.isArray(cart) || cart.length === 0)
      return res.status(400).json({ message: "Le panier ne peut pas être vide." });

    let totalAmount = 0;
    let totalCost = 0;
    const preparedCart = [];

    for (const item of cart) {
     const produit = await Product.findById(item.productId);
if (!produit) {
  console.error("Produit introuvable, ID:", item.productId);
  return res.status(404).json({ message: `Produit introuvable (ID: ${item.productId})` });
}
      if (produit.stock < item.quantity)
        return res.status(400).json({ message: `Stock insuffisant pour ${produit.title}` });

      totalAmount += produit.price * item.quantity;
      totalCost += (produit.prixAchat || 0) * item.quantity;

      preparedCart.push({
        productId: produit._id,
        title: produit.title,
        reference: produit.reference || "",
        quantity: item.quantity,
        price: produit.price,
        img: produit.img,
        prixAchat: produit.prixAchat || 0,
        marge: (produit.price - (produit.prixAchat || 0)) * item.quantity
      });
    }

    // 🎁 Gestion code promo
    let discountAmount = 0;
    let appliedPromo = null;

    if (promoCode) {
      const promo = await PromoCode.findOne({ code: promoCode.toUpperCase() });
      if (!promo) return res.status(400).json({ message: "Code promo invalide" });
      if (new Date(promo.expiresAt) < new Date())
        return res.status(400).json({ message: "Ce code promo est expiré" });
      if (promo.usedBy.includes(client))
        return res.status(400).json({ message: "Vous avez déjà utilisé ce code promo" });
      if (promo.minAmount && totalAmount < promo.minAmount)
        return res.status(400).json({ message: `Montant minimum requis : ${promo.minAmount}` });

      discountAmount =
        promo.type === "percentage"
          ? Math.floor((promo.value / 100) * totalAmount)
          : promo.value;

      appliedPromo = promo;
      promo.usedBy.push(client);
      await promo.save();
    }

    const finalTotal = Math.max(totalAmount - discountAmount, 0);
    const totalMarge = totalAmount - totalCost - discountAmount;

    const firstProduct = await Product.findById(cart[0].productId);
    const adminId = firstProduct.adminId;

    const newCommande = await Commandes.create({
      client,
      adminId,
      cart: preparedCart,
      address,
      ville,
      livraisonAlt,
      totalAmount: finalTotal,
      discountAmount,
      promoCode: appliedPromo?.code || null,
      totalMarge,
    });

    // 📉 Décrément stock
    await Promise.all(
      preparedCart.map(p =>
        Product.findByIdAndUpdate(p.productId, { $inc: { stock: -p.quantity } })
      )
    );

    // ============================
    // 📧 EMAIL CLIENT
    // ============================
    const user = await User.findById(client);

    const cartRows = preparedCart.map(item => `
      <tr>
        <td style="padding:10px 0;">${item.title} - ${item.reference}</td>
        <td align="center">${item.quantity}</td>
        <td align="right">${item.price.toLocaleString()} FCFA</td>
        <td align="right">${(item.price * item.quantity).toLocaleString()} FCFA</td>
      </tr>
    `).join("");

    const mailOptions = {
      from: `"CodeShop225" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "🛒 Confirmation de votre commande – CodeShop225",
      html: `
      <div style="background:#f4f6fb;padding:40px 0;font-family:Segoe UI,Arial">
        <table width="100%" style="max-width:650px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.08)">
          
          <tr>
            <td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;color:#fff">
              <h1 style="margin:0">CodeShop225</h1>
              <p>Merci pour votre commande 🎉</p>
            </td>
          </tr>

          <tr>
            <td style="padding:35px">
              <h2>Bonjour ${user.name},</h2>
              <p>Votre commande a bien été enregistrée.</p>

              <table width="100%" style="margin-top:20px;border-collapse:collapse">
                <thead>
                  <tr style="border-bottom:2px solid #e5e7eb">
                    <th align="left">Produit</th>
                    <th align="center">Qté</th>
                    <th align="right">Prix</th>
                    <th align="right">Total</th>
                  </tr>
                </thead>
                <tbody>${cartRows}</tbody>
              </table>

              <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:15px">
                ${discountAmount > 0 ? `<p>Remise : -${discountAmount.toLocaleString()} FCFA</p>` : ""}
                <h3>Montant total : ${finalTotal.toLocaleString()} FCFA</h3>
              </div>

              <p style="margin-top:15px">📍 Livraison : ${address}, ${ville}</p>

              <p style="margin-top:25px;color:#6b7280">
                Merci pour votre confiance 🙏<br/>
                <strong>L’équipe CodeShop225</strong>
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af">
              © ${new Date().getFullYear()} CodeShop225
            </td>
          </tr>
        </table>
      </div>
      `
    };

    transporter.sendMail(mailOptions).catch(err =>
      console.error("Erreur email commande :", err)
    );

    // ============================
    res.status(201).json(newCommande);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
///tyui
// app.post('/commandes', async (req, res) => {
//   try {
//     /* ---------- 1. Données reçues ---------- */
//     const {
//       client,               
//       cart,                 // [{ productId, quantity, … }]
//       totalAmount,
//       paymentStatus,
//       status,
//       address,
//       ville,
//       livraisonAlt
//     } = req.body;

//     if (!Array.isArray(cart) || cart.length === 0) {
//       return res.status(400).json({ message: 'Le panier ne peut pas être vide.' });
//     }

//     /* ---------- 2. Vérification du stock et enrichissement ---------- */
//     const enrichedCart = [];
//     for (const item of cart) {
//       const produit = await Product.findById(item.productId);
//       if (!produit) {
//         return res.status(404).json({ message: `Produit introuvable : ${item.productId}` });
//       }

//       if (produit.stock < item.quantity) {
//         return res.status(400).json({
//           message: `Stock insuffisant pour "${produit.title}". Restant : ${produit.stock}, demandé : ${item.quantity}`
//         });
//       }

//       // Ajout du produit enrichi avec prix d’achat et infos utiles
//       enrichedCart.push({
//         productId: produit._id,
//         title: produit.title,
//         reference: produit.reference,
//         img: produit.img,
//         price: produit.price,          // prix de vente
//         prixAchat: produit.prixAchat,  // ✅ prix d’achat
//         quantity: item.quantity,
//       });
//     }

//     /* ---------- 3. Admin à partir du 1er produit ---------- */
//     const adminId = enrichedCart[0]?.productId
//       ? (await Product.findById(enrichedCart[0].productId)).adminId
//       : null;

//     if (!adminId) {
//       return res.status(400).json({ message: "Admin introuvable à partir du produit." });
//     }

//     /* ---------- 4. Création de la commande ---------- */
//     const newCommande = await Commandes.create({
//       client,
//       cart: enrichedCart, // ✅ cart enrichi avec prixAchat
//       totalAmount,
//       paymentStatus,
//       status,
//       adminId,
//       address,
//       ville,
//       livraisonAlt: livraisonAlt?.address
//         ? {
//             address: livraisonAlt.address.trim(),
//             ville: livraisonAlt.ville?.trim() || ''
//           }
//         : undefined
//     });

//     /* ---------- 5. Décrémentation du stock ---------- */
//     await Promise.all(
//       enrichedCart.map(it =>
//         Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } })
//       )
//     );

//     return res.status(201).json(newCommande);
//   } catch (error) {
//     console.error('Erreur lors de la commande :', error);
//     return res.status(500).json({ message: 'Erreur serveur' });
//   }
// });
                      // Mise à jour du statut d'une commande
// Mettre à jour le statut général de la commande (ex: en cours, livrée, annulée)
// Modifier le statut de livraison de la commande
app.put('/commandes/:id/status', async (req, res) => {
  const commandeId = req.params.id;
  const { status } = req.body;

  try {
    const updatedCommande = await Commandes.findByIdAndUpdate(
      commandeId,
      { status },
      { new: true }
    );

    if (!updatedCommande) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.json({ message: 'Statut mis à jour avec succès.', commande: updatedCommande });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du statut:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// Marquer la commande comme payée (seulement si livrée)
app.patch('/commandes/:id/payer', async (req, res) => {
  try {
    const commande = await Commandes.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    if (commande.status !== 'livrée') {
      return res.status(400).json({ message: "La commande doit être livrée avant d'être payée." });
    }

    commande.paymentStatus = 'payé'; // ← Corrigé ici aussi
    await commande.save();

    res.json({ message: 'Commande marquée comme payée.' });
  } catch (err) {
    console.error("Erreur lors du paiement de la commande:", err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
// Exemple dans ton fichier routes ou directement dans app.js

app.get('/mes-commandes/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Client ID invalide" });
    }

    const commandes = await Commandes.find({ client: clientId })
      .populate("cart.productId", "title price") // si tu veux les infos du produit
      .populate("adminId", "nom prenom email") // si tu veux voir l'admin lié
      .sort({ createdAt: -1 }); // plus récentes d’abord

    if (!commandes || commandes.length === 0) {
      return res.status(404).json({ message: "Aucune commande trouvée." });
    }

    res.status(200).json({ commandes });

  } catch (err) {
    console.error("Erreur récupération commandes client :", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /commandes/:id  – suppression définitive
app.delete('/commandes/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID invalide.' });
  }

  try {
    const deleted = await Commandes.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Commande introuvable.' });

    res.json({ message: 'Commande supprimée avec succès.' });
  } catch (err) {
    console.error('Erreur suppression commande :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ✅ Route PUT dédiée à l'annulation
app.put('/annuler-commande/:id', async (req, res) => {
  const commandeId = req.params.id;

  try {
    const updatedCommande = await Commandes.findByIdAndUpdate(
      commandeId,
      { status: 'annulé' },
      { new: true }
    );

    if (!updatedCommande) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.json({ message: 'Commande annulée avec succès.', commande: updatedCommande });
  } catch (err) {
    console.error('Erreur lors de l’annulation :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// POST /promo/apply
app.post("/apply", async (req, res) => {
  const { code, userId, total } = req.body;

  try {
    const promo = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promo) return res.status(404).json({ error: "Code promo invalide" });

    // Expiration
    if (promo.expiresAt < new Date()) {
      return res.status(400).json({ error: "Code expiré" });
    }

    // Déjà utilisé par cet utilisateur ?
    if (promo.usedBy.includes(userId)) {
      return res.status(400).json({ error: "Ce code a déjà été utilisé" });
    }

    // Utilisation maximale atteinte ?
    if (promo.usedCount >= promo.maxUsage) {
      return res.status(400).json({ error: "Ce code n'est plus disponible" });
    }

    // Condition de montant minimum
    if (total < promo.minAmount) {
      return res.status(400).json({ error: `Montant minimum ${promo.minAmount} FCFA` });
    }

    // Calcul réduction
    let discount = 0;
    if (promo.type === "percentage") {
      discount = (promo.value / 100) * total;
    } else {
      discount = promo.value;
    }

    return res.json({
      success: true,
      discount,
      newTotal: total - discount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});



/* ----------------------
   GET /promos
   Récupère tous les promos (optionnel: query ?status=active|expired)
   ---------------------- */
app.get('/promos', async (req, res) => {
  try {
    const { status } = req.query;
    const all = await PromoCode.find().sort({ createdAt: -1 });

    if (!status) return res.json(all);

    const now = new Date();
    if (status === 'active') {
      return res.json(all.filter(p => new Date(p.expiresAt) >= now && p.usedCount < p.maxUsage));
    }
    if (status === 'expired') {
      return res.json(all.filter(p => new Date(p.expiresAt) < now || p.usedCount >= p.maxUsage));
    }

    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/* ----------------------
   GET /promos/:id
   Détails d'un code promo
   ---------------------- */
// app.get('/:id', isAuth, async (req, res) => {
//   try {
//     const { id } = req.params;
//     if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Id invalide' });

//     const promo = await PromoCode.findById(id);
//     if (!promo) return res.status(404).json({ message: 'Code promo introuvable' });

//     res.json(promo);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Erreur serveur' });
//   }
// });

/* ----------------------
   POST /promos
   Créer un code promo (admin)
   Body: { code, type, value, minAmount, expiresAt, maxUsage }
   ---------------------- */
app.post('/code/promo', async (req, res) => {
  try {
    let { code, type, value, minAmount, expiresAt, description } = req.body;

    if (!code || !value || !expiresAt) {
      return res.status(400).json({ message: 'code, value et expiresAt obligatoires' });
    }

    code = String(code).trim().toUpperCase();
    type = type === 'fixed' ? 'fixed' : 'percentage';
    value = Number(value);
    minAmount = Number(minAmount) || 0;
    description = description ? String(description).trim() : "";
    expiresAt = new Date(expiresAt);

    if (isNaN(value) || value <= 0)
      return res.status(400).json({ message: 'Valeur invalide' });

    if (isNaN(expiresAt.getTime()))
      return res.status(400).json({ message: "Date d'expiration invalide" });

    // 🔍 Vérifier unicité
    const existing = await PromoCode.findOne({ code });
    if (existing)
      return res.status(409).json({ message: 'Code déjà existant' });

    // ✅ Création du code promo
    const promo = await PromoCode.create({
      code,
      type,
      value,
      minAmount,
      expiresAt,
      description,
      usedBy: []
    });

    // ============================
    // 📧 EMAIL À TOUS LES CLIENTS
    // ============================

    const users = await User.find({}, 'email'); // récupérer tous les emails
    if (users.length > 0) {
      const emails = users.map(u => u.email);

      const mailOptions = {
        from: `"CodeShop225" <infos@codeshop225.ci>`,
        to: "infos@codeshop225.ci", // safe
        bcc: emails,               // clients
        subject: "🎉 Nouveau code promo disponible sur CodeShop225 !",
        html: `
        <div style="background:#f4f6fb;padding:40px 0;font-family:Segoe UI,Arial">
          <table width="100%" style="max-width:650px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.08)">
            
            <!-- HEADER -->
            <tr>
              <td style="background:linear-gradient(135deg,#4b00cc,#6a00ff);padding:30px;text-align:center;color:#fff">
                <h1 style="margin:0">CodeShop225</h1>
                <p style="margin-top:10px;font-size:16px">
                  🎁 Nouveau code promo disponible !
                </p>
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="padding:35px">
                <h2 style="margin-top:0">Profitez dès maintenant 🔥</h2>

                <p>${description || "Nous avons le plaisir de vous offrir un nouveau code promo valable sur notre plateforme."}</p>

                <div style="margin:25px 0;padding:20px;border:2px dashed #4b00cc;border-radius:12px;text-align:center">
                  <p style="font-size:14px;color:#6b7280;margin-bottom:5px">CODE PROMO</p>
                  <h1 style="margin:0;color:#4b00cc">${code}</h1>
                </div>

                <ul style="padding-left:18px;color:#374151">
                  <li>Type : ${type === "percentage" ? `Réduction de ${value}%` : `Réduction de ${value.toLocaleString()} FCFA`}</li>
                  ${minAmount > 0 ? `<li>Montant minimum : ${minAmount.toLocaleString()} FCFA</li>` : ""}
                  <li>Valable jusqu’au : ${expiresAt.toLocaleDateString()}</li>
                </ul>

                <a href="https://codeshop225.ci"
                  style="display:inline-block;margin-top:20px;padding:14px 28px;background:#4b00cc;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
                  🛒 Utiliser le code
                </a>

                <p style="margin-top:25px;color:#6b7280">
                  Merci pour votre fidélité 🙏<br/>
                  <strong>L’équipe CodeShop225</strong>
                </p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af">
                © ${new Date().getFullYear()} CodeShop225 – Tous droits réservés
              </td>
            </tr>
          </table>
        </div>
        `
      };

      transporter.sendMail(mailOptions).catch(err =>
        console.error("Erreur email promo :", err)
      );
    }

    // ============================
    res.status(201).json(promo);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
// PUT /update/code/promo/:id
app.put("/update/code/promo/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 Validation ID Mongo
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    // 🔎 Récupérer l’ancien code promo
    const oldPromo = await PromoCode.findById(id);
    if (!oldPromo) {
      return res.status(404).json({ message: "Code promo introuvable" });
    }

    // 🔒 Champs autorisés
    const allowedFields = [
      "code",
      "type",
      "value",
      "minAmount",
      "expiresAt",
      "maxUsage",
      "description"
    ];

    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    // 🧼 Normalisation
    if (update.code) update.code = String(update.code).trim().toUpperCase();
    if (update.expiresAt) update.expiresAt = new Date(update.expiresAt);

    // 🔁 Mise à jour
    const promo = await PromoCode.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    // ============================
    // 📧 EMAIL SI PROLONGATION (tous utilisateurs)
    // ============================
    if (req.body.expiresAt) {
      const oldDate = new Date(oldPromo.expiresAt);
      const newDate = new Date(req.body.expiresAt);

      const isExtended = newDate.getTime() > oldDate.getTime();

      // console.log("🕒 Ancienne date :", oldDate);
      // console.log("🆕 Nouvelle date (requête) :", newDate);
      // console.log("📧 Prolongation détectée ?", isExtended);

      if (isExtended) {
        try {
          const users = await User.find({}, 'email');
          if (users.length > 0) {
            const emails = users.map(u => u.email);

            await transporter.sendMail({
              from: `"CodeShop225" <${process.env.SMTP_USER}>`,
              to: `"CodeShop225" <${process.env.SMTP_USER}>`, // Gmail safe
              bcc: emails,
              subject: "⏰ Code promo prolongé – Profitez-en maintenant !",
              html: `
              <div style="background:#f4f6fb;padding:40px 0;font-family:Segoe UI,Arial">
                <table width="100%" style="max-width:650px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.08)">
                  
                  <!-- HEADER -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#4b00cc,#6a00ff);padding:30px;text-align:center;color:#fff">
                      <h1 style="margin:0">CodeShop225</h1>
                      <p style="margin-top:10px;font-size:16px">
                        ⏰ Code promo prolongé !
                      </p>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:35px">
                      <h2 style="margin-top:0">Bonne nouvelle 🎉</h2>

                      <p>
                        Vous n’aviez pas encore profité de ce code promo ?
                        <br/>
                        Il a été <strong>prolongé</strong> pour vous laisser une nouvelle chance 🔥
                      </p>

                      <div style="margin:25px 0;padding:20px;border:2px dashed #4b00cc;border-radius:12px;text-align:center">
                        <p style="font-size:14px;color:#6b7280;margin-bottom:5px">CODE PROMO</p>
                        <h1 style="margin:0;color:#4b00cc">${promo.code}</h1>
                      </div>

                      <ul style="padding-left:18px;color:#374151">
                        <li>${promo.type === "percentage" ? `Réduction de ${promo.value}%` : `Réduction de ${promo.value.toLocaleString()} FCFA`}</li>
                        // ${promo.minAmount > 0 ? `<li>Montant minimum : ${promo.minAmount.toLocaleString()} FCFA</li>` : ""}
                        <li>Nouvelle date limite : <strong>${newDate.toLocaleDateString()}</strong></li>
                      </ul>

                      <a href="https://codeshop225.ci"
                        style="display:inline-block;margin-top:20px;padding:14px 28px;background:#4b00cc;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">
                        🛒 Utiliser le code
                      </a>

                      <p style="margin-top:25px;color:#6b7280">
                        Merci pour votre fidélité 🙏<br/>
                        <strong>L’équipe CodeShop225</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#9ca3af">
                      © ${new Date().getFullYear()} CodeShop225 – Tous droits réservés
                    </td>
                  </tr>
                </table>
              </div>
              `
            });

            console.log("✅ Email de prolongation envoyé à tous les utilisateurs");
          }
        } catch (mailErr) {
          console.error("❌ Erreur envoi email promo :", mailErr);
        }
      }
    }

    // ============================
    res.json(promo);

  } catch (err) {
    console.error("❌ Erreur update promo:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/* ----------------------
   DELETE /promos/:id
   Supprimer un code promo (admin)
   ---------------------- */
// DELETE /promos/:id
app.delete('/promos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 validation id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Id invalide' });
    }

    const promo = await PromoCode.findByIdAndDelete(id);

    if (!promo) {
      return res.status(404).json({ message: 'Code promo introuvable' });
    }

    res.json({
      message: 'Code promo supprimé avec succès',
      deletedId: promo._id
    });
  } catch (err) {
    console.error('❌ Erreur suppression promo:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

/*--------


/* ------------------------------------------------------------------ */
/*  clients                               */
/* ------------------------------------------------------------------ */

// Obtenir tous les clients
app.get('/clients', async (req, res) => {
  const { adminId } = req.query;

  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    return res.status(400).json({ message: "adminId est requis ou invalide" });
  }

  try {
    // Étape 1 : trouver tous les clients ayant passé une commande pour cet admin
    const commandes = await Commandes.find({ adminId }).select('client');

    // Étape 2 : extraire les IDs clients uniques
    const clientIds = [
      ...new Set(commandes.map(cmd => cmd.client?.toString()).filter(Boolean))
    ];

    // Étape 3 : récupérer les utilisateurs correspondants
    const users = await User.find({ _id: { $in: clientIds } }).select('-password'); // on ne retourne pas le mot de passe

    res.json(users);
  } catch (error) {
    console.error("Erreur récupération clients :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
  // Obtenir un client avec ses commandes
  app.get('/clients/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID client invalide' });
  }

  try {
    const client = await User.findById(id).select('-password').lean();

    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    const commandes = await Commandes.find({ client: id })
      .select('numeroCommande totalAmount status createdAt cart')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ ...client, Commande: commandes });
  } catch (error) {
    console.error('Erreur récupération client :', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});
app.get('/clients/statistiques', async (req, res) => {
  const { adminId } = req.query;

  if (!adminId) {
    return res.status(400).json({ message: "adminId est requis" });
  }

  try {
    const commandes = await Commandes.find({
      adminId,
      'cart.0': { $exists: true } // 🧠 uniquement les clients avec commande réelle
    }).exec();

    const statusCount = commandes.reduce((acc, cmd) => {
      acc[cmd.status] = (acc[cmd.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ statusCount, commandes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/email', async (req, res) => {
  const { name, email, number, content } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'email',
      host:process.env.ADMIN_HOST,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER, // ton email
        pass: process.env.EMAIL_PASS  // ton mot de passe d'application (pas celui de Gmail directement)
      },
      secure:true
    });

    const mailOptions = {
      from: email,
      to: 'infos@codeshop225.ci', // destinataire
      subject: `📩 Nouveau message de ${name}`,
      html: `
        <h3>Nom : ${name}</h3>
        <h4>Email : ${email}</h4>
        <h4>Téléphone : ${number}</h4>
        <p>${content}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Message envoyé avec succès !' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Échec de l’envoi du message.' });
  }
});


// app.get('/newsletter', async (req, res) => {
//   const { adminId } = req.query;

//   if (!adminId) {
//     return res.status(400).json({ message: "adminId requis." });
//   }

//   try {
//     const emails = await News.find({ adminId }).sort({ createdAt: -1 });
//     res.status(200).json(emails);
//   } catch (err) {
//     console.error('Erreur récupération emails :', err);
//     res.status(500).json({ message: 'Erreur serveur.' });
//   }
// });
app.get('/newsletter', async (req, res) => {
  try {
    const emails = await News.find().sort({ createdAt: -1 }); // ne pas filtrer .select()
    res.status(200).json(emails);
  } catch (err) {
    console.error('Erreur récupération emails :', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.post('/subscribe', async (req, res) => {
  const { email, adminId } = req.body;

  if (!email || !adminId) {
    return res.status(400).json({ message: "Email et adminId sont requis." });
  }

  try {
    const existing = await News.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email déjà inscrit." });
    }

    const newsEntry = await News.create({ email, adminId });
    res.status(201).json({ message: "Inscription réussie", newsEntry });
  } catch (error) {
    console.error("Erreur d'inscription :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
app.delete('/newsletter/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await News.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Email non trouvé." });
    }
    res.status(200).json({ message: "Email supprimé." });
  } catch (err) {
    console.error("Erreur suppression :", err);
    res.status(500).json({ message: "Erreur serveur lors de la suppression." });
  }
});

// GET /api/products/nouveautes
app.get('/nouveautes', async (req, res) => {
  try {
    const produits = await Product.find({ nouveaute: true }).sort({ createdAt: -1 });
    res.json(produits);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});




app.get("/archived/:archiveId", async (req, res) => {
  try {
    const { archiveId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(archiveId)) {
      return res.status(400).json({ message: "ID archive invalide" });
    }

    // Récupération de l'article archivé
    const archive = await ArchiveArticle.findById(archiveId).lean();
    if (!archive) return res.status(404).json({ message: "Article archivé non trouvé" });

    // Récupération des commandes associées à ce produit original
    const commandes = await Commandes.find({ "cart.product": archive.originalProductId })
      .populate("client", "name email") // infos client
      .sort({ createdAt: -1 })
      .lean();

    res.json({ archive, commandes });
  } catch (err) {
    console.error("Erreur récupération détails archive :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});



app.get("/products/archived", async (req, res) => {
  try {
    const archivedArticles = await ArchiveArticle.find()
      .sort({ archivedAt: -1 })
      .lean();
    
    res.json({ products: archivedArticles });
  } catch (err) {
    console.error("Erreur récupération articles archivés :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.put("/archived/:archiveId", async (req, res) => {
  try {
    const { archiveId } = req.params;
    const updates = req.body; // { title, price, reason, archivedAt, ... }

    if (!mongoose.Types.ObjectId.isValid(archiveId)) {
      return res.status(400).json({ message: "ID archive invalide" });
    }

    const archive = await ArchiveArticle.findByIdAndUpdate(
      archiveId,
      { $set: updates },
      { new: true }
    );

    if (!archive) return res.status(404).json({ message: "Article archivé non trouvé" });

    res.json({ message: "Article archivé mis à jour", archive });
  } catch (err) {
    console.error("Erreur mise à jour archive :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
// GET messages actifs
app.get("/get/messages", async (req, res) => {
  try {
    const now = new Date();
    const messages = await Message.find({ expiresAt: { $gte: now } }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST nouveau message
// POST /new/messages
app.post("/new/messages/", async (req, res) => {
  try {
    let { text, expiresAt } = req.body;

    if (!text || !expiresAt) {
      return res.status(400).json({ message: "Texte et date d'expiration obligatoires" });
    }

    // Convertir la string YYYY-MM-DD en Date valide
    expiresAt = new Date(expiresAt);
    expiresAt.setHours(23, 59, 59, 999); // fin de journée

    // ✅ Création du message
    const msg = new Message({ text, expiresAt });
    await msg.save();

    // ============================
    // 📧 EMAIL À TOUS LES CLIENTS
    // ============================
    try {
      // Récupérer tous les emails des utilisateurs
      const users = await User.find({}, "email");
      if (users.length > 0) {
        const emails = users.map(u => u.email);

        await transporter.sendMail({
          from: `"CodeShop225" <${process.env.SMTP_USER}>`,
          to: `"CodeShop225" <${process.env.SMTP_USER}>`, // Gmail safe
          bcc: emails,
          subject: "📢 Nouveau message important sur CodeShop225",
          html: `
<div style="background:#fff5e6;padding:40px 0;font-family:Segoe UI,Arial">
  <table width="100%" style="max-width:650px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 25px rgba(0,0,0,0.08)">
    
    <!-- HEADER FESTIF -->
    <tr>
      <td style="background:linear-gradient(135deg,#4b00cc,#6a00ff);padding:30px;text-align:center;color:#fff">
        <h1 style="margin:0;font-size:28px">🎉 Message spécial de CodeShop225 🎉</h1>
        <p style="margin-top:10px;font-size:16px">
          Une annonce importante ou un petit mot pour vous !
        </p>
      </td>
    </tr>

    <!-- CONTENU -->
    <tr>
      <td style="padding:35px;color:#333">
        <h2 style="margin-top:0;font-size:22px">Bonjour !</h2>
        <p style="font-size:16px;line-height:1.5">
          ${text}
        </p>

        <div style="margin:20px 0;text-align:center">
          <a href="https://codeshop225.ci"
            style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#4b00cc,#6a00ff);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:16px">
            🔗 Découvrir sur CodeShop225
          </a>
        </div>

        <p style="margin-top:25px;color:#6b7280;font-size:14px">
          Avec nos meilleurs vœux,<br/>
          <strong>L’équipe CodeShop225 💜</strong>
        </p>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#fff2e0;padding:15px;text-align:center;font-size:12px;color:#9ca3af">
        © ${new Date().getFullYear()} CodeShop225 – Tous droits réservés
      </td>
    </tr>
  </table>
</div>
          `
        });

        console.log("✅ Email de nouveau message envoyé à tous les utilisateurs");
      }
    } catch (mailErr) {
      console.error("❌ Erreur envoi email message :", mailErr);
    }

    // ============================
    res.status(201).json(msg);

  } catch (err) {
    console.error("❌ Erreur création message :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE message
app.delete("/delete/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message supprimé" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /update/messages/:id — Mettre à jour un message promo
app.put('/update/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérification de l'ID Mongo
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    const { text, expiresAt } = req.body;

    if (!text || !expiresAt) {
      return res.status(400).json({ message: "Le texte et la date d'expiration sont requis." });
    }

    // Chercher le message
    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    // Mettre à jour
    message.text = text;
    message.expiresAt = new Date(expiresAt);

    await message.save();

    res.json(message);
  } catch (err) {
    console.error("Erreur mise à jour message :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
});


//   const INITIAL_PRODUCTS = [
//  // 🎮 PS5 - 6 jeux
//   {
//     title: "Marvel's Spider-Man 2",
//     reference: "PS5-001",
//     description: "Incarnez Peter Parker et Miles Morales dans une aventure épique exclusive à la PS5.",
//     groupe: "PS5",
//     categorie: "Action",
//     stock: 20,
//     price: 50000,
//     prixAchat: 42000,
//     label: "Sony",
//     promotion: 0,
//     images: ["you-did-it.jpeg"],
//     img: "you-did-it.jpeg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "God of War Ragnarok",
//     reference: "PS5-002",
//     description: "Kratos et Atreus affrontent leur destin dans le froid nordique.",
//     groupe: "PS5",
//     categorie: "Aventure",
//     stock: 15,
//     price: 52000,
//     prixAchat: 43000,
//     label: "Santa Monica Studio",
//     promotion: 10,
//     images: ["jeux-god-of-war-pour-ps5.jpg"],
//     img: "jeux-god-of-war-pour-ps5.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "FIFA 25",
//     reference: "PS5-003",
//     description: "Le football de nouvelle génération avec licences officielles et graphismes améliorés.",
//     groupe: "PS5",
//     categorie: "Sport",
//     stock: 25,
//     price: 48000,
//     prixAchat: 40000,
//     label: "EA Sports",
//     promotion: 0,
//     images: ["ea-sports-fc-25-standard-edition-ps5-goldgames-1-1.webp"],
//     img: "ea-sports-fc-25-standard-edition-ps5-goldgames-1-1.webp",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Hogwarts Legacy",
//     reference: "PS5-004",
//     description: "Explorez le monde des sorciers en 1890 dans un RPG en monde ouvert.",
//     groupe: "PS5",
//     categorie: "RPG",
//     stock: 10,
//     price: 55000,
//     prixAchat: 46000,
//     label: "Warner Bros",
//     promotion: 5,
//     images: ["81u2jp7hdnL.jpg"],
//     img: "81u2jp7hdnL.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "NBA 2K24",
//     reference: "PS5-005",
//     description: "Devenez une légende de la NBA avec des graphismes ultra réalistes.",
//     groupe: "PS5",
//     categorie: "Sport",
//     stock: 18,
//     price: 47000,
//     prixAchat: 39000,
//     label: "2K Sports",
//     promotion: 0,
//     images: ["NBA 2K24.avif"],
//     img: "NBA 2K24.avif",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Assassin’s Creed Mirage",
//     reference: "PS5-006",
//     description: "Retour aux origines dans les rues de Bagdad avec un gameplay furtif renouvelé.",
//     groupe: "PS5",
//     categorie: "Action",
//     stock: 12,
//     price: 49000,
//     prixAchat: 41000,
//     label: "Ubisoft",
//     promotion: 0,
//     images: ["assassin.jpg"],
//     img: "assassin.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },

//   // 🎮 PS4 - 6 jeux
//   {
//     title: "The Last of Us Part II",
//     reference: "PS4-001",
//     description: "Une aventure poignante dans un monde post-apocalyptique.",
//     groupe: "PS4",
//     categorie: "Action",
//     stock: 10,
//     price: 35000,
//     prixAchat: 28000,
//     label: "Naughty Dog",
//     promotion: 10,
//     images: ["The Last of Us Part II.jpg"],
//     img: "The Last of Us Part II.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Gran Turismo Sport",
//     reference: "PS4-002",
//     description: "Simulation de course automobile ultra réaliste.",
//     groupe: "PS4",
//     categorie: "Sport",
//     stock: 12,
//     price: 30000,
//     prixAchat: 24000,
//     label: "Polyphony Digital",
//     promotion: 5,
//     images: ["61VLBp7-U4L._SL1000_.jpg"],
//     img: "61VLBp7-U4L._SL1000_.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Ghost of Tsushima",
//     reference: "PS4-003",
//     description: "Devenez un samouraï et défendez le Japon contre les Mongols.",
//     groupe: "PS4",
//     categorie: "Aventure",
//     stock: 14,
//     price: 37000,
//     prixAchat: 29000,
//     label: "Sucker Punch",
//     promotion: 0,
//     images: ["81TX5jfJ7sS.jpg"],
//     img: "81TX5jfJ7sS.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "FIFA 24",
//     reference: "PS4-004",
//     description: "La référence du football sur console.",
//     groupe: "PS4",
//     categorie: "Sport",
//     stock: 20,
//     price: 30000,
//     prixAchat: 25000,
//     label: "EA Sports",
//     promotion: 0,
//     images: ["EA-SPORTS-FC-24-Playstation-4-FIFA-24-Video-Game_c98bbb3c-137d-42df-91bb-dd3b25e19be0.07c374f830d31e015e4ae98a28b13508.webp"],
//     img: "EA-SPORTS-FC-24-Playstation-4-FIFA-24-Video-Game_c98bbb3c-137d-42df-91bb-dd3b25e19be0.07c374f830d31e015e4ae98a28b13508.webp",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Red Dead Redemption 2",
//     reference: "PS4-005",
//     description: "Une fresque épique dans l’Ouest sauvage.",
//     groupe: "PS4",
//     categorie: "Aventure",
//     stock: 8,
//     price: 38000,
//     prixAchat: 30000,
//     label: "Rockstar Games",
//     promotion: 5,
//     images: ["Red-Dead-Redemption-2-PlayStation-4_65bcc7a0-9a94-45fe-9316-6deac8cb2b86_2.df87ada9ea2d3bc6fc8013a20eb58da1.webp"],
//     img: "Red-Dead-Redemption-2-PlayStation-4_65bcc7a0-9a94-45fe-9316-6deac8cb2b86_2.df87ada9ea2d3bc6fc8013a20eb58da1.webp",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Sekiro: Shadows Die Twice",
//     reference: "PS4-006",
//     description: "Affrontez des ennemis redoutables dans un Japon féodal brutal.",
//     groupe: "PS4",
//     categorie: "Action",
//     stock: 10,
//     price: 34000,
//     prixAchat: 28000,
//     label: "FromSoftware",
//     promotion: 0,
//     images: ["Sekiro- Shadows Die Twice.jpeg"],
//     img: "Sekiro- Shadows Die Twice.jpeg",
//     adminId: "687e75dc59e074e9c6958861"
//   },

//   // 💳 Cartes PSN (5)
//   {
//     title: "Carte PSN 10€",
//     reference: "PSN-001",
//     description: "Crédit de 10€ sur le PlayStation Store Europe.",
//     groupe: "Cartes PSN",
//     categorie: "Carte",
//     stock: 30,
//     price: 9500,
//     prixAchat: 8500,
//     label: "Sony",
//     promotion: 0,
//     images: [],
//     img: "img_2230.png",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte PSN 20€",
//     reference: "PSN-002",
//     description: "Crédit de 20€ sur le PlayStation Store Europe.",
//     groupe: "Cartes PSN",
//     categorie: "Carte",
//     stock: 25,
//     price: 18500,
//     prixAchat: 17000,
//     label: "Sony",
//     promotion: 0,
//     images: [],
//     img: "carte-playstation-network-20.png",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte PSN 50€",
//     reference: "PSN-003",
//     description: "Crédit de 50€ sur le PlayStation Store Europe.",
//     groupe: "Cartes PSN",
//     categorie: "Carte",
//     stock: 20,
//     price: 46000,
//     prixAchat: 42000,
//     label: "Sony",
//     promotion: 0,
//     images: [],
//     img: "aEv1PyQDc5eTb1FjxVYW1596286285-thumb-large.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte PSN US 25$",
//     reference: "PSN-004",
//     description: "Crédit de 25$ sur le PlayStation Store USA.",
//     groupe: "Cartes PSN",
//     categorie: "Carte",
//     stock: 18,
//     price: 24000,
//     prixAchat: 21000,
//     label: "Sony",
//     promotion: 0,
//     images: [],
//     img: "a355c68f08e14102a8ded915.avif",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte PSN US 50$",
//     reference: "PSN-005",
//     description: "Crédit de 50$ sur le PlayStation Store USA.",
//     groupe: "Cartes PSN",
//     categorie: "Carte",
//     stock: 15,
//     price: 47000,
//     prixAchat: 43000,
//     label: "Sony",
//     promotion: 0,
//     images: [],
//     img: "170170396982119.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   },

//   // 💳 Cartes iTunes (5)
//   {
//     title: "Carte iTunes 10€",
//     reference: "ITUNES-001",
//     description: "Crédit de 10€ pour achats sur l'App Store et iTunes.",
//     groupe: "Cartes iTunes",
//     categorie: "Carte",
//     stock: 20,
//     price: 9500,
//     prixAchat: 8500,
//     label: "Apple",
//     promotion: 0,
//     images: [],
//     img: "img_2373.png",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte iTunes 15€",
//     reference: "ITUNES-002",
//     description: "Crédit de 15€ pour achats sur l'App Store et iTunes.",
//     groupe: "Cartes iTunes",
//     categorie: "Carte",
//     stock: 15,
//     price: 14000,
//     prixAchat: 13000,
//     label: "Apple",
//     promotion: 0,
//     images: [],
//     img: "img_2552.jpeg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte iTunes 25€",
//     reference: "ITUNES-003",
//     description: "Crédit de 25€ pour achats sur l'App Store et iTunes.",
//     groupe: "Cartes iTunes",
//     categorie: "Carte",
//     stock: 10,
//     price: 23000,
//     prixAchat: 21000,
//     label: "Apple",
//     promotion: 0,
//     images: [],
//     img: "Carte iTunes 25€.jpeg",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte iTunes US 25$",
//     reference: "ITUNES-004",
//     description: "Crédit de 25$ pour achats sur l'App Store US.",
//     groupe: "Cartes iTunes",
//     categorie: "Carte",
//     stock: 8,
//     price: 24000,
//     prixAchat: 22000,
//     label: "Apple",
//     promotion: 0,
//     images: [],
//     img: "carte-app-store-itunes-cards-us-25.webp",
//     adminId: "687e75dc59e074e9c6958861"
//   },
//   {
//     title: "Carte iTunes US 50$",
//     reference: "ITUNES-005",
//     description: "Crédit de 50$ pour achats sur l'App Store US.",
//     groupe: "Cartes iTunes",
//     categorie: "Carte",
//     stock: 5,
//     price: 46000,
//     prixAchat: 43000,
//     label: "Apple",
//     promotion: 0,
//     images: [],
//     img: "itunes-store-50-dollars-usa-united-states-america.jpg",
//     adminId: "687e75dc59e074e9c6958861"
//   }

//  ];

// /* -------------------------------------------------------------
//    2)  FONCTION SEED
// ------------------------------------------------------------- */
// async function seedAdminProducts() {
//   // 🟡 Remplace par tes id (ou lis-les depuis process.env)
//   const adminId       = '687e75dc59e074e9c6958861';

//   // 2-a.  Le même admin a-t-il déjà des produits ?
//   const already = await Product.countDocuments({ adminId });
//   if (already) {
//     console.log(`🌱 Seed ignoré (déjà ${already} produits pour cet admin)`);
//     return;
//   }

//   // 2-b.  Prépare les docs : on force les ObjectId
//   const docs = INITIAL_PRODUCTS.map(p => ({
//     ...p,
//     adminId:       new mongoose.Types.ObjectId(adminId),
//   }));

//   // 2-c.  Insertion + update Admin
//   const inserted = await Product.insertMany(docs, { ordered: false });
//   await Admin.findByIdAndUpdate(adminId, {
//     $push: { products: { $each: inserted.map(p => p._id) } }
//   });

//   console.log(`✅ Seed : ${inserted.length} produits créés pour l’admin`);
// }

//  seedAdminProducts();


// 🔹 2. Mettre à jour toutes les commandes existantes
// const commandes = await Commandes.find();
// console.log(`Commandes trouvées : ${commandes.length}`);

// for (const commande of commandes) {
//   let updated = false;

//   // Nouveau cart enrichi
//   const newCart = await Promise.all(
//     commande.cart.map(async (item) => {
//       // Si prixAchat existe déjà, on garde
//       if (item.prixAchat) return item;

//       const product = await Product.findById(item.productId);
//       if (!product) return item;

//       updated = true;
//       return {
//         ...item,
//         prixAchat: product.prixAchat || 0,
//         title: item.title || product.title,
//         price: item.price || product.price,
//       };
//     })
//   );

//   // Si la commande a été modifiée, on sauvegarde
//   if (updated) {
//     commande.cart = newCart;
//     await commande.save();
//     console.log(`✅ Commande ${commande._id} mise à jour`);
//   }
// }

console.log("🎉 Mise à jour terminée !");
  

app.listen(port , ()=> {
    console.log('Server running at 127.0.0.1:' + port)
})
