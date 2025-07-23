import mongoose from "mongoose";

// const server = '127.0.0.1:27017';
const database = 'back--fodex';     
class Database {
    static connect() {
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