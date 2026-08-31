import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Produits (legacy — la création produit passe désormais par des URLs Cloudinary uploadées côté client)
const storageProduits = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'codeshop_upload/produits',
    resource_type: 'image',
    public_id: `prod-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  }),
});

export const uploadProduct = multer({ storage: storageProduits });

// Profils utilisateur
const storageProfiles = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'codeshop_upload/profiles',
    resource_type: 'image',
    public_id: `profile-${Date.now()}`,
  }),
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
const storageAdmins = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'codeshop_upload/admins',
    resource_type: 'image',
    public_id: `admin-${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
  }),
});

export const uploadAdminImage = multer({ storage: storageAdmins });

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'codeshop_upload/produits',
    resource_type: 'image',
    public_id: `prod-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  }),
});

export const uploadFields = multer({
  storage,
}).fields([
  { name: 'img',    maxCount: 1  },  // image principale
  { name: 'images', maxCount: 10 }   // images secondaires
]);