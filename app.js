import express from 'express';
import Database from './db/database.js';
import bodyParser from 'body-parser';
// import {routes} from "./routes/routes.js";
import Product from './db/models/product.js';
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
// import fetch from "node-fetch"; 
import User from './db/models/users.js';
// import upload from './upload.js';
import  { uploadAdminImage } from './upload.js';
import  { uploadUserPhoto } from './upload.js';
import  { uploadProduct } from './upload.js';
import server from './server.js'
// import FormData from 'form-data';
// import axios from "axios";
import Comment from './db/models/comment.js';
import { uploadFields } from './upload.js'





const app = express();
const port = process.env.PORT;
app.use(cors());
// Ajoute ceci pour servir les fichiers statiques depuis /uploads
// app.use("/uploads", express.static(path.resolve("uploads")));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static('uploads'));
app.use('/api', server);

app.use(bodyParser.json());
app.use(cors({origin: '*',methods: ['GET', 'POST', 'PUT', 'DELETE'],allowedHeaders: ['Content-Type', 'Authorization']}));
app.use((req, res, next) => {res.header('Access-Control-Allow-Origin', '*');res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');next();});
// app.use('/api/factures', factureRoutes);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Pour que les images soient visibles
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuration Multer pour enregistrer les fichiers dans /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');  // dossier de destination (doit exister)
  },
  filename: (req, file, cb) => {
    // pour éviter conflits, on met timestamp + nom original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

const database = new Database();

Database.connect();
// POST /user/register
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

    const token = jwt.sign({ id: user._id }, "user_secret_key", { expiresIn: "2h" });

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
app.post('/Newproducts',
  upload.fields([
    { name: 'img',    maxCount: 1 },
    { name: 'images', maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      /* ---------- 1.  Gestion des fichiers ---------- */
      const mainImage       = req.files?.img?.[0]?.filename        || null;
      const secondaryImages = req.files?.images?.map(f => f.filename) || [];

      /* ---------- 2.  Destructuration du body ------- */
      const {
        title, reference, label, categorie,
        prixAchat, prixVente, price,
        promotion = 0,                    // <-- nouveau champ (%)
        description, groupe, specifications,
        adminId,
        stock = 0, disponible = true, poids = ''
      } = req.body;

      /* ---------- 3.  Vérifications rapides --------- */
      if (!adminId)   return res.status(400).json({ message: 'adminId requis' });
      if (!mainImage) return res.status(400).json({ message: 'Image principale requise' });

      /* ---------- 4.  Construction de l’objet ------- */
      const productData = {
        title,
        reference,
        label,
        categorie,
        prixAchat   : parseFloat(prixAchat) || 0,
        prixVente   : parseFloat(prixVente) || 0,
        price       : parseFloat(price)     || 0,
        promotion   : parseFloat(promotion) || 0,  // 0 = pas de promo
        description,
        groupe,
        specifications,
        img         : mainImage,
        images      : secondaryImages,
        adminId,
        // fournisseur,
        stock       : parseInt(stock, 10)   || 0,
        disponible  : (disponible === 'false' ? false : true),
        poids
      };

      /* ---------- 5.  Sauvegarde -------------------- */
      const savedProduct = await Product.create(productData);

      /* ---------- 6.  Lien vers l’admin ------------- */
      await Admin.findByIdAndUpdate(adminId, { $push: { products: savedProduct._id } });

      res.status(201).json({
        message: "Produit créé et lié à l'admin",
        product: savedProduct,
      });
    } catch (err) {
      console.error('Erreur lors de la création du produit :', err);
      res.status(500).json({ message: "Erreur serveur lors de l'ajout du produit" });
    }
  }
);
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

app.put('/products/:id', uploadFields, async (req, res) => {
  try {
    const { id } = req.params;

    const produit = await Product.findById(id);
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé.' });

    /* ---------- 1.  Champs texte (dont promotion) ---------- */
    Object.assign(produit, {
      reference     : req.body.reference      ?? produit.reference,
      title         : req.body.title          ?? produit.title,
      description   : req.body.description    ?? produit.description,
      price         : req.body.price          ?? produit.price,
      promotion     : req.body.promotion      ?? produit.promotion,  // ⬅️ ajouté
      label         : req.body.label          ?? produit.label,
      categorie     : req.body.categorie      ?? produit.categorie,
      details       : req.body.details        ?? produit.details,
      prixAchat     : req.body.prixAchat      ?? produit.prixAchat,
      prixVente     : req.body.prixVente      ?? produit.prixVente,
      groupe        : req.body.groupe         ?? produit.groupe,
      specifications: req.body.specifications ?? produit.specifications,
      stock         : req.body.stock          ?? produit.stock,
      disponible    : req.body.disponible === 'true' || req.body.disponible === true,
      poids         : req.body.poids          ?? produit.poids,
    });

    /* ---------- 2.  Image principale --------------- */
    if (req.files?.img?.length) {
      if (produit.img) {
        const old = path.join('uploads', produit.img);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      produit.img = req.files.img[0].filename;
    }

    /* ---------- 3.  Images secondaires ------------- */
    const keep = Array.isArray(req.body.existingImages)
      ? req.body.existingImages
      : req.body.existingImages ? [req.body.existingImages] : [];

    produit.images
      .filter((img) => !keep.includes(img))
      .forEach((img) => {
        const p = path.join('uploads', img);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });

    const newImgs = req.files?.images?.map((f) => f.filename) || [];
    produit.images = [...keep, ...newImgs];

    await produit.save();
    res.json({ message: 'Produit mis à jour', produit });
  } catch (err) {
    console.error('Erreur MàJ produit :', err);
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
app.post('/products/:id/comments', verifyJWT, async (req, res) => {
  try {
    /* récupérer l’utilisateur afin d’afficher son nom */
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    /* création du commentaire */
    const saved = await Comment.create({
      product : req.params.id,
      clients : user._id,                          // lien vers User
      userName: `${user.name} ${user.surname || ''}`.trim(),
      text    : req.body.text,
      rating  : Number(req.body.rating) || 10
    });

    res.status(201).json(saved);
  } catch (e) {
    console.error('Erreur POST /comments :', e);
    res.status(500).json({ message: 'Erreur serveur commentaires' });
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

app.get('/commandes', async (req, res) => {
  try {
    const { adminId } = req.query;

    /* filtre facultatif sur l’admin -------------------------------- */
    const filter = {};
    if (adminId) {
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ message: 'adminId invalide.' });
      }
      filter.adminId = adminId;
    }

    /* récupération + population client ----------------------------- */
    const commandes = await Commandes.find(filter)
      .sort({ createdAt: -1 })
      /* on n’expose que les champs utiles du client : */
      .populate('client', 'name surname email number address ville')
      /* (optionnel) on peut aussi peupler les produits si besoin :
         .populate('cart.productId', 'title img price')
       */
      .lean();

    res.json(commandes);
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


app.post('/commandes', async (req, res) => {
  try {
    /* ---------- 1. Données reçues ---------- */
    const {
      client,               // ObjectId du user
      cart,                 // [{ productId, quantity, … }]
      totalAmount,
      paymentStatus,
      status,
      address,              // adresse du profil (toujours envoyée)
      ville,                // ville du profil
      livraisonAlt          // { address, ville }  ⇐  facultatif
    } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: 'Le panier ne peut pas être vide.' });
    }

    /* ---------- 2. Contrôle de stock ---------- */
    for (const item of cart) {
      const produit = await Product.findById(item.productId);
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable : ${item.productId}` });
      }
      if (produit.stock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${produit.title}". Restant : ${produit.stock}, demandé : ${item.quantity}`
        });
      }
    }

    /* ---------- 3. Admin à partir du 1er produit ---------- */
    const firstProduct = await Product.findById(cart[0].productId);
    const adminId = firstProduct?.adminId;
    if (!adminId) {
      return res.status(400).json({ message: "Admin introuvable à partir du produit." });
    }

    /* ---------- 4. Création de la commande ---------- */
    const newCommande = await Commandes.create({
      client,
      cart,
      totalAmount,
      paymentStatus,
      status,
      adminId,
      address,          // adresse du profil
      ville,
      livraisonAlt: livraisonAlt?.address            // on n’enregistre que si l’utilisateur
        ? {                                            // a réellement saisi une nouvelle
            address: livraisonAlt.address.trim(),      // adresse OU ville
            ville  : livraisonAlt.ville?.trim() || ''
          }
        : undefined
    });

    /* ---------- 5. Décrémentation du stock ---------- */
    await Promise.all(
      cart.map(it =>
        Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } })
      )
    );

    return res.status(201).json(newCommande);
  } catch (error) {
    console.error('Erreur lors de la commande :', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});
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


  

app.listen(port , ()=> {
    console.log('Server running at 127.0.0.1:' + port)
})
