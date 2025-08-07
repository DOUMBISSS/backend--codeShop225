import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  reference: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  groupe: {
    type: String, // Ex: "PS5", "Xbox", "PC", "Switch"
    required: true,
  },
  // edition: {
  //   type: String, // Ex: "Standard", "Deluxe", "Collector"
  //   default: "Standard"
  // },
  categorie: {
    type: String, // Ex: "Action", "RPG", "Sport", "Aventure"
  },
  // support: {
  //   type: String, // "Physique" ou "Digital"
  //   enum: ["Physique", "Digital"],
  //   required: true,
  // },
  stock: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  prixAchat: Number,
  label: String,
  promotion: {type: Number, // en %
    default: 0
  },
  images: {
    type: [String], // URLs des images secondaires
    default: []
  },
  img: {
    type: String, // URL de l’image principale
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  videoUrl:String,
  nouveaute: {
  type: Boolean,
  default: false
},
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model('Product', productSchema);