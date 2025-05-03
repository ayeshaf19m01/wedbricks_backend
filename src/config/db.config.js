const mongoose = require("mongoose")

exports.ConnectDB= async()=>{
    try {
       await mongoose.connect("mongodb+srv://ayesha:tluY9YQsXrYgwtnt@cluster0.koi5qqd.mongodb.net/")
        console.log(`the db is connect with ${mongoose.connection.host}`);
        
        
    } catch (error) {
        mongoose.disconnect()
        process.exit(1)
    }
}