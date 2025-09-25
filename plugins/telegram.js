const { cmd } = require('../lib/command');
const config = require('../settings');
const fs = require("fs");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const mime = require("mime-types");
const path = require("path");

const apiId = config.API_ID;
const apiHash = config.API_HASH;
const group = config.TG_GROUP;

const sessionFile = "./tg_session.txt";
let sessionString = fs.existsSync(sessionFile) ? fs.readFileSync(sessionFile, "utf8") : "";
const stringSession = new StringSession(sessionString);

// 📌 Temp store for PIN request
let waitingForCode = {};

cmd({
    pattern: "telegram",
    react: "📢",
    desc: "Download file from Telegram group and send to WhatsApp",
    category: "tools",
    filename: __filename
}, async (bot, mek, m, { from, q, reply }) => {
    if (!q) return reply("❌ Use: .telegram <file name>");

    try {
        const client = new TelegramClient(stringSession, Number(apiId), apiHash, {
            connectionRetries: 5,
        });

        // First login (session not exists)
        if (!sessionString) {
            await client.start({
                phoneNumber: async () => config.TG_NUMBER || "+94777145463",
                password: async () => config.TG_PASSWORD || "",
                phoneCode: async () => {
                    reply("💬 Reply with your Telegram code using `.code <PIN>` (check your Telegram app)");
                    return await new Promise((resolve) => {
                        waitingForCode[from] = resolve; // Save resolver
                    });
                },
                onError: (err) => console.log("Login error:", err),
            });

            console.log("✅ Telegram login successful!");
            const newSession = client.session.save();
            fs.writeFileSync(sessionFile, newSession, "utf8");
            console.log("💾 Telegram session saved!");
        } else {
            await client.connect();
        }

        // 🔍 Search message in Telegram group
        const messages = await client.getMessages(group, { search: q, limit: 1 });
        if (!messages.length) return reply("❌ File not found in Telegram group!");

        const msg = messages[0];

        // Detect filename + extension
        let fileName = msg.media?.document?.attributes?.find(a => a.fileName)?.fileName || q;
        let ext = path.extname(fileName) || ".bin";
        let mimeType = mime.lookup(ext) || "application/octet-stream";

        // File size check (500MB max)
        const fileSize = msg.media?.document?.size || 0;
        if (fileSize > 500 * 1024 * 1024) {
            return reply("❌ File is larger than 500MB. Cannot send via WhatsApp!");
        }

        // 📥 Download from Telegram
        const buffer = await client.downloadMedia(msg, { workers: 1 });

        // 📤 Send to WhatsApp
        await bot.sendMessage(from, {
            document: buffer,
            mimetype: mimeType,
            fileName: fileName
        }, { quoted: mek });

        reply(`✅ File sent from Telegram!\n📁 ${fileName}\n📦 ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    } catch (e) {
        console.error(e);
        reply("❌ Error: " + e.message);
    }
});

// 📌 Capture PIN from WhatsApp reply
cmd({
    pattern: "code",
    desc: "Enter Telegram verification code",
    category: "tools",
}, async (bot, mek, m, { from, q, reply }) => {
    if (!waitingForCode[from]) return reply("❌ Not waiting for any Telegram code.");
    if (!q) return reply("⚠️ Please provide the code. Example: .code 12345");

    waitingForCode[from](q.trim()); // Resolve promise
    delete waitingForCode[from];
    reply("✅ Code received, continuing Telegram login...");
});
