import mongoose from "mongoose";
// import {updateCommandes} from '../app.js';
// import {addArchivedField} from '../app.js';

// const server = '127.0.0.1:27017';
const database = 'back--CodeShop225';     
class Database {
    static connect() {
      mongoose.connect(process.env.MONGODB_CONNECT_URI)

      // updateCommandes()
 
       .then(() => {
         console.log('Database connection successful')
       })
       
       .catch(err => {
         console.error(err.message)
       })
  }
  
}
export default Database;