import { decrypt } from "@/lib/utils/crypto";

interface AlpacaConfig {
  apiKey: string;
  apiSecret: string;
  paper: boolean;
}

interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
}

interface AlpacaClock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  status: string;
}

interface OrderRequest {
  symbol: string;
  qty?: string;
  notional?: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  time_in_force: "day" | "gtc" | "ioc" | "fok";
  limit_price?: number;
}

// SAFETY: Prevent live trading - only paper trading allowed
const FORCE_PAPER_TRADING = true;

/**
 * Check if symbol is a crypto pair (contains slash)
 */
function isCryptoSymbol(symbol: string): boolean {
  return symbol.includes('/');
}

export class AlpacaClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: AlpacaConfig) {
    // SAFETY: Force paper trading regardless of config
    const isPaper = FORCE_PAPER_TRADING || config.paper;
    
    if (!isPaper) {
      throw new Error("SAFETY: Live trading is disabled. Only paper trading is allowed.");
    }

    this.baseUrl = "https://paper-api.alpaca.markets";

    this.headers = {
      "APCA-API-KEY-ID": config.apiKey,
      "APCA-API-SECRET-KEY": config.apiSecret,
      "Content-Type": "application/json",
    };
  }

  static fromEncrypted(
    encryptedApiKey: string,
    encryptedApiSecret: string,
    paper: boolean = true
  ): AlpacaClient {
    return new AlpacaClient({
      apiKey: decrypt(encryptedApiKey),
      apiSecret: decrypt(encryptedApiSecret),
      paper,
    });
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Alpaca API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getAccount(): Promise<AlpacaAccount> {
    return this.request<AlpacaAccount>("/v2/account");
  }

  async getClock(): Promise<AlpacaClock> {
    return this.request<AlpacaClock>("/v2/clock");
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>("/v2/positions");
  }

  async getPosition(symbol: string): Promise<AlpacaPosition> {
    return this.request<AlpacaPosition>(`/v2/positions/${symbol}`);
  }

  async getOrders(params?: {
    status?: "open" | "closed" | "all";
    limit?: number;
    after?: string;
    until?: string;
  }): Promise<AlpacaOrder[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.after) queryParams.append("after", params.after);
    if (params?.until) queryParams.append("until", params.until);

    const query = queryParams.toString();
    return this.request<AlpacaOrder[]>(`/v2/orders${query ? `?${query}` : ""}`);
  }

  async createOrder(order: OrderRequest): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>("/v2/orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request(`/v2/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  async cancelAllOrders(): Promise<void> {
    await this.request("/v2/orders", {
      method: "DELETE",
    });
  }

  async validateConnection(): Promise<boolean> {
    try {
      const account = await this.getAccount();
      return account.status === "ACTIVE";
    } catch {
      return false;
    }
  }

  /**
   * Get asset information for a single symbol
   */
  async getAsset(symbol: string): Promise<any> {
    return this.request(`/v2/assets/${symbol}`);
  }

  /**
   * Validate multiple symbols at once
   * Returns array of valid symbols that are tradable
   * Handles both stock symbols (AAPL) and crypto pairs (BTC/USD)
   */
  async validateSymbols(symbols: string[]): Promise<string[]> {
    if (symbols.length === 0) return [];
    
    const validSymbols: string[] = [];
    
    // Validate each symbol individually to avoid Alpaca returning all assets
    // when given invalid symbols
    for (const symbol of symbols) {
      try {
        // Crypto symbols need to be URL-encoded (BTC/USD -> BTC%2FUSD)
        const encodedSymbol = isCryptoSymbol(symbol) 
          ? encodeURIComponent(symbol)
          : symbol;
          
        const asset = await this.request<any>(`/v2/assets/${encodedSymbol}`);
        
        // Only include tradable and active assets
        if (asset.tradable && asset.status === 'active') {
          validSymbols.push(asset.symbol);
        }
      } catch (error) {
        // Symbol is invalid or not found, skip it
        continue;
      }
    }
    
    return validSymbols;
  }

  /**
   * Get historical bars (price data) for a symbol
   * Uses the Alpaca Data API (data.alpaca.markets)
   * Automatically detects crypto vs stock symbols
   */
  async getBars(
    symbol: string,
    params: {
      timeframe?: string; // "1Day", "1Hour", etc.
      start?: string; // ISO date string
      end?: string; // ISO date string
      limit?: number;
    } = {}
  ): Promise<Bar[]> {
    const {
      timeframe = "1Day",
      limit = 30,
    } = params;

    // Calculate start date (default: 30 days ago)
    const end = params.end || new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (limit + 5)); // Add buffer for weekends/holidays
    const start = params.start || startDate.toISOString();

    const queryParams = new URLSearchParams({
      timeframe,
      start,
      end,
      limit: limit.toString(),
    });

    // Use Alpaca Data API (different base URL)
    const dataUrl = "https://data.alpaca.markets";
    
    // Use crypto endpoint for crypto symbols, stocks endpoint for equities
    const endpoint = isCryptoSymbol(symbol)
      ? `/v1beta3/crypto/us/bars?symbols=${symbol}&${queryParams}`
      : `/v2/stocks/${symbol}/bars?${queryParams}`;
    
    const response = await fetch(
      `${dataUrl}${endpoint}`,
      {
        headers: this.headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Alpaca Data API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Crypto response format is different - it's { bars: { "BTC/USD": [...] } }
    if (isCryptoSymbol(symbol)) {
      return data.bars?.[symbol] || [];
    }
    
    return data.bars || [];
  }

  /**
   * Get bars for multiple symbols at once
   * Handles mixed crypto and stock symbols automatically
   */
  async getMultiBars(
    symbols: string[],
    params: {
      timeframe?: string;
      start?: string;
      end?: string;
      limit?: number;
    } = {}
  ): Promise<Record<string, Bar[]>> {
    const {
      timeframe = "1Day",
      limit = 30,
    } = params;

    const end = params.end || new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (limit + 5));
    const start = params.start || startDate.toISOString();

    // Separate crypto and stock symbols
    const cryptoSymbols = symbols.filter(isCryptoSymbol);
    const stockSymbols = symbols.filter(s => !isCryptoSymbol(s));

    const result: Record<string, Bar[]> = {};

    // Fetch stock data if any
    if (stockSymbols.length > 0) {
      const queryParams = new URLSearchParams({
        symbols: stockSymbols.join(","),
        timeframe,
        start,
        end,
        limit: limit.toString(),
        feed: "iex", // Use IEX feed (free) instead of SIP (paid)
      });

      const dataUrl = "https://data.alpaca.markets";
      try {
        const response = await fetch(
          `${dataUrl}/v2/stocks/bars?${queryParams}`,
          {
            headers: this.headers,
          }
        );

        if (response.ok) {
          const data = await response.json();
          Object.assign(result, data.bars || {});
        }
      } catch (error) {
        console.error('Error fetching stock bars:', error);
      }
    }

    // Fetch crypto data if any
    if (cryptoSymbols.length > 0) {
      const queryParams = new URLSearchParams({
        symbols: cryptoSymbols.join(","),
        timeframe,
        start,
        end,
        limit: limit.toString(),
      });

      const dataUrl = "https://data.alpaca.markets";
      try {
        const response = await fetch(
          `${dataUrl}/v1beta3/crypto/us/bars?${queryParams}`,
          {
            headers: this.headers,
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Crypto returns nested structure: { bars: { "BTC/USD": [...] } }
          Object.assign(result, data.bars || {});
        }
      } catch (error) {
        console.error('Error fetching crypto bars:', error);
      }
    }

    return result;
  }
}

export interface Bar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n: number; // number of trades
  vw: number; // volume weighted average price
}

export type {
  AlpacaConfig,
  AlpacaAccount,
  AlpacaClock,
  AlpacaPosition,
  AlpacaOrder,
  OrderRequest,
};
