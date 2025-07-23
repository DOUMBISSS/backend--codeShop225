import mongoose from "mongoose";

let cartSchema = new mongoose.Schema ({
    cart: [{ type: mongoose.Schema.Types.ObjectId, ref:'Product'}],
    totalAmount: {type:Number},
    name:{type:String},
    address: {type:String},
    ville: {type:String},
    number: {type:String},
    paymentStatus: {String},
    transactionId: {type:String},
    status: { type: String, default: "en attente" }, // <-- c'est ici qu'on ajoute le statut de livraison
    createdAt: { type: Date, default: Date.now }
    
})


export default mongoose.model('Cart',cartSchema)