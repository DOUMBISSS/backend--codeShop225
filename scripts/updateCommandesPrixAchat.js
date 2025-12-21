import mongoose from "mongoose";
import Product from "./models/Product.js";
import Commande from "./models/Commandes.js";

// 🔹 2. Mettre à jour toutes les commandes existantes
const commandes = await Commande.find();
console.log(`Commandes trouvées : ${commandes.length}`);

for (const commande of commandes) {
  let updated = false;

  // Nouveau cart enrichi
  const newCart = await Promise.all(
    commande.cart.map(async (item) => {
      // Si prixAchat existe déjà, on garde
      if (item.prixAchat) return item;

      const product = await Product.findById(item.productId);
      if (!product) return item;

      updated = true;
      return {
        ...item,
        prixAchat: product.prixAchat || 0,
        title: item.title || product.title,
        price: item.price || product.price,
      };
    })
  );

  // Si la commande a été modifiée, on sauvegarde
  if (updated) {
    commande.cart = newCart;
    await commande.save();
    console.log(`✅ Commande ${commande._id} mise à jour`);
  }
}

console.log("🎉 Mise à jour terminée !");