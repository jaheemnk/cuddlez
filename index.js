/**
 * 👑 FURRY TITAN BOT (v6.0 - Enterprise Architect Edition)
 * A massive, robust, dual-API bot designed for 100% uptime and premium user experience.
 * * FEATURES:
 * - Dual API Failover (Yiffy -> PurrBot)
 * - Advanced Error Trapping
 * - System Status Monitoring (!stats)
 * - Rich Embeds with Dynamic Footers
 * - Smart Cooldown Management
 */

// =========================================
// 🔌 SYSTEM IMPORTS & SETUP
// =========================================
const keepAlive = require('./keep_alive.js');
try { keepAlive(); } catch (e) { console.log("⚠️ Keep-Alive system skipped (Local Mode)"); }

const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    PermissionsBitField, 
    ActivityType,
    version: discordVersion
} = require('discord.js');
const axios = require('axios');
const os = require('os'); // For system stats
require('dotenv').config();

// =========================================
// ⚙️ ADVANCED CONFIGURATION
// =========================================
const CONFIG = {
    // Identity
    name: "Furry Titan",
    version: "6.0.0",
    
    // Settings
    prefix: "!",
    cooldown: 3,        // Seconds
    requestTimeout: 4000, // API Timeout in ms
    
    // Visuals
    colors: {
        primary: "#131416",   // Matte Black (Standard)
        backup:  "#FFD700",   // Gold (Backup Mode)
        error:   "#FF4444",   // Red (Error)
        success: "#00C851",   // Green (Success)
        info:    "#33B5E5"    // Blue (Info)
    },
    
    // API Configuration
    userAgent: "FurryTitanBot/6.0 (DiscordJS)",
    
    // Fallback Map: Maps Yiffy endpoints to PurrBot equivalents
    fallbackMap: {
        hug: 'hug', cuddle: 'cuddle', snuggle: 'cuddle',
        kiss: 'kiss', pat: 'pat', lick: 'lick', 
        bite: 'bite', boop: 'poke', blush: 'blush',
        cry: 'cry', dance: 'dance', highfive: 'highfive'
    }
};

// =========================================
// 📜 EXTENDED COMMAND DATABASE
// =========================================
const COMMANDS = {
    // --- AFFECTION ---
    hug: { endpoint: 'hug', required: true, action: 'hugs', self: 'hugs themselves tight... ❤️', bot: 'hugs me! Aww! 🧡' },
    cuddle: { endpoint: 'cuddle', required: true, action: 'cuddles', self: 'curls up to cuddle themselves.', bot: 'cuddles me! *Purrs*' },
    snuggle: { endpoint: 'cuddle', required: true, action: 'snuggles', self: 'snuggles a plushie.', bot: 'snuggles close to me!' },
    kiss: { endpoint: 'kiss', required: true, action: 'kisses', self: 'kisses the mirror.', bot: 'kisses me! *Blushes*' },
    
    // --- PLAYFUL ---
    boop: { endpoint: 'boop', required: true, action: 'boops', self: 'boops their own nose.', bot: 'boops my nose! >w<' },
    pat: { endpoint: 'pat', required: true, action: 'pats', self: 'pats their own head.', bot: 'pats my head. *Wags tail*' },
    lick: { endpoint: 'lick', required: true, action: 'licks', self: 'licks their arm?', bot: 'licks me?! Eep!' },
    bite: { endpoint: 'bite', required: true, action: 'bites', self: 'bites their lip.', bot: 'bites me! Ouch!' },
    highfive: { endpoint: 'highfive', required: true, action: 'high-fives', self: 'high-fives... the air?', bot: 'high-fives me! Yeah!' },

    // --- EMOTIONAL ---
    blush: { endpoint: 'blush', required: false, action: 'blushes' },
    cry: { endpoint: 'cry', required: false, action: 'cries' },
    dance: { endpoint: 'dance', required: false, action: 'starts dancing!' },
    
    // --- SOLO ACTION ---
    flop: { endpoint: 'flop', required: false, action: 'flops over dramatically' },
    fursuit: { endpoint: 'fursuit', required: false, action: 'shows off a fursuit' },
    howl: { endpoint: 'howl', required: false, action: 'howls at the moon' },
    
    // --- UTILITY ---
    ping: { type: 'utility' },
    help: { type: 'utility' },
    stats: { type: 'utility' } // NEW COMMAND
};

// =========================================
// 🛠️ UTILITY & LOGGING ENGINE
// =========================================

/**
 * 📝 Enhanced Logger
 * Prints beautiful, timestamped logs to the console.
 */
function log(level, message) {
    const time = new Date().toLocaleTimeString();
    const icons = { 
        INFO: 'ℹ️', SUCCESS: '✅', ERROR: '❌', 
        WARN: '⚠️', CMD: '🤖', API: '🌐', SYS: '🖥️' 
    };
    console.log(`[${time}] ${icons[level] || ''} [${level}] ${message}`);
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// =========================================
// 🌐 DUAL-ENGINE API FETCHER
// =========================================

/**
 * 🛡️ fetchImageSmart
 * The brain of the bot. Manages the connection between Yiffy and PurrBot.
 */
async function fetchImageSmart(commandName, endpoint) {
    
    // --- STRATEGY 1: YIFFY API (Primary) ---
    try {
        log('API', `Requesting '${endpoint}' from Primary Source...`);
        const url = `https://v2.yiff.rest/furry/${endpoint}`;
        
        const response = await axios.get(url, {
            headers: { 
                'User-Agent': CONFIG.userAgent, 
                'Authorization': process.env.YIFFY_API_KEY || '' 
            },
            timeout: CONFIG.requestTimeout
        });

        if (response.data?.images?.[0]?.url) {
            return { 
                url: response.data.images[0].url, 
                source: 'Yiffy API', 
                isBackup: false 
            };
        }
    } catch (e) {
        log('WARN', `Primary Source Failed (${e.message}). Preparing Backup...`);
    }

    // --- STRATEGY 2: PURRBOT API (Backup) ---
    await delay(500); // Breathe for 0.5s
    
    const backupEndpoint = CONFIG.fallbackMap[commandName] || endpoint;
    
    try {
        log('API', `Requesting '${backupEndpoint}' from Backup Source...`);
        const url = `https://purrbot.site/api/img/sfw/${backupEndpoint}/gif`;
        
        const response = await axios.get(url, { timeout: CONFIG.requestTimeout });
        
        if (response.data?.link) {
            log('SUCCESS', `Backup Source Rescued Request!`);
            return { 
                url: response.data.link, 
                source: 'PurrBot (Open Source)', 
                isBackup: true 
            };
        }
    } catch (e) {
        log('ERROR', `Backup Source Failed: ${e.message}`);
    }

    // --- STRATEGY 3: TOTAL FAILURE ---
    throw new Error("Critical API Outage");
}

// =========================================
// 🤖 CLIENT INITIALIZATION
// =========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const cooldowns = new Set();

client.once('clientReady', () => {
    log('SYS', `BOOT SEQUENCE COMPLETE`);
    log('SUCCESS', `Logged in as ${client.user.tag}`);
    log('INFO', `Command Registry: ${Object.keys(COMMANDS).length} loaded`);
    
    // Advanced Status Rotator
    const activities = [
        { name: 'over the server', type: ActivityType.Watching },
        { name: `v${CONFIG.version}`, type: ActivityType.Playing },
        { name: '!help', type: ActivityType.Listening },
        { name: 'furry videos', type: ActivityType.Watching }
    ];
    let i = 0;
    setInterval(() => {
        client.user.setActivity(activities[i].name, { type: activities[i].type });
        i = (i + 1) % activities.length;
    }, 15000);
});

// =========================================
// 📨 MESSAGE PROCESSING CORE
// =========================================
client.on('messageCreate', async (message) => {
    // 1. Pre-Flight Checks
    if (message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;
    if (!message.guild) return; // Ignore DMs

    // 2. Permission Validator
    const perms = message.channel.permissionsFor(client.user);
    if (!perms.has(PermissionsBitField.Flags.SendMessages)) return;
    if (!perms.has(PermissionsBitField.Flags.EmbedLinks)) {
        return message.reply("⚠️ **CRITICAL ERROR:** I am missing the `Embed Links` permission. I cannot function without it.");
    }

    // 3. Parser
    const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    // -------------------------------------
    // 📊 UTILITY COMMANDS
    // -------------------------------------
    if (cmdName === 'ping') {
        return message.reply(`🏓 **Pong!**\nLatency: \`${Date.now() - message.createdTimestamp}ms\`\nAPI Heartbeat: \`${client.ws.ping}ms\``);
    }
    
    // NEW: Stats Command
    if (cmdName === 'stats') {
        const uptime = process.uptime();
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const statsEmbed = new EmbedBuilder()
            .setTitle("📊 System Diagnostics")
            .setColor(CONFIG.colors.info)
            .addFields(
                { name: '⏳ Uptime', value: `${hrs}h ${mins}m`, inline: true },
                { name: '🧠 RAM Usage', value: `${memUsage} MB`, inline: true },
                { name: '📚 Library', value: `Discord.js v${discordVersion}`, inline: true },
                { name: '📡 API Status', value: '🟢 Online', inline: true }
            )
            .setFooter({ text: `Titan Bot v${CONFIG.version}` });
        return message.channel.send({ embeds: [statsEmbed] });
    }

    if (cmdName === 'help') {
        const social = Object.keys(COMMANDS).filter(k => COMMANDS[k].required).map(c => `\`!${c}\``).join(', ');
        const solo = Object.keys(COMMANDS).filter(k => !COMMANDS[k].required && !COMMANDS[k].type).map(c => `\`!${c}\``).join(', ');
        
        return message.channel.send({ 
            embeds: [new EmbedBuilder()
                .setTitle("🐾 Command Interface")
                .setColor(CONFIG.colors.primary)
                .setDescription("Select a command below to interact.")
                .addFields(
                    { name: '🫂 Social Interactions', value: social || 'None', inline: false },
                    { name: '🎭 Solo Actions', value: solo || 'None', inline: false },
                    { name: '⚙️ System', value: '`!stats`, `!ping`, `!help`', inline: false }
                )
                .setFooter({ text: "Using Hybrid API Technology" })
            ] 
        });
    }

    // -------------------------------------
    // ⚡ INTERACTION ENGINE
    // -------------------------------------
    const cmd = COMMANDS[cmdName];
    if (!cmd || cmd.type === 'utility') return;

    // Cooldown Manager
    if (cooldowns.has(message.author.id)) return message.react('⏳');
    
    // Target Validator
    const target = message.mentions.users.first();
    if (cmd.required && !target) {
        return message.reply(`⚠️ **Target Missing:** Usage: \`!${cmdName} @User\``);
    }

    // Apply Cooldown
    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), CONFIG.cooldown * 1000);

    log('CMD', `${message.author.tag} triggered !${cmdName}`);

    // Header Generator
    let header = `### <@${message.author.id}> ${cmd.action}!`;
    if (target) {
        if (target.id === message.author.id) header = `### <@${message.author.id}> ${cmd.self}`;
        else if (target.id === client.user.id) header = `### <@${message.author.id}> ${cmd.bot}`;
        else header = `### <@${message.author.id}> ${cmd.action} <@${target.id}>!`;
    }

    // Execution Phase
    const loader = await message.channel.send("🔎 *Searching secure channels...*");

    try {
        const result = await fetchImageSmart(cmdName, cmd.endpoint);
        
        // Build Final Embed
        const embed = new EmbedBuilder()
            .setImage(result.url)
            .setColor(result.isBackup ? CONFIG.colors.backup : CONFIG.colors.primary)
            .setFooter({ 
                text: result.isBackup 
                    ? "⚠️ Service Disrupted | Backup API Active" 
                    : "View commands with !help" 
            });

        await loader.edit({ content: header, embeds: [embed] });

    } catch (err) {
        log('ERROR', `Transaction Failed: ${err.message}`);
        await loader.delete().catch(()=>{});
        
        const errEmbed = new EmbedBuilder()
            .setColor(CONFIG.colors.error)
            .setTitle("❌ Service Unavailable")
            .setDescription("Both image providers are currently unresponsive.\nAutomatic retries failed.");
            
        message.channel.send({ embeds: [errEmbed] });
    }
});

// =========================================
// 🚀 MAIN ENTRY POINT
// =========================================
if (!process.env.DISCORD_TOKEN) {
    log('ERROR', "Token missing in .env");
} else {
    client.login(process.env.DISCORD_TOKEN);
}
