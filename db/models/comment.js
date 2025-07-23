import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    product : { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    /* utilisateur connecté ------------------------------------------------ */
    clients  : { type: mongoose.Schema.Types.ObjectId, ref: 'Users',   required: true },
    userName: { type: String, required: true },   // 🔸 plus de “default Anonyme”

    text    : { type: String, required: true },
    rating  : { type: Number, min: 1, max: 10, default: 5 },
  },
  { timestamps: true }
);
const Comment = mongoose.model('Comment', commentSchema);
export default Comment;