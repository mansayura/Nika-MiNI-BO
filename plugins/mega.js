const { cmd } = require('../lib/command');
const { File } = require("megajs");
const path = require('path');
const fs = require('fs');

cmd({
  pattern: "mega",
  desc: "Download real mp4 from Mega.nz",
  react: "🎥",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q || !q.includes("mega.nz")) return reply("📎 *Send a valid Mega.nz file URL*");

    const [fileUrl, decryptionKey] = q.split("#");
    if (!decryptionKey) return reply("🔑 *Missing decryption key*");

    const megaFile = File.fromURL(fileUrl + "#" + decryptionKey);

    let tempPath = path.join(__dirname, "../temp", megaFile.name || "file.tmp");
    const writeStream = fs.createWriteStream(tempPath);

    // 📥 Download with stream
    await new Promise((resolve, reject) => {
      megaFile.download()
        .pipe(writeStream)
        .on("finish", resolve)
        .on("error", reject);
    });

    const stats = fs.statSync(tempPath);
    const sizeInMB = stats.size / 1024 / 1024;

    // ⚠️ Size limit 2000MB (≈ 2GB)
    if (sizeInMB > 2000) {
      fs.unlinkSync(tempPath);
      return reply(`❌ File too large (${sizeInMB.toFixed(2)}MB). Max allowed: 2000MB (2GB).`);
    }

    const buffer = fs.readFileSync(tempPath);
    const fileName = megaFile.name || "file.mp4";
    const ext = path.extname(fileName).toLowerCase();

    // 📤 Send to WhatsApp
    if (ext === ".mp4") {
      await conn.sendMessage(from, {
        video: buffer,
        mimetype: 'video/mp4',
        fileName,
        caption: `🎬 Downloaded from Mega.nz\n📁 ${fileName}\n📦 ${(sizeInMB).toFixed(2)} MB`
      }, { quoted: mek });
    } else {
      await conn.sendMessage(from, {
        document: buffer,
        mimetype: 'application/octet-stream',
        fileName,
        caption: `📦 Downloaded from Mega.nz\n📁 ${fileName}\n📦 ${(sizeInMB).toFixed(2)} MB`
      }, { quoted: mek });
    }

    fs.unlinkSync(tempPath); // 🧹 Clean temp file

  } catch (e) {
    console.error(e);
    reply("❌ Mega.nz download failed.\nReason: " + e.message);
  }
});
