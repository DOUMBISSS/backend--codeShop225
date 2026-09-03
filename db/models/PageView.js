import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  path: { type: String, required: true },
  sessionId: { type: String, required: true },
  role: { type: String, enum: ['anonyme', 'client'], default: 'anonyme' },
}, {
  timestamps: true,
});

pageViewSchema.index({ createdAt: 1 });
pageViewSchema.index({ sessionId: 1 });

const PageView = mongoose.model('PageView', pageViewSchema);
export default PageView;
