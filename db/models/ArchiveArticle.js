import mongoose from 'mongoose';

const ArchiveArticleSchema = new mongoose.Schema(
  {
    /* 🔗 Référence produit original */
    originalProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },

    /* 🧾 Données produit figées */
    title:        { type: String, required: true },
    reference:    { type: String },
    description: { type: String },

    categorie:    { type: String },
    groupe:       { type: String },

    price:        { type: Number, required: true },
    prixAchat:    { type: Number },

    stock:        { type: Number, default: 0 },
    disponible:   { type: Boolean, default: false },

    img:          { type: String },
    images:       [String],

    specifications: mongoose.Schema.Types.Mixed,

    /* 👤 Propriétaire */
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true
    },

    /* 📅 Archivage */
    archivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },

    reason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

/* 🔍 Index utiles */
ArchiveArticleSchema.index({ adminId: 1, archivedAt: -1 });
ArchiveArticleSchema.index({ originalProductId: 1 }, { unique: true });

const ArchiveArticle = mongoose.model('ArchiveArticle', ArchiveArticleSchema);
export default ArchiveArticle;