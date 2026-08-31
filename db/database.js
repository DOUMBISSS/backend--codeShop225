import mongoose from "mongoose";
// import {updateCommandes} from '../app.js';
// import {addArchivedField} from '../app.js';

// const server = '127.0.0.1:27017';
const database = 'back--CodeShop225';     
class Database {
    static connect() {
      // Évite les reconnexions multiples en environnement serverless (Vercel)
      // où le module reste chaud entre plusieurs invocations.
      if (mongoose.connection.readyState !== 0) return;

      mongoose.connect(process.env.MONGODB_CONNECT_URI)
       .then(() => {
         console.log('Database connection successful')
       })
       .catch(err => {
         console.error(err.message)
       })
  }

}
export default Database;