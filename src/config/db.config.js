const mongoose = require("mongoose");

exports.ConnectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
          
          });
    
    console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("❌ Connection Failed:", error.message);
    process.exit(1); // Exit with failure
  }
};