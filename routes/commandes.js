import express from 'express';

const router = express.Router();


router.get('/commandes', async (req, res) => {
  try {
    const { adminId } = req.query;

    /* filtre facultatif sur l’admin -------------------------------- */
    const filter = {};
    if (adminId) {
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({ message: 'adminId invalide.' });
      }
      filter.adminId = adminId;
    }

    /* récupération + population client ----------------------------- */
    const commandes = await Commandes.find(filter)
      .sort({ createdAt: -1 })
      /* on n’expose que les champs utiles du client : */
      .populate('client', 'name surname email number address ville')
      /* (optionnel) on peut aussi peupler les produits si besoin :
         .populate('cart.productId', 'title img price')
       */
      .lean();

    res.json(commandes);
  } catch (err) {
    console.error('Erreur récupération commandes :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
                      
router.get('/commandes/statistiques', async (req, res) => {
  try {
    const { periode, mois, annee, startDate, endDate, adminId } = req.query;

    let filter = {};

    if (periode === 'mois' && mois && annee) {
      const start = new Date(`${annee}-${mois}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (periode === 'annee' && annee) {
      const start = new Date(`${annee}-01-01`);
      const end = new Date(`${parseInt(annee) + 1}-01-01`);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (periode === 'personnalise' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.adminId = adminId;
      filter['cart.0'] = { $exists: true }; // 🧠 Commandes avec au moins un produit
    }

    const commandes = await Commandes.find(filter);
    const totalCommandes = commandes.length;
    const totalVentes = commandes.reduce((acc, c) => acc + parseFloat(c.totalAmount), 0);
    const totalClients = new Set(commandes.map(c => c.number)).size; // 🔐 clients uniques par téléphone

    res.json({ totalCommandes, totalVentes, totalClients, commandes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// routes ou app.js
router.get('/commandes/:id', async (req, res) => {
  const { id } = req.params;

  /* ► Vérifier la validité de l’ID Mongo ---------------------------- */
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID invalide' });
  }

  try {
    /* ► Récupération + population sélective ------------------------- */
    const commande = await Commandes.findById(id)
      // Produits du panier
      .populate('cart.productId', 'title img price stock reference')
      // Profil client – on expose seulement les champs utiles
      .populate('client', 'name surname email number address ville photo')
      .lean();     // renvoie un objet “pur” (pas un document Mongoose)

    if (!commande) {
      return res.status(404).json({ message: 'Commande non trouvée' });
    }

    res.json(commande);
  } catch (err) {
    console.error('Erreur récupération commande :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


router.post('/commandes', async (req, res) => {
  try {
    /* ---------- 1. Données reçues ---------- */
    const {
      client,               // ObjectId du user
      cart,                 // [{ productId, quantity, … }]
      totalAmount,
      paymentStatus,
      status,
      address,              // adresse du profil (toujours envoyée)
      ville,                // ville du profil
      livraisonAlt          // { address, ville }  ⇐  facultatif
    } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ message: 'Le panier ne peut pas être vide.' });
    }

    /* ---------- 2. Contrôle de stock ---------- */
    for (const item of cart) {
      const produit = await Product.findById(item.productId);
      if (!produit) {
        return res.status(404).json({ message: `Produit introuvable : ${item.productId}` });
      }
      if (produit.stock < item.quantity) {
        return res.status(400).json({
          message: `Stock insuffisant pour "${produit.title}". Restant : ${produit.stock}, demandé : ${item.quantity}`
        });
      }
    }

    /* ---------- 3. Admin à partir du 1er produit ---------- */
    const firstProduct = await Product.findById(cart[0].productId);
    const adminId = firstProduct?.adminId;
    if (!adminId) {
      return res.status(400).json({ message: "Admin introuvable à partir du produit." });
    }

    /* ---------- 4. Création de la commande ---------- */
    const newCommande = await Commandes.create({
      client,
      cart,
      totalAmount,
      paymentStatus,
      status,
      adminId,
      address,          // adresse du profil
      ville,
      livraisonAlt: livraisonAlt?.address            // on n’enregistre que si l’utilisateur
        ? {                                            // a réellement saisi une nouvelle
            address: livraisonAlt.address.trim(),      // adresse OU ville
            ville  : livraisonAlt.ville?.trim() || ''
          }
        : undefined
    });

    /* ---------- 5. Décrémentation du stock ---------- */
    await Promise.all(
      cart.map(it =>
        Product.findByIdAndUpdate(it.productId, { $inc: { stock: -it.quantity } })
      )
    );

    return res.status(201).json(newCommande);
  } catch (error) {
    console.error('Erreur lors de la commande :', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});
                      // Mise à jour du statut d'une commande
// Mettre à jour le statut général de la commande (ex: en cours, livrée, annulée)
// Modifier le statut de livraison de la commande
router.put('/commandes/:id/status', async (req, res) => {
  const commandeId = req.params.id;
  const { status } = req.body;

  try {
    const updatedCommande = await Commandes.findByIdAndUpdate(
      commandeId,
      { status },
      { new: true }
    );

    if (!updatedCommande) {
      return res.status(404).json({ message: 'Commande non trouvée.' });
    }

    res.json({ message: 'Statut mis à jour avec succès.', commande: updatedCommande });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du statut:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});


// Marquer la commande comme payée (seulement si livrée)
router.patch('/commandes/:id/payer', async (req, res) => {
  try {
    const commande = await Commandes.findById(req.params.id);
    if (!commande) return res.status(404).json({ message: 'Commande non trouvée' });

    if (commande.status !== 'livrée') {
      return res.status(400).json({ message: "La commande doit être livrée avant d'être payée." });
    }

    commande.paymentStatus = 'payé'; // ← Corrigé ici aussi
    await commande.save();

    res.json({ message: 'Commande marquée comme payée.' });
  } catch (err) {
    console.error("Erreur lors du paiement de la commande:", err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});
// Exemple dans ton fichier routes ou directement dans app.js

router.get('/mes-commandes/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: "Client ID invalide" });
    }

    const commandes = await Commandes.find({ client: clientId })
      .populate("cart.productId", "title price") // si tu veux les infos du produit
      .populate("adminId", "nom prenom email") // si tu veux voir l'admin lié
      .sort({ createdAt: -1 }); // plus récentes d’abord

    if (!commandes || commandes.length === 0) {
      return res.status(404).json({ message: "Aucune commande trouvée." });
    }

    res.status(200).json({ commandes });

  } catch (err) {
    console.error("Erreur récupération commandes client :", err);
    res.status(500).json({ message: err.message });
  }
});

// DELETE /commandes/:id  – suppression définitive
router.delete('/commandes/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID invalide.' });
  }

  try {
    const deleted = await Commandes.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Commande introuvable.' });

    res.json({ message: 'Commande supprimée avec succès.' });
  } catch (err) {
    console.error('Erreur suppression commande :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});
export default router;