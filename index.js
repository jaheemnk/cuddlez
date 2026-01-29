/**
 * 🐾 PREMIUM FURRY INTERACTION BOT (v3.0 - Enterprise Edition)
 * A robust, SFW Discord bot using the Yiffy API with advanced error handling.
 */
const keepAlive = require('./keep_alive.js');
keepAlive();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionsBitField,
    ActivityType,
} = require("discord.js");
const axios = require("axios");
require("dotenv").config();

// =========================================
// ⚙️ GLOBAL CONFIGURATION
// =========================================
const CONFIG = {
    prefix: "!",
    embedColor: "#131416", // Matte Black
    errorColor: "#FF4444", // Red for errors
    successColor: "#131416",
    cooldownTime: 3, // Seconds
    userAgent: "PremiumFurryBot/3.0 (NodeJS)",
    footerText: "View commands with !help",
    retryAttempts: 2, // How many times to retry API if it fails
    owners: [], // Add your ID here if you want admin-only commands later
};

// =========================================
// 📜 COMMAND REGISTRY
// =========================================
const COMMANDS = {
    // --- SOCIAL INTERACTION COMMANDS ---
    hug: {
        endpoint: "hug",
        required: true,
        action: "hugs",
        self: "hugs themselves tight... everything will be okay! ❤️",
        bot: "hugs me! Aww, come here you! 🧡",
    },
    cuddle: {
        endpoint: "cuddle",
        required: true,
        action: "cuddles",
        self: "curls up into a ball to cuddle themselves.",
        bot: "cuddles me! *Purrs happily*",
    },
    snuggle: {
        endpoint: "cuddle",
        required: true, // Uses cuddle endpoint
        action: "snuggles",
        self: "snuggles a giant plushie instead.",
        bot: "snuggles up close to me!",
    },
    boop: {
        endpoint: "boop",
        required: true,
        action: "boops",
        self: "boops their own nose. *Boop!*",
        bot: "boops my nose! Hey! >w<",
    },
    kiss: {
        endpoint: "kiss",
        required: true,
        action: "kisses",
        self: "kisses their reflection in the mirror.",
        bot: "gives me a kiss! *Blushes profusely*",
    },
    pat: {
        endpoint: "pat",
        required: true,
        action: "pats",
        self: "pats their own head. Good job me!",
        bot: "pats my head. *Wags tail*",
    },
    lick: {
        endpoint: "lick",
        required: true,
        action: "licks",
        self: "licks... their arm? You okay?",
        bot: "licks me?! Eep! That tickles!",
    },
    bite: {
        endpoint: "bite",
        required: true,
        action: "bites",
        self: "bites their lip nervously.",
        bot: "bites me! Ouch! 3:",
    },

    // --- SOLO / ACTION COMMANDS ---
    flop: {
        endpoint: "flop",
        required: false,
        action: "flops over dramatically",
    },
    fursuit: {
        endpoint: "fursuit",
        required: false,
        action: "shows off a fursuit",
    },
    howl: { endpoint: "howl", required: false, action: "howls at the moon" },

    // --- UTILITY COMMANDS (Handled separately) ---
    ping: { type: "utility", description: "Checks bot latency" },
    help: { type: "utility", description: "Shows command list" },
};

// =========================================
// 🛠️ UTILITY FUNCTIONS
// =========================================

/**
 * 📝 Advanced Logger
 * Prints timestamped logs to console for debugging.
 */
function log(type, message) {
    const time = new Date().toLocaleTimeString();
    const icons = {
        INFO: "ℹ️",
        SUCCESS: "✅",
        ERROR: "❌",
        WARN: "⚠️",
        CMD: "🤖",
    };
    console.log(`[${time}] ${icons[type] || ""} [${type}] ${message}`);
}

/**
 * 🔄 API Fetcher with Retry Logic
 * If the API fails, it waits and tries again up to 3 times.
 */
async function fetchImageWithRetry(endpoint, retries = CONFIG.retryAttempts) {
    const url = `https://v2.yiff.rest/furry/${endpoint}`;

    for (let i = 0; i <= retries; i++) {
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent": CONFIG.userAgent,
                    Authorization: process.env.YIFFY_API_KEY || "",
                },
                timeout: 5000,
            });

            // Validate that we actually got an image
            if (
                response.data &&
                response.data.images &&
                response.data.images.length > 0
            ) {
                return response.data.images[0].url;
            }
            throw new Error("Empty response from API");
        } catch (error) {
            log(
                "WARN",
                `Attempt ${i + 1}/${retries + 1} failed for ${endpoint}: ${error.message}`,
            );
            if (i === retries) throw error; // If last attempt, throw actual error
        }
    }
}

// =========================================
// 🤖 CLIENT SETUP
// =========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const cooldowns = new Set();

client.once("clientReady", () => {
    log("SUCCESS", `Logged in as ${client.user.tag}`);
    log("INFO", `Loaded ${Object.keys(COMMANDS).length} commands.`);

    // Rotate Status every 30 seconds
    const activities = [
        { name: "over the server", type: ActivityType.Watching },
        { name: "!help for commands", type: ActivityType.Listening },
        { name: "furry videos", type: ActivityType.Watching },
    ];

    let activityIndex = 0;
    setInterval(() => {
        const activity = activities[activityIndex];
        client.user.setActivity(activity.name, { type: activity.type });
        activityIndex = (activityIndex + 1) % activities.length;
    }, 30000);
});

// =========================================
// 📨 MAIN MESSAGE EVENT
// =========================================
client.on("messageCreate", async (message) => {
    // 1. Basic Filters (Ignore bots, ignore non-prefix messages)
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix))
        return;

    // 2. Permission Check (Crucial for stability)
    if (message.guild) {
        const botPerms = message.channel.permissionsFor(client.user);
        if (!botPerms.has(PermissionsBitField.Flags.SendMessages)) return; // Can't even reply
        if (!botPerms.has(PermissionsBitField.Flags.EmbedLinks)) {
            return message.reply(
                "⚠️ **System Error:** I am missing the `Embed Links` permission. Please check my role settings.",
            );
        }
    }

    // 3. Command Parsing
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // 4. Handle Utility Commands
    if (commandName === "ping") {
        const pingMsg = await message.reply("🏓 Pinging...");
        const latency = pingMsg.createdTimestamp - message.createdTimestamp;
        return pingMsg.edit(
            `🏓 **Pong!** Latency: \`${latency}ms\` | API: \`${client.ws.ping}ms\``,
        );
    }

    if (commandName === "help") {
        const socialCmds = Object.keys(COMMANDS)
            .filter((k) => COMMANDS[k].required)
            .map((c) => `\`!${c}\``)
            .join(", ");
        const soloCmds = Object.keys(COMMANDS)
            .filter((k) => COMMANDS[k].endpoint && !COMMANDS[k].required)
            .map((c) => `\`!${c}\``)
            .join(", ");

        const helpEmbed = new EmbedBuilder()
            .setTitle("🐾 Furry Bot Interface")
            .setColor(CONFIG.embedColor)
            .setDescription("Execute one of the commands below to interact.")
            .addFields(
                {
                    name: "👥 Social Interactions",
                    value: socialCmds || "None",
                    inline: false,
                },
                {
                    name: "📸 Solo Actions",
                    value: soloCmds || "None",
                    inline: false,
                },
                {
                    name: "⚙️ Utility",
                    value: "`!ping`, `!help`",
                    inline: false,
                },
            )
            .setFooter({ text: CONFIG.footerText });
        return message.channel.send({ embeds: [helpEmbed] });
    }

    // 5. Validation: Is this a real command?
    const cmdConfig = COMMANDS[commandName];
    if (!cmdConfig || cmdConfig.type === "utility") return;

    // 6. Cooldown Check
    if (cooldowns.has(message.author.id)) {
        return message.reply({
            content: "⏳ **Cool down!** Please wait a few seconds.",
            allowedMentions: { repliedUser: false },
        });
    }

    // 7. Target Validation
    const target = message.mentions.users.first();
    if (cmdConfig.required && !target) {
        return message.reply(
            `⚠️ **Target Required:** You must mention someone to use this command.\nExample: \`!${commandName} @User\``,
        );
    }

    // Apply Cooldown
    cooldowns.add(message.author.id);
    setTimeout(
        () => cooldowns.delete(message.author.id),
        CONFIG.cooldownTime * 1000,
    );

    log("CMD", `User ${message.author.tag} used !${commandName}`);

    // 8. Generate Display Text (The "Header")
    let displayText = "";
    if (!cmdConfig.required) {
        displayText = `### <@${message.author.id}> ${cmdConfig.action}!`;
    } else if (target.id === message.author.id) {
        displayText = `### <@${message.author.id}> ${cmdConfig.self}`;
    } else if (target.id === client.user.id) {
        displayText = `### <@${message.author.id}> ${cmdConfig.bot}`;
    } else {
        displayText = `### <@${message.author.id}> ${cmdConfig.action} <@${target.id}>!`;
    }

    // 9. Execution Phase (Loading -> Fetch -> Edit)
    const loadingEmbed = new EmbedBuilder()
        .setDescription("🔎 *Connecting to image server...*")
        .setColor(CONFIG.embedColor);

    const msgInstance = await message.channel.send({ embeds: [loadingEmbed] });

    try {
        const imageUrl = await fetchImageWithRetry(cmdConfig.endpoint);

        const finalEmbed = new EmbedBuilder()
            .setColor(CONFIG.embedColor)
            .setImage(imageUrl)
            .setFooter({ text: CONFIG.footerText });

        await msgInstance.edit({
            content: displayText,
            embeds: [finalEmbed],
        });
    } catch (error) {
        log("ERROR", `Failed to execute !${commandName}: ${error.message}`);

        const errorEmbed = new EmbedBuilder()
            .setColor(CONFIG.errorColor)
            .setTitle("Connection Error")
            .setDescription(
                "❌ Unable to retrieve image from the remote server. Please try again.",
            );

        await msgInstance.edit({ content: null, embeds: [errorEmbed] });
    }
});

// =========================================
// 🚀 LAUNCH
// =========================================
client.login(process.env.DISCORD_TOKEN);
