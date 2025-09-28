const { cmd } = require('../lib/command');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

async function searchYouTube(query) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const text = await res.text();

    // Extract videoId using regex
    const match = text.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!match) throw new Error('No video found for your query.');
    return `https://www.youtube.com/watch?v=${match[1]}`;
}

cmd({
    pattern: "song",
    category: "downloader",
    react: "🎶",
    desc: "Download YouTube audio as MP3 (URL or search query)",
    filename: __filename
}, async (conn, mek, m, {from, q, reply}) => {
    try {
        if (!q) return reply('Please provide a YouTube URL or search query.');

        // Determine if input is URL or search query
        let url;
        if (ytdl.validateURL(q)) {
            url = q;
        } else {
            url = await searchYouTube(q);
        }

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[\\/:*?"<>|]/g, '');
        const thumbnail = info.videoDetails.thumbnails.slice(-1)[0].url;
        const tmpPath = path.join(__dirname, `${Date.now()}.mp3`);

        // Send thumbnail + info
        const infoMessage = `
🎶 𝐍𝐈𝐊𝐀 𝐌𝐈𝐍𝐈 𝐘𝐓 𝐀𝐔𝐃𝐈𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 📥

╭━━━━━━━━━●●►
┢❑ 𝐓𝐢𝐭𝐥𝐞: ${info.videoDetails.title}
┢❑ 𝐀𝐮𝐭𝐡𝐨𝐫: ${info.videoDetails.author.name}
┢❑ 𝐃𝐮𝐫𝐚𝐭𝐢𝐨𝐧: ${info.videoDetails.lengthSeconds}s
╰━━━━━━━━●●►
        `;
        await conn.sendMessage(from, { image: { url: thumbnail }, caption: infoMessage });

        // Download + convert to MP3
        const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

        await new Promise((resolve, reject) => {
            ffmpeg(stream)
                .audioBitrate(128)
                .toFormat('mp3')
                .save(tmpPath)
                .on('end', resolve)
                .on('error', reject);
        });

        // Send MP3 document
        await conn.sendMessage(from, {
            document: { url: 'file://' + tmpPath },
            mimetype: 'audio/mp3',
            fileName: `${title}.mp3`,
            caption: `🎵 ${info.videoDetails.title}`
        });

        // React ✅
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });

        // Delete temp file
        fs.unlinkSync(tmpPath);

    } catch (e) {
        console.error(e);
        await reply(`📕 An error occurred: ${e.message}`);
    }
});
