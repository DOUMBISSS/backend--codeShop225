// models/Commandes.js
import mongoose  from 'mongoose';
import Counter   from './Counter.js';

/* ---------- Sous-documents ---------- */
const CartItemSchema = new mongoose.Schema(
  {
    productId : { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    title     : { type: String,  required: true },
    description:  String,
    quantity  : { type: Number,  required: true },
    price     : { type: Number,  required: true }
  },
  { _id: false }
);

const LivraisonSchema = new mongoose.Schema(
  {
    address : { type: String, required: true },
    ville   : { type: String, required: true }
  },
  { _id: false }
);

/* ---------- Schéma principal ---------- */
const CommandesSchema = new mongoose.Schema({
  /** identifiant lisible */
  numeroCommande : { type: String, unique: true, required: true },

  /** liens */
  adminId : { type: mongoose.Schema.Types.ObjectId, ref: 'Admin',  required: true },
  client  : { type: mongoose.Schema.Types.ObjectId, ref: 'Users',  required: false },

  /** adresse du profil */
  address : String,
  ville   : String,

  /** adresse alternative facultative */
  livraisonAlt : { type: LivraisonSchema, default: undefined },

  /** panier */
  cart        : [CartItemSchema],
  totalAmount : { type: Number, required: true },

  /** états */
  status        : { type: String, enum: ['en attente', 'à livrer', 'livrée', 'annulé'], default: 'en attente' },
  paymentStatus : { type: String, enum: ['non payé', 'payé'],             default: 'non payé' },

  createdAt : { type: Date, default: Date.now },
  historique: [{ date: Date, action: String }]
});

/* ---------- hooks ---------- */
CommandesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/* génération automatique du numéro de commande */
CommandesSchema.pre('validate', async function (next) {
  if (this.numeroCommande) return next();

  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const today = `${yyyy}${mm}${dd}`;

  try {
    const counter = await Counter.findOneAndUpdate(
      { date: today },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.numeroCommande = `CMD-${today}-${String(counter.seq).padStart(4, '0')}`;
    next();
  } catch (err) { next(err); }
});

const Commandes = mongoose.model('Commandes', CommandesSchema);
export default Commandes;