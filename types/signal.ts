export interface SignalSource {
  id: string;
  user_id: string | null;
  name: string;
  type: "api" | "scraper";
  config_json: SignalSourceConfig;
  is_global: boolean;
  created_at: string;
}

export interface SignalSourceConfig {
  url: string;
  jsonpath?: string; // For API type
  selector?: string; // For scraper type
  headers?: Record<string, string>;
  transform?: string; // Optional JS expression to transform value
}

export interface SignalReading {
  id: string;
  source_id: string;
  value: number;
  raw_response: unknown;
  fetched_at: string;
}

export interface CreateSignalSourceInput {
  name: string;
  type: "api" | "scraper";
  config_json: SignalSourceConfig;
  is_global?: boolean;
}

// Pre-defined signal sources
export const BUILTIN_SIGNAL_SOURCES = [
  {
    id: "fear_greed_crypto",
    name: "Fear & Greed Index (Crypto)",
    type: "api" as const,
    config_json: {
      url: "https://api.alternative.me/fng/",
      jsonpath: "$.data[0].value",
    },
    description:
      "Crypto Fear & Greed Index from alternative.me (0-100 scale, 0 = Extreme Fear, 100 = Extreme Greed)",
  },
] as const;
