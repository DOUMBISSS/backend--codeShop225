import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  ville: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String },
  DateProfilCreated: { type: Date, default: Date.now },
  commandes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commandes' }],
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
});

const Client = mongoose.model("Client", ClientSchema);
export default Client;