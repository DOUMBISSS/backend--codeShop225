import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // ex: 20240612
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", CounterSchema);

export default Counter;