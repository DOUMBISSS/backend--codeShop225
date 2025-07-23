// routes/productUpload.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import Product from './db/models/product.js';
import Admin from './db/models/Admin.js';

const router = express.Router();

// Gestion __dirname dans ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === GESTION DES DOSSIERS UPLOADS ===
const uploadDir = path.join(__dirname, '../uploads/produits');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// === MULTER CONFIG ===
const storageProduits = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadProduct = multer({ storage: storageProduits });

// === ROUTE AJOUT PRODUIT ===
router.post(
  '/Newproducts',
  uploadProduct.fields([
    { name: 'img', maxCount: 1 },
    { name: 'images', maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const mainImage = req.files?.img?.[0]?.filename || null;
      const secondaryImages = req.files?.images?.map(f => f.filename) || [];

      const {
        title, reference, label, categorie, prixAchat,
        prixVente, price, description, groupe, specifications,
        adminId, stock, disponible, poids, fournisseur
      } = req.body;

      if (!adminId) return res.status(400).json({ message: 'adminId requis' });
      if (!mainImage) return res.status(400).json({ message: 'Image principale requise' });
      if (!fournisseur) return res.status(400).json({ message: 'Fournisseur requis' });

      const productData = {
        title,
        reference,
        label,
        categorie,
        prixAchat: parseFloat(prixAchat),
        prixVente: parseFloat(prixVente),
        price: parseFloat(price),
        description,
        groupe,
        specifications,
        img: `produits/${mainImage}`,
        images: secondaryImages.map(name => `produits/${name}`),
        adminId,
        fournisseur,
        stock: parseInt(stock, 10) || 0,
        disponible: disponible === 'true' || disponible === true,
        poids,
      };

      const savedProduct = await Product.create(productData);

      await Admin.findByIdAndUpdate(adminId, {
        $push: { products: savedProduct._id },
      });

      res.status(201).json({
        message: "Produit ajouté avec succès",
        product: savedProduct,
      });
    } catch (err) {
      console.error("Erreur création produit :", err);
      res.status(500).json({ message: "Erreur serveur lors de l'ajout du produit" });
    }
  }
);

export default router;