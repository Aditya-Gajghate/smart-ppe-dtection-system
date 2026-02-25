const mongoose = require('mongoose');

const uri = "mongodb+srv://gajghateadityadelxn_db_user:qTUZBzWFeI4RX9XC@cluster0.bz0mrcv.mongodb.net/";

async function testConnection() {
    try {
        console.log("Attempting to connect to MongoDB Atlas...");
        await mongoose.connect(uri);
        console.log("Successfully connected to MongoDB Atlas!");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Connection failed with error:");
        console.error(error);
    }
}

testConnection();
