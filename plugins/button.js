const { cmd } = require('../lib/command');
const config = require('../settings');
const os = require('os');

// BUTTON SETTINGS
cmd({
    pattern: "button",
    desc: "Enable/disable button/list menus",
    category: "settings",
    filename: __filename
}, async (conn, mek, m, { args, isCreator, reply }) => {
    if (!isCreator) return reply("*📛 Only  owner can use this!*");
    const status = args[0]?.toLowerCase();
    if (status === "on") {
        config.BUTTON = "true";
        return reply("✅ Button/List menus are now enabled.");
    } else if (status === "off") {
        config.BUTTON = "false";
        return reply("❌ Button/List menus are now disabled.");
    } else {
        return reply("Example: .button on");
    }
});
