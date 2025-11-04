import WebSocket from 'ws';

export interface NATSMessage {
  subject: string;
  sid: string;
  payload?: any;
  data?: any;
}

export interface NATSConnectOptions {
  user: string;
  pass: string;
  lang?: string;
  version?: string;
  headers?: boolean;
  verbose?: boolean;
  pedantic?: boolean;
  no_responders?: boolean;
  protocol?: number;
}

export class NATSWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private connectOptions: NATSConnectOptions;
  private subscriptions: Map<string, number> = new Map();
  private sidCounter: number = 1;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private buffer: string = '';

  constructor(url: string, connectOptions: NATSConnectOptions) {
    this.url = url;
    this.connectOptions = connectOptions;
  }

  connect(onMessage: (message: NATSMessage) => void, onError?: (error: Error) => void): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    this.buffer = '';
    console.log(`Connecting to ${this.url}...`);

    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.clearReconnectTimer();

      setTimeout(() => {
        this.sendConnect();
        
        setTimeout(() => {
          this.subscribeToSubjects();
        }, 100);
      }, 100);
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const rawData = data.toString();
        this.buffer += rawData;
        this.processBuffer(onMessage);
      } catch (error) {
        console.error('Error handling message:', error);
        console.error('Raw data:', data.toString().substring(0, 500));
      }
    });

    this.ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
      if (onError) {
        onError(error);
      }
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      const reasonStr = reason.toString();
      console.log(`WebSocket closed (code: ${code}, reason: ${reasonStr})`);
      
      if (code === 1008 || reasonStr.includes('401') || reasonStr.includes('Unauthorized')) {
        console.error('Connection closed due to authentication failure.');
        this.isConnecting = false;
        this.clearReconnectTimer();
        return;
      }
      
      console.log('Attempting to reconnect...');
      this.isConnecting = false;
      this.scheduleReconnect(() => {
        this.connect(onMessage, onError);
      });
    });
  }

  private sendConnect(): void {
    const connectCmd = `CONNECT ${JSON.stringify(this.connectOptions)}\r\n`;
    console.log(`Sending CONNECT: ${connectCmd.trim()}`);
    this.sendRaw(connectCmd);
  }

  private subscribeToSubjects(): void {
    const subjects = [
      'advancedNewCoinCreated'
    ];

    subjects.forEach(subject => {
      const sid = this.sidCounter++;
      this.subscriptions.set(subject, sid);
      const subCmd = `SUB ${subject} ${sid}\r\n`;
      console.log(`Subscribing to ${subject} (sid: ${sid})`);
      this.sendRaw(subCmd);
    });
  }

  private processBuffer(onMessage: (message: NATSMessage) => void): void {
    while (this.buffer.length > 0) {
      const msgEnd = this.buffer.indexOf('\r\n');
      if (msgEnd === -1) {
        break;
      }

      const line = this.buffer.substring(0, msgEnd);
      this.buffer = this.buffer.substring(msgEnd + 2);

      if (!line.trim()) continue;

      if (line.startsWith('MSG ')) {
        const parts = line.split(' ');
        if (parts.length >= 4) {
          const subject = parts[1];
          const sid = parts[2];
          const byteCount = parseInt(parts[parts.length - 1]);

          if (this.buffer.length < byteCount + 2) {
            this.buffer = line + '\r\n' + this.buffer;
            break;
          }

          const payload = this.buffer.substring(0, byteCount);
          this.buffer = this.buffer.substring(byteCount + 2);

          try {
            const parsedPayload = JSON.parse(payload);
            console.log(`MSG received: ${subject} (sid: ${sid})`);
            
            const message: NATSMessage = {
              subject,
              sid,
              payload: parsedPayload,
              data: parsedPayload
            };
            
            onMessage(message);
          } catch (error) {
            console.log(`MSG received: ${subject} (sid: ${sid}) - raw: ${payload.substring(0, 100)}`);
            
            const message: NATSMessage = {
              subject,
              sid,
              payload,
              data: payload
            };
            
            onMessage(message);
          }
        }
      } else if (line.startsWith('PING')) {
        console.log('Received PING, sending PONG');
        this.sendRaw('PONG\r\n');
      } else if (line.startsWith('INFO')) {
        console.log('NATS INFO:', line);
      } else if (line.startsWith('+OK')) {
        console.log('NATS OK:', line);
      } else if (line.startsWith('-ERR')) {
        console.error('NATS ERROR:', line);
      } else {
        console.log(`NATS message: ${line.substring(0, 200)}`);
      }
    }
  }

  private sendRaw(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      console.warn(`WebSocket is not open. Cannot send: ${message.trim()}`);
    }
  }

  private scheduleReconnect(callback: () => void): void {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      callback();
    }, this.reconnectInterval);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(): void {
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
