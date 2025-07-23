import express from 'express';
import Admin from '../models/Admin';

const router = express.Router();

// ➤ Connexion admin
router.post('/login', async (req, res) => {
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
router.put("/admin/:id", uploadAdminImage.single("photo"), async (req, res) => {
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
router.post("/admin/register", uploadAdminImage.single("photo"), async (req, res) => {
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


router.get('/admin/:adminId', async (req, res) => {
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


export default router;