import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  surnom: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  numero: { type: String, required: true },
  adresse: { type: String, required: true },
  photo: { type: String },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  commandes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commandes' }],
  // clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }], /*ya un souci car deux clients qui sont creer */
   clients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }]
}, {
  timestamps: true
});

// Hash du mot de passe avant sauvegarde
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

adminSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;