// models/Depense.js
import mongoose from "mongoose";

const depenseSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    type: {
      type: String,
      enum: ["DEPENSE", "ACHAT"],
      default: "DEPENSE",
      required: true,
    },
    categorie: {
      type: String,
      enum: ["STOCK", "LOYER", "TRANSPORT", "SALAIRE", "AUTRE"],
      default: "AUTRE",
    },
    montant: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true, // createdAt et updatedAt automatiques
  }
);

export default mongoose.model("Depense", depenseSchema);