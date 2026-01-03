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

export class AlpacaClient {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(config: AlpacaConfig) {
    this.baseUrl = config.paper
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets";

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
   */
  async validateSymbols(symbols: string[]): Promise<string[]> {
    if (symbols.length === 0) return [];
    
    const validSymbols: string[] = [];
    
    // Validate each symbol individually to avoid Alpaca returning all assets
    // when given invalid symbols
    for (const symbol of symbols) {
      try {
        const asset = await this.request<any>(`/v2/assets/${symbol}`);
        
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
}

export type {
  AlpacaConfig,
  AlpacaAccount,
  AlpacaClock,
  AlpacaPosition,
  AlpacaOrder,
  OrderRequest,
};
