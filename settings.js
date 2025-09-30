const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    // ───── WhatsApp Bot Config ─────
    SESSION_ID: process.env.SESSION_ID === undefined 
        ? '𝐍𝐈𝐊𝐀 𝐌𝐈𝐍𝐈 𝐌𝐃=LJQHELyB#upv4t-SQCUgeTBIi0h0hrwu87CN_CGaUdwG7SlNwBZ0' 
        : process.env.SESSION_ID,

    OWNER_NUMBER: process.env.OWNER_NUMBER === undefined 
        ? '94743826406' 
        : process.env.OWNER_NUMBER,

    PREFIX: process.env.PREFIX || '.',

    POSTGRESQL_URL: process.env.POSTGRESQL_URL === undefined 
        ? 'postgres://vajiratech_user:oSIFl2xmSojMZ0rkzdd0g0W6msuVTpNN@dpg-cpd7fjv109ks73e5gtig-a.frankfurt-postgres.render.com/vajiratech' 
        : process.env.POSTGRESQL_URL,

    ALIVE: process.env.ALIVE || '> GOJO MD',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyDQIUl78aFtIgsNKY1RUU82nDkL905UbtA',
    WEATHER_API_KEY: process.env.WEATHER_API_KEY || "9ad6e2bc255f629e9ff07569f0ad0af3",
    FOOTER: process.env.FOOTER || "✫☘𝐆𝐎𝐉𝐎 𝐌𝐎𝐕𝐈𝐄 𝐇𝐎𝐌𝐄☢️☘",
    NAME: process.env.NAME || "𝐆𝐎𝐉𝐎 𝐌𝑫",
    FAKE_RECORDING: process.env.FAKE_RECORDING || "true",
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "true",
    BUTTON: process.env.BUTTON || "true",
    ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "same",

    // ───── Telegram Config ─────
    API_ID: process.env.API_ID || 23094011,
    API_HASH: process.env.API_HASH || "1823daf9ac2ab64b1008b36b322daac9",
    TG_GROUP: process.env.TG_GROUP || "@MyBotSL",

    // ───── API Config ─────
    API: {
        SONG: {
            BASE: process.env.SONG_API_BASE || "https://www.laksidunimsara.com/song",
            KEY: process.env.SONG_API_KEY || "Lk8*Vf3!sA1pZ6Hd"
        },
        VIDEO: {
            BASE: process.env.VIDEO_API_BASE || "https://www.laksidunimsara.com/video",
            KEY: process.env.VIDEO_API_KEY || "Lk8*Vf3!sA1pZ6Hd"
        },
        MOVIE: {
            BASE: process.env.MOVIE_API_BASE || "https://api-dark-shan-yt.koyeb.app/movie",
            KEY: process.env.MOVIE_API_KEY || "deb4e2d4982c6bc2"
        }
    }
};
