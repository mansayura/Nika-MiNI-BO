const { cmd } = require('../lib/command');
const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache (5-minute TTL)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Axios instance with timeout
const axiosInstance = axios.create({
  timeout: 15000
});

const theme = {
  header: `*NIKA MD PIRATE MOVIE DOWNLOADER* \n\n`,
  footer: `>𝐩𝐨𝐰𝐞𝐫𝐝 𝐛𝐲 𝐧𝐢𝐤𝐚 𝐦𝐢𝐧𝐢 𝐛𝐨𝐭`,
  emojis: {
    search: "🔍",
    movie: "🎬",
    uploading: "📤",
    success: "✅",
    error: "❌",
    info: "ℹ️"
  }
};

cmd({
  pattern: 'pirate',
  desc: 'Search & download Pirate Movie Sinhala Sub',
  category: 'movie',
  use: '.pirate Avengers',
  filename: __filename
}, async (conn, mek, m, { args, from, reply }) => {
  try {
    const query = args.join(' ');
    if (!query) {
      await reply(`${theme.header}${theme.emojis.info} Search keyword දාන්න.\n\nUse: .pirate movie name\n${theme.footer}`);
      return;
    }

    await conn.sendMessage(from, { react: { text: theme.emojis.search, key: mek.key } });

    // Search API
    const searchUrl = `https://pirate-movie-sula.vercel.app/api/pirate/search?q=${encodeURIComponent(query)}`;
    const res = await axiosInstance.get(searchUrl);
    const results = res.data?.results;

    if (!results || !Array.isArray(results) || results.length === 0) {
      await reply(`${theme.header}${theme.emojis.error} No movies found for "${query}".\n${theme.footer}`);
      return;
    }

    // Cache results
    const cacheKey = `pirate_${from}_${Date.now()}`;
    searchCache.set(cacheKey, results);

    // Format movie list
    let msg = `${theme.header}${theme.emojis.movie} Found ${results.length} movies for "${query}":\n\n`;
    const movies = results.map((movie, i) => ({
      number: i + 1,
      title: movie.title,
      year: movie.year || 'N/A',
      url: movie.url
    }));

    movies.forEach(movie => {
      msg += `${theme.emojis.movie} *${movie.number}.* ${movie.title} (${movie.year})\n`;
    });
    msg += `\n${theme.emojis.info} Reply with the number to download\n${theme.emojis.info} Reply 'done' to stop\n${theme.footer}`;

    await conn.sendMessage(from, { react: { text: theme.emojis.movie, key: mek.key } });

    // Send movie list message
    const movieListMessage = await conn.sendMessage(from, { text: msg }, { quoted: mek });
    const movieListMessageKey = movieListMessage.key;

    // Track selections with a Map
    const selectionMap = new Map();

    // Handle movie selection with a single listener
    const selectionHandler = async (update) => {
      try {
        const message = update.messages[0];
        if (!message.message || message.key.fromMe || message.key.remoteJid !== from || message.key.participant !== m.sender) return;

        // Get reply text
        const replyText = message.message.conversation ||
                         (message.message.extendedTextMessage && message.message.extendedTextMessage.text) || '';
        if (!replyText) return;

        // Exit condition
        if (replyText.trim().toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', selectionHandler);
          selectionMap.clear();
          searchCache.del(cacheKey);
          await conn.sendMessage(from, {
            text: `${theme.header}${theme.emojis.info} Movie search ended.\nThank you for using SULA MD!\n${theme.footer}`,
          }, { quoted: message });
          return;
        }

        // Check if this is a reply to the movie list
        const contextInfo = message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo;
        const repliedToId = contextInfo && contextInfo.stanzaId ? contextInfo.stanzaId : null;
        if (!repliedToId || repliedToId !== movieListMessageKey.id) return;

        // Movie selection
        const selectedNumber = parseInt(replyText.trim());
        const selectedMovie = movies.find(movie => movie.number === selectedNumber);

        if (!selectedMovie) {
          await conn.sendMessage(from, {
            text: `${theme.header}${theme.emojis.error} Invalid selection.\nPlease reply with a valid movie number.\n${theme.footer}`,
          }, { quoted: message });
          return;
        }

        await conn.sendMessage(from, { react: { text: theme.emojis.uploading, key: message.key } });

        // Get download link
        let downloadLink;
        try {
          const dlUrl = `https://pirate-movie-sula.vercel.app/api/pirate/dl?url=${encodeURIComponent(selectedMovie.url)}`;
          const dlRes = await axiosInstance.get(dlUrl);
          downloadLink = dlRes.data?.download;
          if (!downloadLink) {
            throw new Error('Download link not found');
          }
        } catch (err) {
          await conn.sendMessage(from, {
            text: `${theme.header}${theme.emojis.error} Failed to fetch download link: ${err.message}\nPlease try another movie.\n${theme.footer}`,
          }, { quoted: message });
          await conn.sendMessage(from, { react: { text: theme.emojis.error, key: message.key } });
          return;
        }

        // Send as document/video
        try {
          await conn.sendMessage(from, {
            document: { url: downloadLink },
            mimetype: 'video/mp4',
            fileName: `${selectedMovie.title}.mp4`,
            caption: `${theme.header}${theme.emojis.movie} ${selectedMovie.title}\n${theme.emojis.year} Year: ${selectedMovie.year}\n${theme.footer}`
          }, { quoted: message });

          await conn.sendMessage(from, { react: { text: theme.emojis.success, key: message.key } });
        } catch (err) {
          await conn.sendMessage(from, {
            text: `${theme.header}${theme.emojis.error} Error sending movie: ${err.message}\nDirect Download Link: ${downloadLink}\n${theme.footer}`,
          }, { quoted: message });
          await conn.sendMessage(from, { react: { text: theme.emojis.error, key: message.key } });
          return;
        }

        // Clear session after successful download
        conn.ev.off('messages.upsert', selectionHandler);
        selectionMap.clear();
        searchCache.del(cacheKey);

      } catch (err) {
        console.error('Error in selectionHandler:', err);
      }
    };

    // Register the listener
    conn.ev.on('messages.upsert', selectionHandler);

    // Set a timeout to clear the handler after 10 minutes
    setTimeout(() => {
      conn.ev.off('messages.upsert', selectionHandler);
      selectionMap.clear();
      searchCache.del(cacheKey);
    }, 10 * 60 * 1000);

  } catch (err) {
    console.error('Error in pirate command:', err);
    await reply(`${theme.header}${theme.emojis.error} Error: ${err.message}\nPlease try again later.\n${theme.footer}`);
    await conn.sendMessage(from, { react: { text: theme.emojis.error, key: mek.key } });
  }
});
