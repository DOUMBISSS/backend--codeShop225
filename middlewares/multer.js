import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, '../uploads/admins');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `admin-${Date.now()}${ext}`;
    cb(null, name);
  }
});

export const uploadAdminImage = multer({ storage });