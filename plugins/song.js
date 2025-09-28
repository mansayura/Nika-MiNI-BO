const { cmd } = require('../lib/command');
const ytdl = require('ytdl-core');
const yts = require('youtube-yts'); // search support
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "song",
    category: "downloader",
    react: "🎶",
    desc: "Download YouTube audio as MP3 (URL or search)",
    filename: __filename
}, async (conn, mek, m, {from, q, reply}) => {
    try {
        if (!q) return reply('Please provide a YouTube URL or search query.');

        let url, info;

        // Check if input is URL
        if (ytdl.validateURL(q)) {
            url = q;
            info = await ytdl.getInfo(url);
        } else {
            // Search first result
            const searchResults = await yts.search(q);
            if (!searchResults || !searchResults.items.length) return reply('No results found.');
            url = searchResults.items[0].url;
            info = await ytdl.getInfo(url);
        }

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
