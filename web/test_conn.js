const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    console.log("URI:", process.env.MONGODB_URI);
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("SUCCESS: Connected to MongoDB from Node");
        await mongoose.disconnect();
    } catch (err) {
        console.error("FAIL:", err.message);
    }
}
check();
