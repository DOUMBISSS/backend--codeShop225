import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);