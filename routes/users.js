import express from 'express';
import multer from 'multer';

const router = express.Router();

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

// POST /user/register
router.post("/user/register", uploadUserPhoto.single("photo"), async (req, res) => {
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
router.post("/user/login", async (req, res) => {
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
router.put('/users/:id', async (req, res) => {
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
router.get('/commandes/user/:userId', async (req, res) => {
  try {
    const commandes = await Commandes.find({ clientId: req.params.userId })
      .populate('cart.product') // si les produits sont référencés
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('commandes');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
router.get('/:adminId/users', async (req, res) => {
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

export default router;