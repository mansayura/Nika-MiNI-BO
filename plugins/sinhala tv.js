const { cmd, commands } = require('../lib/command');
const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize cache (5-minute TTL)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Axios instance with browser-like headers
const axiosInstance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json,image/*',
    'Referer': 'https://cinesubz.co/',
    'Accept-Encoding': 'gzip, deflate, br'
  },
  timeout: 15000
});

// Helper function to validate image URLs
async function isValidImageUrl(url) {
  try {
    const response = await axiosInstance.head(url, { timeout: 5000 });
    return response.headers['content-type'].startsWith('image/') && response.status === 200;
  } catch (error) {
    console.error(`Image URL validation failed for ${url}: ${error.message}`);
    return false;
  }
}

// Helper function to download image and convert to base64
async function getImageBase64(url) {
  try {
    const response = await axiosInstance.get(url, { responseType: 'arraybuffer', timeout: 5000 });
    if (!response.headers['content-type'].startsWith('image/')) return null;
    return Buffer.from(response.data).toString('base64');
  } catch (error) {
    console.error(`Failed to download image ${url}: ${error.message}`);
    return null;
  }
}

// FROZEN-QUEEN Theme Configuration
const frozenQueenTheme = {
  header: `*SULA-MD SINHALASUB DOWNLOADER. 🎬* \n\n`,
  footer: `> 𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 𝐒𝚄𝙻𝙰 𝐌𝙳`,
  emojis: {
    search: "🔍",
    result: "🎞️",
    quality: "🏮",
    success: "🎬",
    uploading: "📤",
    error: "❌",
    info: "ℹ️",
    movie: "🎬",
    size: "🎐",
    date: "📅"
  },
  getForwardProps: function () {
    return {
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwarderJid: "120363385281017920@newsletter",
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363385281017920@newsletter",
          newsletterName: "𝐒𝐔𝐋𝐀-𝐌𝐃",
          newsletterLink: "https://whatsapp.com/channel/0029Vb65iOZKwqSNKecV8V07",
          newsletterSenderId: "𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 𝐒𝚄𝙻𝙰 𝐌𝙳",
          serverMessageId: Math.floor(Math.random() * 1000000000) + 1000000000,
          contentType: 1,
        },
        participant: "120363385281017920@newsletter",
        stanzaId: "BAE5" + Math.random().toString(16).substr(2, 12).toUpperCase(),
        mentionedJid: [],
        conversionData: {
          conversionDelaySeconds: 0,
          conversionSource: "newsletter_channel",
          conversionType: "newsletter",
        },
      },
    };
  }
};


// Movie search and download command
cmd({
  pattern: "film",
  react: "🎬",
  desc: "Search and download movies with Sinhala subtitles",
  category: "movie",
  use: ".film <group_jid>,<movie_name>",
  filename: __filename,
}, async (conn, mek, m, { from, q }) => {
  try {
    // Parse input
    let targetGroupJid = null;
    let movieQuery = q;
    if (q && q.includes(',')) {
      const parts = q.split(',');
      const potentialJid = parts[0].trim();
      if (potentialJid.includes('@g.us')) {
        targetGroupJid = potentialJid;
        movieQuery = parts.slice(1).join(',').trim();
      }
    }

    if (!movieQuery) {
      await conn.sendMessage(from, {
        text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.info} *Please provide a movie name.*\nExample: .film 1234567890@g.us,Deadpool\n${frozenQueenTheme.footer}`,
        ...frozenQueenTheme.getForwardProps()
      }, { quoted: mek });
      return;
    }

    // Show searching reaction
    await conn.sendMessage(from, { react: { text: frozenQueenTheme.emojis.search, key: mek.key } });

    // Check cache
    const cacheKey = `film_search_${movieQuery.toLowerCase()}`;
    let searchData = searchCache.get(cacheKey);

    if (!searchData) {
      // Search movies using API
      const searchUrl = `https://suhas-mvdl-new-eka.vercel.app/api/sinhalasub/movie/search?q=${encodeURIComponent(movieQuery)}`;
      const searchResponse = await axiosInstance.get(searchUrl);
      searchData = searchResponse.data;
      if (!searchData || searchData.length === 0) {
        throw new Error(`No movies found for "${movieQuery}"`);
      }
      searchCache.set(cacheKey, searchData);
    }

    // Format movie list
    const movies = searchData.map((film, index) => ({
      number: index + 1,
      title: film.title.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim(),
      link: film.link,
      img: film.img,
      year: film.year,
      rating: film.rating
    }));

    let resultsMessage = `${frozenQueenTheme.header}${frozenQueenTheme.emojis.movie} *Found ${movies.length} results for "${movieQuery}":*\n\n`;
    movies.forEach(movie => {
      resultsMessage += `${frozenQueenTheme.emojis.result} *${movie.number}.* ${movie.title} (${movie.year}) 🔮 ${movie.rating}\n`;
    });
    resultsMessage += `\n${frozenQueenTheme.emojis.info} *Reply with the number to select a movie*\n${frozenQueenTheme.emojis.info} Reply 'done' to stop\n${frozenQueenTheme.footer}`;

    // Send movie list
    const movieListMessage = await conn.sendMessage(from, {
      text: resultsMessage,
      ...frozenQueenTheme.getForwardProps()
    }, { quoted: mek });

    // Handle selections
    const downloadOptionsMap = new Map();
    const selectionHandler = async (update) => {
      try {
        const message = update.messages[0];
        if (!message.message) return;
        const replyText = message.message.conversation || (message.message.extendedTextMessage && message.message.extendedTextMessage.text) || "";
        
        if (replyText.trim().toLowerCase() === "done") {
          conn.ev.off("messages.upsert", selectionHandler);
          downloadOptionsMap.clear();
          await conn.sendMessage(from, {
            text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.info} *Movie search ended.*\n${frozenQueenTheme.footer}`,
            ...frozenQueenTheme.getForwardProps()
          }, { quoted: message });
          return;
        }

        const contextInfo = message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo;
        const repliedToId = contextInfo && contextInfo.stanzaId ? contextInfo.stanzaId : null;
        if (!repliedToId) return;

        // Movie selection
        if (repliedToId === movieListMessage.key.id) {
          const selectedNumber = parseInt(replyText);
          const selectedMovie = movies.find(movie => movie.number === selectedNumber);
          if (!selectedMovie) {
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.error} *Invalid selection.*\nPlease reply with a valid movie number.\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
            return;
          }

          // Fetch movie details
          const movieUrl = `https://suhas-mvdl-new-eka.vercel.app/api/sinhalasub/movie/info?url=${encodeURIComponent(selectedMovie.link)}`;
          const movieResponse = await axiosInstance.get(movieUrl);
          const movieData = movieResponse.data;

          if (!movieData || !movieData.downloadLinks || movieData.downloadLinks.length === 0) {
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.error} *No download links available.*\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
            return;
          }

          // Format movie details
          const movieDetails = {
            title: movieData.title ? movieData.title.replace("Sinhala Subtitles | සිංහල උපසිරැසි සමඟ", "").trim() : selectedMovie.title,
            image: movieData.image || selectedMovie.img,
            releaseDate: movieData.releaseDate || selectedMovie.year,
            runtime: movieData.runtime || "N/A",
            country: movieData.country || "N/A",
            description: movieData.description || "No description available.",
            downloadLinks: movieData.downloadLinks.map((link, index) => ({
              number: index + 1,
              quality: link.quality,
              size: link.size,
              link: link.link
            }))
          };

          // Validate image
          let movieImage = movieDetails.image;
          if (movieImage && !(await isValidImageUrl(movieImage))) {
            movieImage = null;
          }

          // Send movie details to target group
          let groupDetailMessage = `${frozenQueenTheme.header}${frozenQueenTheme.emojis.movie} *${movieDetails.title}*\n\n`;
          groupDetailMessage += `${frozenQueenTheme.emojis.date} *Release:* ${movieDetails.releaseDate}\n`;
          groupDetailMessage += `⏱️ *Runtime:* ${movieDetails.runtime}\n`;
          groupDetailMessage += `🌍 *Country:* ${movieDetails.country}\n\n`;
          groupDetailMessage += `📝 *Description:*\n${movieDetails.description}\n\n`;
          groupDetailMessage += `${frozenQueenTheme.emojis.info} *Movie is uploading...*\n${frozenQueenTheme.footer}`;

          if (targetGroupJid) {
            await conn.sendMessage(targetGroupJid, {
              ...(movieImage && { image: { url: movieImage }, caption: groupDetailMessage }),
              ...(!movieImage && { text: groupDetailMessage }),
              ...frozenQueenTheme.getForwardProps()
            });
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.info} *Movie details sent to target group.*\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
          }

          // Send quality options
          let qualityMessage = `${frozenQueenTheme.header}${frozenQueenTheme.emojis.movie} *${movieDetails.title}*\n\n`;
          qualityMessage += `${frozenQueenTheme.emojis.quality} *Available Qualities:*\n\n`;
          movieDetails.downloadLinks.forEach(link => {
            qualityMessage += `${frozenQueenTheme.emojis.result} *${link.number}.* ${link.quality} (${link.size})\n`;
          });
          qualityMessage += `\n${frozenQueenTheme.emojis.info} *Reply with the number to download*\n${frozenQueenTheme.emojis.info} Reply 'done' to stop\n${frozenQueenTheme.footer}`;

          const qualityMessageSent = await conn.sendMessage(from, {
            ...(movieImage && { image: { url: movieImage }, caption: qualityMessage }),
            ...(!movieImage && { text: qualityMessage }),
            ...frozenQueenTheme.getForwardProps()
          }, { quoted: message });

          downloadOptionsMap.set(qualityMessageSent.key.id, { movie: movieDetails, downloadLinks: movieDetails.downloadLinks, targetGroupJid });
        }
        // Quality selection
        else if (downloadOptionsMap.has(repliedToId)) {
          const { movie, downloadLinks, targetGroupJid } = downloadOptionsMap.get(repliedToId);
          const selectedQualityNumber = parseInt(replyText);
          const selectedLink = downloadLinks.find(link => link.number === selectedQualityNumber);

          if (!selectedLink) {
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.error} *Invalid quality selection.*\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
            return;
          }

          // Fetch final download link
          const downloadUrl = `https://suhas-mvdl-new-eka.vercel.app/api/sinhalasub/download?url=${encodeURIComponent(selectedLink.link)}`;
          const downloadResponse = await axiosInstance.get(downloadUrl);
          const downloadData = downloadResponse.data;

          let finalDownloadLink = downloadData.find(item => item.direct)?.direct.url ||
                                 downloadData.find(item => item.gdrive)?.gdrive.url ||
                                 downloadData.find(item => item.pixeldrain)?.pixeldrain.url;

          if (!finalDownloadLink) {
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.error} *No valid download links found.*\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
            return;
          }

          // Check file size
          const sizeInGB = selectedLink.size.includes("GB") ? parseFloat(selectedLink.size) : parseFloat(selectedLink.size) / 1024;
          const destinationJid = targetGroupJid || from;

          if (sizeInGB > 2) {
            await conn.sendMessage(destinationJid, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.info} *File too large (${selectedLink.size})!*\n\n${frozenQueenTheme.emojis.movie} *${movie.title}*\n${frozenQueenTheme.emojis.quality} Quality: ${selectedLink.quality}\n${frozenQueenTheme.emojis.size} Size: ${selectedLink.size}\n\n*Direct Download Link:*\n${finalDownloadLink}\n\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            });
            if (targetGroupJid && targetGroupJid !== from) {
              await conn.sendMessage(from, {
                text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.success} *Direct download link sent to target group*\n${frozenQueenTheme.footer}`,
                ...frozenQueenTheme.getForwardProps()
              }, { quoted: message });
            }
            conn.ev.off("messages.upsert", selectionHandler);
            downloadOptionsMap.clear();
            return;
          }

          // Send movie as document
          let thumbnailBase64 = movie.image ? await getImageBase64(movie.image) : null;
          await conn.sendMessage(destinationJid, {
            document: { url: finalDownloadLink },
            mimetype: "video/mp4",
            fileName: `${movie.title} - ${selectedLink.quality}.mp4`,
            ...(thumbnailBase64 && { jpegThumbnail: Buffer.from(thumbnailBase64, 'base64') }),
            caption: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.success} *${movie.title}*\n${frozenQueenTheme.emojis.quality} Quality: ${selectedLink.quality}\n${frozenQueenTheme.emojis.size} Size: ${selectedLink.size}\n\n${frozenQueenTheme.footer}`,
            ...frozenQueenTheme.getForwardProps()
          });

          if (targetGroupJid && targetGroupJid !== from) {
            await conn.sendMessage(from, {
              text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.success} *Movie sent to target group*\n${frozenQueenTheme.footer}`,
              ...frozenQueenTheme.getForwardProps()
            }, { quoted: message });
          }

          conn.ev.off("messages.upsert", selectionHandler);
          downloadOptionsMap.clear();
        }
      } catch (error) {
        console.error("Error in selectionHandler:", error);
      }
    };

    conn.ev.on("messages.upsert", selectionHandler);
    setTimeout(() => {
      conn.ev.off("messages.upsert", selectionHandler);
      downloadOptionsMap.clear();
    }, 10 * 60 * 1000);

  } catch (e) {
    await conn.sendMessage(from, {
      text: `${frozenQueenTheme.header}${frozenQueenTheme.emojis.error} *Error:* ${e.message || "Unknown error"}\n${frozenQueenTheme.footer}`,
      ...frozenQueenTheme.getForwardProps()
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: frozenQueenTheme.emojis.error, key: mek.key } });
  }
});
