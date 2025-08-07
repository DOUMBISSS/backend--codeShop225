// models/News.js
import mongoose from "mongoose";

const NewsletterSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    unique: true 
  },
//   adminId: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: 'Admin', 
//     required: true 
//   },
}, { timestamps: true });

const News = mongoose.model("News", NewsletterSchema);
export default News;