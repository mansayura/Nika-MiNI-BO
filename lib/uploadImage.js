
// uploadImage.js
// Helper: Upload Buffer image -> ImgBB -> Return direct URL
// Made for NIKA MINI BOT ❤️

const axios = require("axios");
const FormData = require("form-data");

// ✅ Your ImgBB API Key
const API_KEY = "e251d134c7be343f6f7e34775f47a8d3";

async function uploadImage(buffer) {
    try {
        if (!buffer) throw new Error("❌ No buffer provided!");

        let form = new FormData();
        form.append("image", buffer.toString("base64")); // convert buffer -> base64

        let res = await axios.post(`https://api.imgbb.com/1/upload?key=${API_KEY}`, form, {
            headers: form.getHeaders(),
        });

        if (res.data && res.data.data && res.data.data.url) {
            return res.data.data.url; // return uploaded image link
        } else {
            throw new Error("❌ Failed to upload image (invalid response)");
        }
    } catch (err) {
        console.error("UploadImage Error:", err.message);
        throw err;
    }
}

module.exports = uploadImage;
