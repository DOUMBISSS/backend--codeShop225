import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import moment from 'moment';

export const generateInvoice = async (commande) => {
  const filePath = `./factures/facture-${commande.numeroCommande}.pdf`;
  await fs.ensureDir('./factures');

  const doc = new PDFDocument({ margin: 50 });

  doc.pipe(fs.createWriteStream(filePath));

  // En-tête
  doc.fontSize(20).text("FACTURE", { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Date: ${moment(commande.createdAt).format('DD/MM/YYYY')}`);
  doc.text(`N° de Commande: ${commande.numeroCommande}`);
  doc.text(`Client: ${commande.name}`);
  doc.text(`Adresse: ${commande.address}, ${commande.ville}`);
  doc.text(`Téléphone: ${commande.number}`);
  doc.moveDown();

  // Tableau de produits
  doc.fontSize(14).text("Détails de la commande:");
  commande.cart.forEach(item => {
    doc.fontSize(12).text(`${item.title} - ${item.quantity} x ${parseInt(item.price).toLocaleString()} FCFA`);
  });

  doc.moveDown();
  doc.fontSize(16).text(`Total à payer: ${parseInt(commande.totalAmount).toLocaleString()} FCFA`);
  doc.text(`Statut de paiement: ${commande.paymentStatus}`);

  doc.end();

  return filePath;
}