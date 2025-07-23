import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadPaths = {
  produits: path.join(__dirname, '../uploads/produits'),
  profiles: path.join(__dirname, '../uploads/profiles'),
  admins: path.join(__dirname, '../uploads/admins'),
};

// Créer les dossiers s’ils n’existent pas
Object.values(uploadPaths).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storageProduits = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPaths.produits),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadProduct = multer({ storage: storageProduits });

// Profils utilisateur
const storageProfiles = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPaths.profiles),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${Date.now()}${ext}`);
  },
});

export const uploadUserPhoto = multer({
  storage: storageProfiles,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont autorisées'), false);
    }
    cb(null, true);
  },
});

// Admins
const storageAdmins = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPaths.admins),
  filename: (req, file, cb) => {
    cb(null, `admin-${Date.now()}-${file.originalname}`);
  },
});

export const uploadAdminImage = multer({ storage: storageAdmins });

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

export const uploadFields = multer({
  storage,
}).fields([
  { name: 'img',    maxCount: 1  },  // image principale
  { name: 'images', maxCount: 10 }   // images secondaires
]);