const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const siteSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: true,
            maxlength: 50
        },
        about: {
            type: String,
            required: true,
            maxlength: 5000
        },
        email: {
            type: String,
            required: true,
            maxlength: 5000
        },
        facebook_url: {
            type: String,
            maxlength: 5000
        },
        whatsapp_url: {
            type: String,
            maxlength: 5000
        },
        instagram_url: {
            type: String,
            maxlength: 5000
        },
        twitter_url: {
            type: String,
            maxlength: 5000
        },
        phone: {
            type: String,
            trim: true,
            required: true,
            maxlength: 32
        },
        logo: {
            data: Buffer,
            contentType: String
        }
    }, 
    {timestamps: true}
);



const site = mongoose.model("Site", siteSchema);

module.exports = site;