const { cmd } = require('../lib/command');
const { ytsearch } = require('@dark-yasiya/yt-dl.js');
const fetch = require('node-fetch');

cmd({
  pattern: "song",
  react: "🎧",
  desc: "Download YouTube song",
  category: "download",
  use: ".song <YouTube URL or Name>",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) return reply("🎵 *Please provide a YouTube link or song name.*");

    const isYouTubeURL = q.includes("youtube.com") || q.includes("youtu.be");
    let song;

    if (isYouTubeURL) {
      song = {
        url: q,
        title: "YouTube Audio",
        timestamp: "Unknown",
        author: { name: "Unknown" },
        thumbnail: "https://i.ytimg.com/vi_webp/dQw4w9WgXcQ/maxresdefault.webp"
      };
    } else {
      const yt = await ytsearch(q);
      if (!yt.results || yt.results.length === 0) return reply("❌ *No results found!*");
      song = yt.results[0];
    }

    const { url, thumbnail: thumb } = song;

    const caption = `
🎧 *Title:* ${song.title}
⏱ *Duration:* ${song.timestamp}
👤 *Author:* ${song.author.name}
🔗 *URL:* ${url}

📥 * NIKA MINI Choose format to download:*
1. 🎶 Audio (music)
2. 📂 Document (mp3 file)
3. 💫 Voice Note (ptt)

 _Reply with the number 1, 2, or 3 to proceed._`;

    const sent = await conn.sendMessage(from, {
      image: { url: thumb },
      caption
    }, { quoted: mek });

    const messageId = sent.key.id;

    // User-specific listener
    const listener = async (msgUpdate) => {
      try {
        const msg = msgUpdate.messages[0];
        if (!msg.message?.extendedTextMessage || msg.key.fromMe) return;

        const repliedTo = msg.message.extendedTextMessage.contextInfo?.stanzaId;
        if (repliedTo !== messageId) return;
        if (msg.key.participant && msg.key.participant !== from) return; // Only same user

        const selected = msg.message.extendedTextMessage.text.trim();

        // React 📥
        await conn.sendMessage(from, { react: { text: "📥", key: msg.key } });

        // Fetch mp3 download URL
        const res = await fetch(`https://apis.davidcyriltech.my.id/youtube/mp3?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (!data?.result?.downloadUrl) {
          return conn.sendMessage(from, {
            text: "❌ *Failed to fetch download link.*"
          }, { quoted: msg });
        }

        const dl = data.result.downloadUrl;
        const safeName = song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";

        if (selected === "1") {
          await conn.sendMessage(from, {
            audio: { url: dl },
            mimetype: 'audio/mpeg'
          }, { quoted: msg });

        } else if (selected === "2") {
          await conn.sendMessage(from, {
            document: { url: dl },
            mimetype: 'audio/mpeg',
            fileName: safeName
          }, { quoted: msg });

        } else if (selected === "3") {
          await conn.sendMessage(from, {
            audio: { url: dl },
            mimetype: 'audio/mpeg',
            ptt: true
          }, { quoted: msg });

        } else {
          await conn.sendMessage(from, {
            text: "❌ *Invalid option. Please reply with 1, 2, or 3.*"
          }, { quoted: msg });
          return;
        }

        // React ✅
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

        // Remove listener after successful download
        conn.ev.off('messages.upsert', listener);

      } catch (err) {
        console.error("❌ Listener Error:", err);
        reply("⚠️ *Something went wrong while sending the song.*");
        conn.ev.off('messages.upsert', listener);
      }
    };

    conn.ev.on('messages.upsert', listener);

    // Cleanup after 5 minutes in case user never replies
    setTimeout(() => conn.ev.off('messages.upsert', listener), 300000);

  } catch (e) {
    console.error("❌ Main Error:", e);
    reply("❌ *An error occurred. Please try again.*");
  }
});
