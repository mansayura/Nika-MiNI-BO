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
},
async (conn, mek, m, { from, quoted, q, reply }) => {
    try {
        if (!q) return await reply("*කරුණාකර සෙවුම් වදන් ලබා දෙන්න!*");

        const searchUrl = `${searchApi}?q=${encodeURIComponent(q)}&apikey=deb4e2d4982c6bc2`;
        const response = await fetchJson(searchUrl);

        if (!response?.data || !Array.isArray(response.data)) {
            return await reply("*NOT FOUND!*");
        }

        const validVideos = response.data.filter(video => video.link && video.title);
        if (validVideos.length === 0) return await reply("*NOT FOUND!*");

        const videos = validVideos.slice(0, 50);

        let listText = `🔞 *NIKA-MINI XHAMSTER VIDEO RESULTS* 🔞\n\n`;
        listText += `📌 *Search:* ${q}\n`;
        listText += `━━━━━━━━━━━━━━━━\n`;
        listText += `📥 Reply with a number (1-${videos.length}) to download\n`;
        listText += `━━━━━━━━━━━━━━━━\n`;

        videos.forEach((v, i) => {
            listText += `${i + 1}➤ 🎬 ${_truncateTitle(v.title, 60)}\n`;
        });

        listText += `\n>  𝐏𝐎𝐖𝐄𝐑𝐃 𝐁𝐘 𝐍𝐈𝐊𝐀 𝐌𝐈𝐍𝐈💀`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: videos[0].thumbnail || 'https://i.ibb.co/TMtCcL0z/SulaMd.jpg' },
            caption: listText,
        }, { quoted: mek });

        const cache = {
            messageID: sentMsg.key.id,
            videos,
            from
        };

        conn.ev.on('messages.upsert', async function onListReply(messageUpdate) {
            const replyMek = messageUpdate.messages[0];
            if (!replyMek.message) return;

            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === cache.messageID;

            if (isReplyToSentMsg) {
                conn.ev.off('messages.upsert', onListReply);

                const index = parseInt(messageType) - 1;
                if (isNaN(index) || index < 0 || index >= cache.videos.length) {
                    return await conn.sendMessage(from, { text: "*වැරදි අංකයක්! 1-50 අතර තෝරන්න.*" }, { quoted: replyMek });
                }

                const selectedVideo = cache.videos[index];
                const downloadUrl = `${downloadApi}?url=${encodeURIComponent(selectedVideo.link)}&apikey=deb4e2d4982c6bc2`;
                const downloadInfo = await fetchJson(downloadUrl);

                if (!Array.isArray(downloadInfo?.data)) {
                    return await reply("*බාගත කිරීමට අපොහොසත් වුණා!*");
                }

                const resolutions = downloadInfo.data.filter(f => f['link_type'] === 0 && f['file_type'] === 'mp4');
                if (resolutions.length === 0) {
                    return await reply("*බාගත කළ හැකි resolution හමුවුණේ නැහැ!*");
                }

                let resText = `🎞️ *DOWNLOAD OPTIONS*\n\n`;
                resText += `➤ 🎥  *Title:* ${selectedVideo.title}\n\n`;
                resText += `➤ ⏱️ *Duration:* ${selectedVideo.duration || "Unknown"}\n`;
                resText += `➤ 👤 *Uploader:* ${selectedVideo.owner || "Unknown"}\n`;
                resText += `━━━━━━━━━━━━━━━━\n`;
                resText += `📥 Reply with a number (1-${resolutions.length}) to choose resolution\n`;

                resolutions.forEach((res, i) => {
                    resText += `${i + 1}. ${res.file_quality}p • ${res.file_type.toUpperCase()}\n`;
                });

                const resMsg = await conn.sendMessage(from, {
                    image: { url: selectedVideo.thumbnail || 'https://i.ibb.co/TMtCcL0z/SulaMd.jpg' },
                    caption: resText,
                }, { quoted: replyMek });

                cache.resMsgID = resMsg.key.id;
                cache.resolutions = resolutions;

                conn.ev.on('messages.upsert', async function onResReply(resUpdate) {
                    const resMek = resUpdate.messages[0];
                    if (!resMek.message) return;

                    const resChoice = resMek.message.conversation || resMek.message.extendedTextMessage?.text;
                    const isReplyToResMsg = resMek.message.extendedTextMessage?.contextInfo?.stanzaId === cache.resMsgID;

                    if (isReplyToResMsg) {
                        conn.ev.off('messages.upsert', onResReply);

                        const resIndex = parseInt(resChoice) - 1;
                        if (isNaN(resIndex) || resIndex < 0 || resIndex >= cache.resolutions.length) {
                            return await conn.sendMessage(from, { text: `*වැරදි අංකයක්! 1-${cache.resolutions.length} අතර තෝරන්න.*` }, { quoted: resMek });
                        }

                        const selectedRes = cache.resolutions[resIndex];

                        await conn.sendMessage(from, {
                            video: { url: selectedRes.link_url },
                            mimetype: "video/mp4",
                            caption: `✅ *Download Complete!*\n📺 Resolution: ${selectedRes.file_quality}p\n📁 Format: ${selectedRes.file_type.toUpperCase()}\n\n> 𝐏𝐎𝐖𝐄𝐑𝐃 𝐁𝐘 𝐍𝐈𝐊𝐀 𝐌𝐈𝐍𝐈💀`
                        }, { quoted: resMek });
                    }
                });
            }
        });

    } catch (err) {
        console.error('Error:', err);
        await reply(`*දෝෂයක් ඇති වුණා:* ${err.message || 'Unknown error'}`);
    }
});
