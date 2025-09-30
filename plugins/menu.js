const config = require('../settings');
const { cmd } = require('../lib/command');

cmd({
    pattern: "menu",
    alias: ["commands", "help"],
    react: "📜",
    desc: "Show NIKA MINI BOT menu.",
    category: "main",
    filename: __filename
}, async (bot, mek, m, { from, reply }) => {
    try {
        // Menu text
        const menuText = 
`🔥 *NIKA MINI BOT MENU* 🔥

👑 *Main Commands*
➤ .alive
➤ .jid
➤ .forward 
➤ .vv
➤ .getpp
➤ .ping
➤ .owner

🌐 *download Commands*
➤ .download
➤ .gdrive
➤ .telegram < name >
("telegram any" group document)
➤ .fb
➤ .tiktok
➤ .mega
➤ .chanel 
         (chanel upload large video)
➤ .song
➤ .video 
➤ .xhamster


⚙️ *Settings*
➤ .button on/off
➤ .antidelete on/off


💬 Type the command with (.) prefix!`;

        // Banner/logo
        const imageUrl = "https://raw.githubusercontent.com/Sayurami/Poto-upload-/refs/heads/main/file_00000000022461faa976f5570799fae2.png";

        if (config.BUTTON === "true") {
            // ✅ Button version
            await bot.sendMessage(from, {
                image: { url: imageUrl },
                caption: menuText,
                footer: "⚡ Powered by NIKA MINI BOT ⚡",
                buttons: [
                    { buttonId: ".alive", buttonText: { displayText: "⚡ ALIVE" }, type: 1 },
                    { buttonId: ".ping", buttonText: { displayText: "📶 PING" }, type: 1 },
                    { buttonId: ".owner", buttonText: { displayText: "👤 OWNER" }, type: 1 },
                ],
                headerType: 4
            }, { quoted: mek });
        } else {
            // ✅ Non-button fallback
            await bot.sendMessage(from, {
                image: { url: imageUrl },
                caption: menuText
            }, { quoted: mek });
        }
    } catch (e) {
        reply("❌ Error in .menu command:\n" + e.message);
    }
});
