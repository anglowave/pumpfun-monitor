# Pump.fun Token Monitor

A TypeScript application that monitors Pump.fun's NATS WebSocket for new token creation events and sends Discord alerts when tokens match your configured keywords.

## Features

- 🔌 NATS WebSocket connection to Pump.fun's real-time feed
- 📊 Monitors `advancedNewCoinCreated` events
- 🔍 Keyword matching from text file (case-insensitive)
- 📢 Discord webhook notifications with token information
- 🔄 Automatic reconnection on disconnect
- 📝 Hot-reload of keywords file (no restart needed)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

**Recommended: Create a `.env` file** in the project root:

Create a file named `.env` with:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
NATS_USER=subscriber
NATS_PASS=your_nats_password
KEYWORDS_FILE=keywords.txt
```

**Alternative: Set environment variable in PowerShell** (must be in the same session):

```powershell
# Set the variable and run in the same command
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"; npm run dev
```

Or set it first, then run:
```powershell
$env:DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
npm run dev
```

**Note:** The `.env` file method is recommended as it persists across sessions and is automatically loaded by the application.

### 3. Configure Keywords

Edit `keywords.txt` and add keywords you want to monitor (one per line).

Example keywords:
```
example
keyword
test
```

- Lines starting with `#` are treated as comments
- Empty lines are ignored
- Matching is case-insensitive
- The bot checks if the token name OR ticker contains any keyword

### 4. Build and Run

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## How It Works

1. Connects to Pump.fun's NATS WebSocket server
2. Authenticates using NATS protocol with subscriber credentials
3. Subscribes to `advancedNewCoinCreated` subject
4. For each new coin creation event:
   - Extracts the token name and ticker
   - Checks if they match any keyword from `keywords.txt`
   - If matched, sends a formatted Discord webhook with token information

## Discord Webhook Format

The Discord notification includes:
- Token name and ticker
- Token mint address and creator address
- AMM type (Pump.fun)
- Links (website, Twitter, Telegram) if available
- Token image thumbnail if available

**Note:** Market data (price, volume, market cap, holders) is not included in the notification.

## Getting a Discord Webhook URL

1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL
5. Use it as the `DISCORD_WEBHOOK_URL` environment variable

## Project Structure

```
.
├── src/
│   ├── index.ts              # Main application entry point
│   ├── websocket-client.ts   # NATS WebSocket client with auto-reconnect
│   ├── keyword-matcher.ts    # Keyword matching logic
│   └── discord-webhook.ts   # Discord webhook integration
├── keywords.txt              # Keywords file (editable)
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration Options

All configuration can be done via environment variables (in `.env` file or set directly):

- `DISCORD_WEBHOOK_URL` (required): Your Discord webhook URL
- `NATS_USER` (required): NATS WebSocket username
- `NATS_PASS` (required): NATS WebSocket password
- `KEYWORDS_FILE` (optional): Path to keywords file, defaults to `keywords.txt`

## Keyword Matching

The keyword matcher is case-insensitive and checks both the token name and ticker. Simply add your keywords to `keywords.txt`, one per line. The matcher will check if any keyword appears in the token's name or ticker symbol.

## Troubleshooting

- **WebSocket connection fails**: Check your internet connection and verify the WebSocket URL
- **No Discord notifications**: Verify your `DISCORD_WEBHOOK_URL` is correct and the webhook is active
- **Keywords not matching**: Ensure keywords in `keywords.txt` are spelled correctly (case-insensitive). The matcher checks if the keyword appears anywhere in the name or ticker.
- **File not found errors**: Make sure `keywords.txt` exists in the project root
- **No messages received**: The NATS server may be temporarily unavailable. The client will automatically reconnect.

## NATS Protocol

This application uses the NATS (NATS Messaging) protocol over WebSocket. It:
- Sends CONNECT command with authentication credentials
- Subscribes to the `advancedNewCoinCreated` subject
- Parses MSG protocol messages
- Automatically reconnects on connection loss

## License

MIT
