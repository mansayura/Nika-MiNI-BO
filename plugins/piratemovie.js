const { cmd } = require('../lib/command');
const axios = require('axios');
const NodeCache = require('node-cache');

// Initialize caches (5-minute TTL)
const searchCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
const infoCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

// Axios instance with timeout
const axiosInstance = axios.create({
  timeout: 15000
});

const theme = {
  header: `*SULA MD TV SERIES DOWNLOADER* \n\n`,
  footer: `> 𝐏𝙾𝚆𝙴𝚁𝙳 𝐁𝚈 𝐒𝚄𝙻𝙰 𝐌𝙳`,
  emojis: {
    search: "🔍",
    series: "📺",
    episode: "🎞️",
    uploading: "📤",
    success: "✅",
    error: "❌",
    info: "ℹ️",
    quality: "📊",
    size: "💾",
    link: "🔗"
  }
};

cmd({
  pattern: 'tvshow',
  desc: 'Download episodes from Sinhala Sub TV show API',
  react: '🔍',
  category: 'movie',
  filename: __filename,
}, async (conn, mek, m, { from, q }) => {
  try {
    if (!q) {
      await conn.sendMessage(from, {
        text: `${theme.header}${theme.emojis.info} Please provide a series name\nExample: .tvshow The Originals\n${theme.footer}`,
      }, { quoted: mek });
      return;
    }

    await conn.sendMessage(from, { react: { text: theme.emojis.search, key: mek.key } });

    // Step 1: Search for series
    const cacheKey = `search_${q.toLowerCase()}`;
    let searchData = searchCache.get(cacheKey);
    if (!searchData) {
      const resp = await axiosInstance.get(`https://sula-sinhalasub-tvshow.vercel.app/api/sinhalasub-tvshow/search?q=${encodeURIComponent(q)}`);
      searchData = resp.data.results;
      if (!Array.isArray(searchData) || !searchData.length) {
        throw new Error('No series found');
      }
      searchCache.set(cacheKey, searchData);
    }

    // Step 2: Format series list
    let seriesMessage = `${theme.header}${theme.emojis.series} Found ${searchData.length} series for "${q}":\n\n`;
    const seriesList = searchData.map((s, i) => ({
      number: i + 1,
      title: s.Title,
      link: s.Link
    }));

    seriesList.forEach(s => {
      seriesMessage += `${theme.emojis.series} *${s.number}.* ${s.title}\n`;
    });
    seriesMessage += `\n${theme.emojis.info} Reply with the number to select a series\n${theme.emojis.info} Reply 'done' to stop\n${theme.footer}`;

    await conn.sendMessage(from, { react: { text: theme.emojis.series, key: mek.key } });

    // Send series list message
    const seriesListMessage = await conn.sendMessage(from, { text: seriesMessage }, { quoted: mek });
    const seriesListMessageKey = seriesListMessage.key;

    const selectionMap = new Map();

    // Selection handler
    const selectionHandler = async (update) => {
      try {
        const message = update.messages[0];
        if (!message.message || message.key.fromMe || message.key.remoteJid !== from) return;

        const replyText = message.message.conversation ||
                         (message.message.extendedTextMessage && message.message.extendedTextMessage.text) || '';
        if (!replyText) return;

        if (replyText.trim().toLowerCase() === 'done') {
          conn.ev.off('messages.upsert', selectionHandler);
          selectionMap.clear();
          await conn.sendMessage(from, {
            text: `${theme.header}${theme.emojis.info} Series search ended.\nThank you for using SULA MD!\n${theme.footer}`,
          }, { quoted: message });
          return;
        }

        const contextInfo = message.message.extendedTextMessage && message.message.extendedTextMessage.contextInfo;
        const repliedToId = contextInfo && contextInfo.stanzaId ? contextInfo.stanzaId : null;

        // SERIES selection
        if (repliedToId === seriesListMessageKey.id) {
          const selectedNumber = parseInt(replyText.trim());
          const selectedSeries = seriesList.find(s => s.number === selectedNumber);

          if (!selectedSeries) {
            await conn.sendMessage(from, {
              text: `${theme.header}${theme.emojis.error} Invalid selection.\nPlease reply with a valid series number.\n${theme.footer}`,
            }, { quoted: message });
            return;
          }

          await conn.sendMessage(from, { react: { text: theme.emojis.search, key: message.key } });

          // Fetch episode info
          const infoKey = `info_${selectedSeries.link}`;
          let infoData = infoCache.get(infoKey);
          if (!infoData) {
            const inf = await axiosInstance.get(`https://sula-sinhalasub-tvshow.vercel.app/api/sinhalasub-tvshow/info?url=${encodeURIComponent(selectedSeries.link)}`);
            infoData = inf.data.results;
            if (!infoData || !Array.isArray(infoData.episodes) || !infoData.episodes.length) {
              await conn.sendMessage(from, {
                text: `${theme.header}${theme.emojis.error} No episodes found for this series.\nPlease try another series.\n${theme.footer}`,
              }, { quoted: message });
              await conn.sendMessage(from, { react: { text: theme.emojis.error, key: message.key } });
              return;
            }
            infoCache.set(infoKey, infoData);
          }

          // Episode list
          let epText = `${theme.header}${theme.emojis.series} Episodes for: ${selectedSeries.title}\n\n`;
          const episodes = infoData.episodes.map((ep, i) => ({
            number: i + 1,
            title: ep.title,
            date: ep.date,
            link: ep.episode_link,
            quality: ep.quality,
            size: ep.size
          }));

          episodes.forEach(ep => {
            epText += `${theme.emojis.episode} *${ep.number}.* ${ep.title} (${ep.date})\n`;
          });
          epText += `\n${theme.emojis.info} Reply with the episode number to download\n${theme.emojis.info} Reply 'done' to stop\n${theme.footer}`;

          await conn.sendMessage(from, { react: { text: theme.emojis.episode, key: message.key } });

          const epListMessage = await conn.sendMessage(from, { text: epText }, { quoted: message });

          selectionMap.set(epListMessage.key.id, { series: selectedSeries, episodes });
        }
        // EPISODE selection
        else if (selectionMap.has(repliedToId)) {
          const { series, episodes } = selectionMap.get(repliedToId);
          const selectedEpNumber = parseInt(replyText.trim());
          const chosenEp = episodes.find(ep => ep.number === selectedEpNumber);

          if (!chosenEp) {
            await conn.sendMessage(from, {
              text: `${theme.header}${theme.emojis.error} Invalid episode number.\nPlease reply with a valid episode number.\n${theme.footer}`,
            }, { quoted: message });
            return;
          }

          await conn.sendMessage(from, { react: { text: theme.emojis.uploading, key: message.key } });

          // Download link fetch - FIXED .find() issue
          let finalUrl;
          try {
            const dl = await axiosInstance.get(`https://movie-api-nine-pi.vercel.app/api/sinhalasubs/download?url=${encodeURIComponent(chosenEp.link)}&apikey=test2`);
            const dlData = dl.data;

            if (Array.isArray(dlData)) {
              finalUrl = dlData[0]?.direct?.url || dlData.find(it => it.gdrive)?.gdrive?.url;
            } else if (dlData && typeof dlData === 'object') {
              finalUrl = dlData.direct?.url || dlData.gdrive?.url;
            }

            if (!finalUrl) throw new Error('No valid download links found');
          } catch (err) {
            await conn.sendMessage(from, {
              text: `${theme.header}${theme.emojis.error} Failed to fetch download link: ${err.message}\nPlease try another episode.\n${theme.footer}`,
            }, { quoted: message });
            await conn.sendMessage(from, { react: { text: theme.emojis.error, key: message.key } });
            return;
          }

          // File size check
          let sizeVal = (chosenEp.size || '').toLowerCase();
          const sizeNum = sizeVal.includes('gb')
            ? (parseFloat(sizeVal) || 0) * 1024
            : parseFloat(sizeVal) || 0;
          const isLarge = sizeNum > 1900;

          const caption = `${theme.header}${theme.emojis.series} ${series.title}\n${theme.emojis.episode} ${chosenEp.title}\n${theme.emojis.quality} Quality: ${chosenEp.quality}\n${theme.emojis.size} Size: ${chosenEp.size}\n${theme.footer}`;

          if (isLarge) {
            await conn.sendMessage(from, {
              text: `${theme.header}${theme.emojis.info} File too large to upload (${chosenEp.size})\n${theme.emojis.link} Direct Download Link: ${finalUrl}\n${theme.footer}`,
            }, { quoted: message });
            await conn.sendMessage(from, { react: { text: theme.emojis.success, key: message.key } });
            conn.ev.off('messages.upsert', selectionHandler);
            selectionMap.clear();
            return;
          }

          try {
            await conn.sendMessage(from, {
              document: { url: finalUrl },
              mimetype: 'video/mp4',
              fileName: `${series.title}_${chosenEp.quality}.mp4`,
              caption
            }, { quoted: message });

            await conn.sendMessage(from, { react: { text: theme.emojis.success, key: message.key } });
            conn.ev.off('messages.upsert', selectionHandler);
            selectionMap.clear();
          } catch (err) {
            await conn.sendMessage(from, {
              text: `${theme.header}${theme.emojis.error} Error sending episode: ${err.message}\n${theme.emojis.link} Direct Download Link: ${finalUrl}\n${theme.footer}`,
            }, { quoted: message });
            await conn.sendMessage(from, { react: { text: theme.emojis.error, key: message.key } });
          }
        }
      } catch (err) {
        console.error('Error in selectionHandler:', err);
      }
    };

    conn.ev.on('messages.upsert', selectionHandler);

    setTimeout(() => {
      conn.ev.off('messages.upsert', selectionHandler);
      selectionMap.clear();
    }, 20 * 60 * 1000); // 20 min

  } catch (err) {
    console.error('Error in tvshow command:', err);
    await conn.sendMessage(from, {
      text: `${theme.header}${theme.emojis.error} Error: ${err.message}\nPlease try again later.\n${theme.footer}`,
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: theme.emojis.error, key: mek.key } });
  }
});
