const mongoose = require("mongoose");

const connectDB = async () => {
    const connection = await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: true
    });
    console.log(`Database Connected : ${connection.connection.host}`);
};

module.exports = connectDB;