const { cmd } = require('../lib/command');
const axios = require("axios");
const yts = require("yt-search");

cmd({
    pattern: "song",
    alias: ["play"],
    desc: "Download songs from YouTube.",
    react: "🎵",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("❌ *Please provide a YouTube link or search query!*");

        let ytUrl;
        if (q.includes("youtube.com") || q.includes("youtu.be")) {
            ytUrl = q;
        } else {
            await reply("🔎 *Searching on YouTube...*");
            const search = await yts(q);
            if (!search.videos || search.videos.length === 0) {
                return reply("❌ *No results found!*");
            }
            ytUrl = search.videos[0].url;
        }

        await reply("⏳ *Fetching song data...*");

        const apiBase = "https://www.laksidunimsara.com/song";
        const apiKey = "Lk8*Vf3!sA1pZ6Hd"; // api key එක
        const apiUrl = `${apiBase}?url=${encodeURIComponent(ytUrl)}&api_key=${encodeURIComponent(apiKey)}`;

        let response;
        try {
            response = await axios.get(apiUrl);
        } catch (err) {
            console.error("🚨 API request failed:", err);
            return reply("❌ *Failed to contact the song API.*");
        }

        if (!response.data || response.data.status !== "success") {
            console.log("API RESPONSE:", response.data);
            return reply("❌ *Invalid API response.*");
        }

        const video = response.data.video;
        const downloadUrl = response.data.download;

        let caption = `
╭───≽🎶 *Song Downloader* 🎶
│
├─ 🎧 *Title:* ${video.title}
├─ ⏱ *Duration:* ${video.duration}
├─ 👤 *Author:* ${video.author}
│
╰───≽ 🔻 *Choose a download option* 🔻

  1️⃣ Audio (Play)
  2️⃣ Document (File)
  3️⃣ Voice Note (PTT)

💡 *Reply with 1 / 2 / 3*
──────────────
✨ Powered By *NIKA MINI 🌐*
        `;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: caption
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        conn.ev.on('messages.upsert', async (messageUpdate) => {
            const mek2 = messageUpdate.messages[0];
            if (!mek2.message) return;
            const textMsg = mek2.message.conversation || mek2.message.extendedTextMessage?.text;
            const fromReply = mek2.key.remoteJid;

            const isReplyToSentMsg = mek2.message.extendedTextMessage &&
                mek2.message.extendedTextMessage.contextInfo?.stanzaId === messageID;

            if (!isReplyToSentMsg) return;

            if (["1", "2", "3"].includes(textMsg)) {
                await conn.sendMessage(fromReply, { react: { text: '⬇️', key: mek2.key } });

                if (textMsg === "1") {
                    await conn.sendMessage(fromReply, {
                        audio: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        ptt: false
                    }, { quoted: mek2 });

                } else if (textMsg === "2") {
                    await conn.sendMessage(fromReply, {
                        document: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        fileName: `${video.title}.mp3`,
                        caption: `📥 Downloaded Successfully! ✅`
                    }, { quoted: mek2 });

                } else if (textMsg === "3") {
                    await conn.sendMessage(fromReply, {
                        audio: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        ptt: true
                    }, { quoted: mek2 });
                }

                await conn.sendMessage(fromReply, { react: { text: '✅', key: mek2.key } });
            }
        });

    } catch (e) {
        console.log("🚨 ERROR DETAILS:", e);
        reply("❌ *An error occurred while processing your request.*");
    }
});
