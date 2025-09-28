const { cmd, commands } = require('../lib/command');
const axios = require("axios");
const yts = require("yt-search"); 

cmd({
    pattern: "song",
    alias: ["play"],
    desc: "Download songs from YouTube.",
    react: "🎵",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply }) => {
    try {
        if (!q) return reply("❌ Please provide a YouTube link or search query!");

        let ytUrl;
        if (q.includes("youtube.com") || q.includes("youtu.be")) {
            ytUrl = q;
        } else {
            reply("🔎 Searching YouTube...");
            const search = await yts(q);
            if (!search.videos || search.videos.length === 0) {
                return reply("❌ No results found!");
            }
            ytUrl = search.videos[0].url;
        }

        reply("⏳ Fetching song...");

        const apiBase = "https://www.laksidunimsara.com/song";
        const apiKey = "Lk8*Vf3!sA1pZ6Hd"; // api key එක බන්
        const apiUrl = `${apiBase}?url=${encodeURIComponent(ytUrl)}&api_key=${encodeURIComponent(apiKey)}`;

        let response;
        try {
            response = await axios.get(apiUrl);
        } catch (err) {
            console.error("🚨 API request failed:", err);
            return reply("❌ Failed to contact song API.");
        }

        if (!response.data || response.data.status !== "success") {
            console.log("API RESPONSE:", response.data);
            return reply("❌ API did not return a valid response.");
        }

        const video = response.data.video;
        const downloadUrl = response.data.download;

        let desc = `
╔═════✦⭒❖⭒✦═════╗
  🎶 *𝐒𝐎𝐍𝐆 𝐃𝐎𝐖𝐍𝐋𝐎𝐃𝐄* 🎶
╚═════✦⭒❖⭒✦═════╝

➤ 🎧 *Title:* ${video.title}
➤ ⏱️ *Duration:* ${video.duration}
➤ 📅 *Uploaded:* ${video.author}

╔═════✦⭒❖⭒✦═════╗
   ⬇️ *DOWNLOAD OPTIONS* ⬇️
╚═════✦⭒❖⭒✦═════╝

│ ① 🎵 *Audio*          
│ ② 📄 *Document*       
│ ③ 🎙️ *Voice Note*     

Reply number 1️⃣2️⃣⬆️

> POWERD BY*NIKA MINI 🌐*
`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: desc
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
                        caption: `🎵 Downloaded 𝐒ᴜʟᴀ....!"🫟`
                    }, { quoted: mek2 });

                } else if (textMsg === "3") { 
                    await conn.sendMessage(fromReply, {
                        audio: { url: downloadUrl },
                        mimetype: "audio/mpeg",
                        ptt: true
                    }, { quoted: mek2 });
                }

                await conn.sendMessage(fromReply, { react: { text: '⬆️', key: mek2.key } });
            }
        });

    } catch (e) {
        console.log("🚨 ERROR DETAILS:", e);  //ටහුකන්න ගස් මෝල් ගොන් කැරියා
        reply("❌ An error occurred while processing your request.");
    }
});
