import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

import Product from '../models/Product.js';
import Admin from '../models/Admin.js';
import User from '../models/users.js';
import Comment from '../models/Comment.js';
// import { verifyJWT } from '../middlewares/auth.js'

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// 👉 Dossier qui existe déjà
const UPLOAD_DIR = path.join('uploads');   // ← rien d’autre !

// ▸ Configuration minimale
const storage = multer.diskStorage({
  destination : UPLOAD_DIR,                        // envoie tout dans /uploads
  filename    : (req, file, cb) => {
    const ext = path.extname(file.originalname);   // garde l’extension
    const name = `prod-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

export const uploadFields = multer({
  storage,
}).fields([
  { name: 'img',    maxCount: 1  },  // image principale
  { name: 'images', maxCount: 10 }   // images secondaires
]);

/* ========== LISTE COMPLETE ========== */
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('Erreur liste produits :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID produit invalide" });
  }

  try {
    // On récupère le produit + on remplit le fournisseur (populate)
    const product = await Product.findById(id).populate('fournisseur').lean();

    if (!product) {
      return res.status(404).json({ message: "Produit non trouvé" });
    }

    res.json(product);

  } catch (error) {
    console.error("Erreur récupération produit :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.post('/Newproducts',
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
        adminId, fournisseur,
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
        fournisseur,
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
router.get('/detailProduct/:id', async (req, res) => {
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

router.put('/products/:id', uploadFields, async (req, res) => {
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


router.delete('/products/:id', async (req, res) => {
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
router.get('/products/:id/comments', async (req, res) => {
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

router.get('/products/promos', async (req, res) => {
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
router.post('/products/:id/comments', async (req, res) => {
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

router.get('/produits/statistiques', async (req, res) => {
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

router.delete('/products/:id/images/:filename', async (req, res) => {
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

export default router;