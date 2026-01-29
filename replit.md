# Premium Furry Interaction Bot

## Overview

This is a Discord bot designed for safe-for-work (SFW) furry-themed social interactions. The bot uses the Yiffy API to fetch images and provides various social commands (hug, cuddle, etc.) for community engagement. It includes a keep-alive server to prevent the Replit from sleeping during inactive periods.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Discord.js v14** - Modern Discord API wrapper with support for slash commands, embeds, and gateway intents
- Entry point is `index.js` which initializes the bot client and registers command handlers

### Keep-Alive Server
- **Express.js** server running on port 5000
- Provides a simple HTTP endpoint that external services (like UptimeRobot) can ping to keep the Replit awake
- Initialized before the Discord bot starts

### Command System
- Prefix-based commands using `!` prefix
- Commands defined in a registry object with endpoint mappings, action text, and response variations
- Built-in cooldown system (3 seconds default) to prevent spam
- Retry mechanism for API failures (2 attempts)

### Configuration Pattern
- Centralized `CONFIG` object for all bot settings
- Environment variables loaded via `dotenv` for sensitive data (Discord token)
- Hardcoded values for non-sensitive configuration (colors, cooldowns, user agent)

## External Dependencies

### Discord API
- Uses Discord.js library to connect to Discord Gateway
- Requires `DISCORD_TOKEN` environment variable for authentication
- Uses Gateway Intents for receiving message events

### Yiffy API
- External API for fetching furry-themed images
- Accessed via axios HTTP client
- SFW content only based on bot description

### Environment Variables Required
- `DISCORD_TOKEN` - Bot authentication token from Discord Developer Portal

### NPM Packages
- `discord.js` - Discord API wrapper
- `axios` - HTTP client for API requests
- `express` - Keep-alive web server
- `dotenv` - Environment variable management