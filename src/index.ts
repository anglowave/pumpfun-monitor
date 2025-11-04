import * as dotenv from 'dotenv';
import { NATSWebSocketClient, NATSMessage } from './websocket-client';
import { KeywordMatcher } from './keyword-matcher';
import { DiscordWebhook } from './discord-webhook';

dotenv.config();

const WEBSOCKET_URL = 'wss://prod-advanced.nats.realtime.pump.fun/';
const KEYWORDS_FILE = process.env.KEYWORDS_FILE || 'keywords.txt';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const NATS_USER = process.env.NATS_USER || '';
const NATS_PASS = process.env.NATS_PASS || '';

if (!DISCORD_WEBHOOK_URL) {
  console.error('DISCORD_WEBHOOK_URL environment variable is not set!');
  process.exit(1);
}

if (!NATS_USER || !NATS_PASS) {
  console.error('NATS_USER and NATS_PASS environment variables are required!');
  process.exit(1);
}

const keywordMatcher = new KeywordMatcher(KEYWORDS_FILE);
const discordWebhook = new DiscordWebhook(DISCORD_WEBHOOK_URL);

const natsOptions = {
  no_responders: true,
  protocol: 1,
  verbose: false,
  pedantic: false,
  user: NATS_USER,
  pass: NATS_PASS,
  lang: 'nats.ws',
  version: '1.30.3',
  headers: true
};

const wsClient = new NATSWebSocketClient(WEBSOCKET_URL, natsOptions);

function handleMessage(message: NATSMessage): void {
  console.log(`Received message from ${message.subject}`);
  console.log(`   Data:`, JSON.stringify(message.data, null, 2).substring(0, 500));

  if (message.subject === 'advancedNewCoinCreated' || message.subject.startsWith('advancedNewCoinCreated')) {
    handleNewCoin(message.data);
  } else if (message.subject.startsWith('advancedTrade.') || message.subject.startsWith('pumpSwapTrade.')) {
    handleTradeEvent(message.data);
  } else if (message.subject === 'unifiedTradeEvent.processed') {
    handleTradeEvent(message.data);
  }
}

function handleNewCoin(data: any): void {
  if (!data) return;

  let coinData = data;
  if (typeof data === 'string') {
    try {
      coinData = JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse JSON string:', error);
      return;
    }
  }

  const name = coinData.name || coinData.symbol || coinData.tokenName || '';
  const ticker = coinData.ticker || coinData.symbol || coinData.tokenSymbol || name;

  if (!name && !ticker) {
    console.log('Skipping - no name/ticker found');
    console.log('Raw data:', JSON.stringify(coinData, null, 2).substring(0, 200));
    return;
  }

  console.log(`New coin: ${name} (${ticker})`);

  if (keywordMatcher.matches(name, ticker)) {
    console.log(`Match found! Name: ${name}, Ticker: ${ticker}`);
    sendCoinAlert('New Coin Created', name, ticker, coinData);
  } else {
    console.log(`Skipping ${name} (${ticker}) - no keyword match`);
  }
}

function handleTradeEvent(data: any): void {
}

function sendCoinAlert(eventType: string, name: string, ticker: string, data: any): void {
  // Extract URLs properly - handle both string and object formats
  const getUrl = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object' && value !== null) {
      // If it's an object, try to extract URL from common properties
      return (value.url || value.href || value.link || '').toString().trim();
    }
    return '';
  };

  const website = getUrl(data.website || data.websiteUrl || data.links?.website || '');
  const twitter = getUrl(data.twitter || data.twitterUrl || data.links?.twitter || data.socials?.twitter || '');
  const telegram = getUrl(data.telegram || data.telegramUrl || data.links?.telegram || data.socials?.telegram || '');

  const pairData = [
    data.mint || data.address || '',
    '',
    name,
    ticker,
    data.imageUrl || data.image || '',
    6,
    'Pump.fun',
    website,
    twitter,
    telegram,
    '',
    '',
    0,
    0,
    0,
    0,
    0,
    0,
    data.bondingCurve || '',
    data.associatedBondingCurve || '',
    data.creationTime || Date.now(),
    data.dev || '',
  ];

  discordWebhook.sendPairAlert(pairData).catch(error => {
    console.error('Failed to send Discord alert:', error);
  });
}

function handleError(error: Error): void {
  console.error('WebSocket error:', error);
}

console.log('Starting Pump.fun Monitor...');
console.log(`Keywords file: ${KEYWORDS_FILE}`);
console.log(`WebSocket URL: ${WEBSOCKET_URL}`);
console.log(`Loaded keywords: ${keywordMatcher.getKeywords().join(', ') || 'None'}`);

wsClient.connect(handleMessage, handleError);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wsClient.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  wsClient.disconnect();
  process.exit(0);
});
