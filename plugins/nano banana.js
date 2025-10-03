// • Feature : Nano-Banana AI
// • Credits : https://whatsapp.com/channel/0029Vb4fjWE1yT25R7epR110

const { cmd } = require("../lib/command");
const uploadImage = require("../lib/uploadImage");
const fetch = require("node-fetch");

cmd({
    pattern: "nanobanana",
    alias: ["nb", "aiart", "editimage"],
    react: "🎨",
    desc: "AI Image Transformation with Nano-Banana",
    category: "ai",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        // check image
        if (!/image/.test(mime)) {
            return reply(`❌ Reply to an *image* with caption:\n.nanobanana <prompt>\n\n*Ex:* .nanobanana make me anime style`);
        }

        const text = args.join(" ");
        if (!text) return reply("❌ Please enter a prompt!");

        if (text.length > 500) return reply("❌ Prompt too long! Max 500 characters.");

        // download
        const img = await q.download();
        if (!img || img.length === 0) return reply("❌ Failed to download image!");
        if (img.length > 10 * 1024 * 1024) return reply("❌ Image too large! Max 10MB.");

        // upload
        const imageUrl = await uploadImage(img);
        if (!imageUrl || !imageUrl.startsWith("http")) return reply("❌ Failed to upload image!");

        reply("⏳ Processing your image with *Nano-Banana AI*...");

        // call API
        const apiUrl = `https://api.platform.web.id/nano-banana?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(text)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) return reply(`❌ Server error: ${res.status}`);

        const json = await res.json();
        if (!json.success || !json.result?.results?.length) return reply("❌ No result from AI!");

        const resultUrl = json.result.results[0].url;

        // send result
        await conn.sendMessage(from, {
            image: { url: resultUrl },
            caption: `✨ *Nano-Banana AI Result*\n\n*Prompt:* ${text}\n👤 Requested by: @${m.sender.split("@")[0]}`
        }, { quoted: mek });

    } catch (e) {
        console.error("NanoBanana Error:", e);
        reply(`🚨 Error: ${e.message}`);
    }
});
