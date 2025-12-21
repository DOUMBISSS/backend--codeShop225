import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UsersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  surname: { type: String, required: true },
  address: { type: String, required: true },
  ville: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  photo: { type: String, default: "" },
  status: { type: String, default: "client" },
  DateProfilCreated: { type: Date, default: Date.now },
  commandes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commandes' }],

  // 🔹 Ajout pour reset password
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Number }, // timestamp en ms
});

// Middleware pour hacher le mot de passe avant sauvegarde
UsersSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

// Méthode pour comparer les mots de passe
UsersSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("Users", UsersSchema);
export default User;