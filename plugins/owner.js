const { cmd } = require('../lib/command');

cmd({
    pattern: "owner",
    desc: "Show bot owner details",
    react: "💀",
    category: "system",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        let caption = `
┏━┫ *⚬ NIKA MINI ⚬* ┣━✾
┃
┣━━━━━━━━━━━━━━━
- *Sayura* 💀⃤
  wa.me/94743826406
╰━━━━━━━━━━━━━━━
> NIKA-MINI
        `;

        await conn.sendMessage(from, {
            image: { 
                url: "https://raw.githubusercontent.com/Sayurami/Poto-upload-/refs/heads/main/file_00000000022461faa976f5570799fae2.png"
            },
            caption,
            contextInfo: {
                mentionedJid: ['94743826406@s.whatsapp.net'],
                externalAdReply: {
                    title: 'NIKA MINI',
                    body: 'Sayura Mihiranga',
                    thumbnailUrl: "https://raw.githubusercontent.com/Sayurami/Poto-upload-/refs/heads/main/file_00000000022461faa976f5570799fae2.png",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: mek });

    } catch (e) {
        reply("❌ Error in owner plugin: " + e.message);
    }
});
