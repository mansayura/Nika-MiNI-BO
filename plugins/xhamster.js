const { cmd } = require('../lib/command');
const { fetchJson } = require('../lib/functions');

// API Links
const searchApi = 'https://api-dark-shan-yt.koyeb.app/search/xhamster';
const downloadApi = 'https://api-dark-shan-yt.koyeb.app/download/xhamaster';

function _truncateTitle(title, maxLength) {
    return title.length > maxLength ? title.substring(0, maxLength - 3) + '...' : title;
}

cmd({
    pattern: "xhamster",
    alias: ["xhdl", "xh3"],
    react: "🔞",
    desc: "Search and download videos from Xhamster.com",
    category: "nfsw",
    use: '.xhamster <search query>',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("*කරුණාකර සෙවුම් වදන් ලබා දෙන්න!*");

        const searchUrl = `${searchApi}?q=${encodeURIComponent(q)}&apikey=deb4e2d4982c6bc2`;
        const response = await fetchJson(searchUrl);

        if (!response?.data || !Array.isArray(response.data)) {
            return reply("*NOT FOUND!*");
        }

        const videos = response.data.filter(v => v.link && v.title).slice(0, 10);
        if (videos.length === 0) return reply("*NOT FOUND!*");

        let listText = `🔞 *XHAMSTER RESULTS* 🔞\n\n`;
        listText += `📌 *Search:* ${q}\n━━━━━━━━━━━━━━━━\n`;
        listText += `📥 Reply with a number (1-${videos.length}) to download\n━━━━━━━━━━━━━━━━\n`;

        videos.forEach((v, i) => {
            listText += `${i + 1} ➤ 🎬 ${_truncateTitle(v.title, 60)}\n`;
        });

        const sentMsg = await conn.sendMessage(from, {
            image: { url: videos[0].thumbnail },
            caption: listText
        }, { quoted: mek });

        // Cache
        let cache = {
            step: "video",
            videos,
            msgID: sentMsg.key.id
        };

        conn.ev.on('messages.upsert', async function handler(update) {
            const msg = update.messages[0];
            if (!msg.message) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const replyTo = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

            // --- First Reply (Choose video)
            if (cache.step === "video" && replyTo === cache.msgID) {
                const index = parseInt(text) - 1;
                if (isNaN(index) || index < 0 || index >= cache.videos.length) {
                    return conn.sendMessage(from, { text: `*වැරදි අංකයක්! 1-${cache.videos.length} අතර තෝරන්න.*` }, { quoted: msg });
                }

                const selected = cache.videos[index];
                const dlUrl = `${downloadApi}?url=${encodeURIComponent(selected.link)}&apikey=deb4e2d4982c6bc2`;
                const dlRes = await fetchJson(dlUrl);

                const resolutions = dlRes?.data?.filter(r => r.link_type === 0 && r.file_type === 'mp4');
                if (!resolutions || resolutions.length === 0) {
                    return reply("*Resolution හමුවුණේ නැහැ!*");
                }

                let resText = `🎞️ *DOWNLOAD OPTIONS*\n\n`;
                resText += `🎥 *Title:* ${selected.title}\n⏱️ Duration: ${selected.duration || "Unknown"}\n👤 Uploader: ${selected.owner || "Unknown"}\n\n`;
                resText += `📥 Reply with a number (1-${resolutions.length}) to choose resolution\n━━━━━━━━━━━━━━━━\n`;

                resolutions.forEach((r, i) => {
                    resText += `${i + 1}. ${r.file_quality}p • MP4\n`;
                });

                const resMsg = await conn.sendMessage(from, {
                    image: { url: selected.thumbnail },
                    caption: resText
                }, { quoted: msg });

                // Update cache
                cache.step = "resolution";
                cache.msgID = resMsg.key.id;
                cache.resolutions = resolutions;
                return;
            }

            // --- Second Reply (Choose resolution)
            if (cache.step === "resolution" && replyTo === cache.msgID) {
                const resIndex = parseInt(text) - 1;
                if (isNaN(resIndex) || resIndex < 0 || resIndex >= cache.resolutions.length) {
                    return conn.sendMessage(from, { text: `*වැරදි අංකයක්! 1-${cache.resolutions.length} අතර තෝරන්න.*` }, { quoted: msg });
                }

                const selectedRes = cache.resolutions[resIndex];
                await conn.sendMessage(from, {
                    video: { url: selectedRes.link_url },
                    mimetype: "video/mp4",
                    caption: `✅ *Download Complete!*\n📺 Resolution: ${selectedRes.file_quality}p\n📁 Format: MP4\n\n> 𝐏𝐎𝐖𝐄𝐑𝐃 𝐁𝐘 𝐍𝐈𝐊𝐀 𝐌𝐈𝐍𝐈💀`
                }, { quoted: msg });

                // Remove handler after done
                conn.ev.off('messages.upsert', handler);
            }
        });

    } catch (e) {
        console.error(e);
        reply("❌ Error: " + e.message);
    }
});
