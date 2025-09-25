const l = console.log;
const os = require('os');
const config = require('../settings');
const { cmd } = require('../lib/command');

cmd({
    pattern: "alive",
    alias: ["bot", "up"],
    react: "⚡",
    desc: "Check if NIKA MINI BOT is online with system info.",
    category: "main",
    filename: __filename
}, async (bot, mek, m, { from, reply }) => {
    try {
        // Bot uptime calculation
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

        // System info
        const totalMemMB = (os.totalmem() / (1024 * 1024)).toFixed(0);
        const freeMemMB = (os.freemem() / (1024 * 1024)).toFixed(0);
        const usedMemMB = (totalMemMB - freeMemMB).toFixed(0);
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;

        // Stylish caption message
        const caption = 
`🔥 *NIKA MINI BOT* is *ALIVE* 🔥

🟢 *Status:* ONLINE
⏳ *Uptime:* ${uptimeStr}

💾 *RAM:* ${usedMemMB} MB / ${totalMemMB} MB
🖥️ *CPU:* ${cpuModel.split(" ")[0]} (${cpuCores} cores)

👤 *Owner:* Sayura Mihiranga
💬 Type *.menu* to explore commands!`;

        // Main banner/logo
        const imageUrl = "https://raw.githubusercontent.com/Sayurami/Poto-upload-/refs/heads/main/file_00000000022461faa976f5570799fae2.png";

        // Send with buttons (if BUTTON = true in settings)
        if (config.BUTTON === "true") {
            await bot.sendMessage(from, {
                image: { url: imageUrl },
                caption,
                footer: "⚡ Powered by NIKA MINI BOT ⚡",
                buttons: [
                    { buttonId: ".menu", buttonText: { displayText: "📜 MENU" }, type: 1 },
                    { buttonId: ".ping", buttonText: { displayText: "⚡ PING" }, type: 1 },
                ],
                headerType: 4
            }, { quoted: mek });
        } else {
            // Fallback (non-button)
            await bot.sendMessage(from, {
                image: { url: imageUrl },
                caption
            }, { quoted: mek });
        }

    } catch (e) {
        l(e);
        reply("❌ Error in .alive command:\n" + e.message);
    }
});
