const { cmd } = require('../lib/command');
const axios = require("axios");
const path = require("path");
const mime = require("mime-types"); // << install with: npm install mime-types

cmd({
    pattern: "download",
    alias: ["downurl"],
    use: '.download <url>',
    react: "🔰",
    desc: "Download file from direct URL with original filename.",
    category: "search",
    filename: __filename
},

async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply("❗ කරුණාකර download link එකක් ලබා දෙන්න."); 
        }

        const link = q.trim();
        const urlPattern = /^(https?:\/\/[^\s]+)/;

        if (!urlPattern.test(link)) {
            return reply("❗ දීලා තියෙන URL එක වැරදි. කරුණාකර link එක හොඳින් බලන්න."); 
        }

        // 📝 Try to get original filename from headers
        let fileName = "downloaded_file";
        try {
            const res = await axios.head(link);
            const disposition = res.headers["content-disposition"];
            if (disposition && disposition.includes("filename=")) {
                fileName = disposition.split("filename=")[1].replace(/["']/g, "");
            } else {
                // fallback: take from URL
                fileName = path.basename(link.split("?")[0]);
            }
        } catch {
            fileName = path.basename(link.split("?")[0]) || "downloaded_file";
        }

        // 📝 Detect mimetype properly
        let mimetype = mime.lookup(fileName) || "application/octet-stream";

        // 📝 Info message
        let info = `*© ᴄʀᴇᴀᴛᴇᴅ ʙʏ ꜱayura mihiranga*`;

        // 📥 Send file with real name + correct mimetype
        await conn.sendMessage(from, {
            document: { url: link },
            mimetype: mimetype,
            fileName: fileName,
            caption: info
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply("❌ Error: " + e.message);
    }
});
