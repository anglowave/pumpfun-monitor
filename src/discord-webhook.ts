import axios, { AxiosInstance } from 'axios';

export interface PairData {
  name: string;
  ticker: string;
  mint: string;
  baseMint: string;
  creator: string;
  imageUrl: string;
  ammType: string;
  website: string;
  twitter: string;
  telegram: string;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  [key: string]: any;
}

export class DiscordWebhook {
  private webhookUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  async sendPairAlert(pairData: any[]): Promise<void> {
    try {
      const name = pairData[2] || 'Unknown';
      const ticker = pairData[3] || 'Unknown';
      const mint = pairData[0] || 'Unknown';
      const creator = pairData[pairData.length - 1] || pairData[21] || 'Unknown';
      const imageUrl = String(pairData[4] || '').trim();
      const ammType = String(pairData[6] || 'Unknown');
      const website = String(pairData[7] || '').trim();
      const twitter = String(pairData[8] || '').trim();
      const telegram = String(pairData[9] || '').trim();

      const embed: {
        title: string;
        description: string;
        color: number;
        fields: Array<{ name: string; value: string; inline: boolean }>;
        timestamp: string;
        footer: { text: string };
        thumbnail?: { url: string };
      } = {
        title: `🚨 New Token Match: ${name} (${ticker})`,
        description: `**Keyword match detected!**`,
        color: 0x00ff00,
        fields: [
          {
            name: '🪙 Token Info',
            value: `**Name:** ${name}\n**Ticker:** ${ticker}\n**AMM:** ${ammType}`,
            inline: true
          },
          {
            name: '🔑 Addresses',
            value: `**Mint:** \`${mint}\`\n**Creator:** \`${creator}\``,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Pump.fun Monitor'
        }
      };

      const links: string[] = [];
      if (website && website !== '' && website !== '[object Object]' && website.startsWith('http')) {
        links.push(`[Website](${website})`);
      }
      if (twitter && twitter !== '' && twitter !== '[object Object]' && twitter.startsWith('http')) {
        links.push(`[Twitter](${twitter})`);
      }
      if (telegram && telegram !== '' && telegram !== '[object Object]' && telegram.startsWith('http')) {
        links.push(`[Telegram](${telegram})`);
      }
      
      if (links.length > 0) {
        embed.fields.push({
          name: '🔗 Links',
          value: links.join(' | '),
          inline: false
        });
      }

      if (imageUrl) {
        embed.thumbnail = { url: imageUrl };
      }

      const payload = {
        username: 'Pump.fun Monitor',
        embeds: [embed]
      };

      await this.axiosInstance.post(this.webhookUrl, payload);
      console.log(`Sent Discord alert for ${name} (${ticker})`);
    } catch (error: any) {
      console.error('Error sending Discord webhook:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }
}

