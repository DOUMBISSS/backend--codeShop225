import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  description: {
    type: String,
    default: "", // facultatif, peut rester vide
    trim: true
  },
  value: {
    type: Number,
    required: true // ex: 10% ou 2000 FCFA
  },
  minAmount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true
  },
  // ❌ Supprimer maxUsage / usedCount si ce n’est pas nécessaire
  // Chaque utilisateur pourra utiliser une seule fois via usedBy
  usedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users'
    }
  ]
}, { timestamps: true });

export default mongoose.models.PromoCode || mongoose.model('PromoCode', promoCodeSchema);