import { SignalSourceConfig } from "@/types/signal";

export interface FetchSignalResult {
  value: number;
  raw: unknown;
  fetchedAt: string;
}

/**
 * Fetches a signal value from an external source
 */
export async function fetchSignal(
  type: "api" | "scraper",
  config: SignalSourceConfig
): Promise<FetchSignalResult> {
  if (type === "api") {
    return fetchApiSignal(config);
  } else {
    return fetchScraperSignal(config);
  }
}

/**
 * Fetches signal from a JSON API endpoint
 */
async function fetchApiSignal(
  config: SignalSourceConfig
): Promise<FetchSignalResult> {
  const response = await fetch(config.url, {
    headers: config.headers ?? {},
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch signal: ${response.status}`);
  }

  const data = await response.json();
  const value = extractJsonPath(data, config.jsonpath ?? "$");

  return {
    value: parseFloat(value),
    raw: data,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetches signal by scraping HTML page
 * Note: This is a simplified implementation. For production,
 * consider using a headless browser or a dedicated scraping service.
 */
async function fetchScraperSignal(
  config: SignalSourceConfig
): Promise<FetchSignalResult> {
  const response = await fetch(config.url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ...config.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }

  const html = await response.text();

  // Simple regex-based extraction
  // For production, use a proper HTML parser like cheerio
  const selector = config.selector ?? "";
  const match = html.match(new RegExp(selector));

  if (!match || !match[1]) {
    throw new Error(`Could not extract value with selector: ${selector}`);
  }

  const value = parseFloat(match[1].replace(/[^0-9.-]/g, ""));

  return {
    value,
    raw: { html: html.substring(0, 1000) }, // Truncate for storage
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Simple JSONPath extractor
 * Supports: $.data[0].value, $.items[*].price, etc.
 */
function extractJsonPath(data: unknown, path: string): string {
  if (path === "$") return String(data);

  const parts = path
    .replace(/^\$\.?/, "")
    .split(/[.\[\]]/)
    .filter(Boolean);

  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      throw new Error(`Cannot access ${part} of null/undefined`);
    }

    if (part === "*") {
      // Return first element of array
      if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      } else {
        throw new Error("Expected array for wildcard");
      }
    } else if (!isNaN(Number(part))) {
      // Array index
      if (Array.isArray(current)) {
        current = current[Number(part)];
      } else {
        throw new Error(`Cannot index non-array with ${part}`);
      }
    } else {
      // Object property
      if (typeof current === "object" && current !== null) {
        current = (current as Record<string, unknown>)[part];
      } else {
        throw new Error(`Cannot access property ${part} of non-object`);
      }
    }
  }

  return String(current);
}

/**
 * Fetch the Fear & Greed Index from alternative.me
 */
export async function fetchFearGreedIndex(): Promise<FetchSignalResult> {
  const response = await fetch("https://api.alternative.me/fng/", {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Fear & Greed Index: ${response.status}`);
  }

  const data = await response.json();

  return {
    value: parseInt(data.data[0].value, 10),
    raw: data,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get the classification for a Fear & Greed value
 */
export function getFearGreedClassification(
  value: number
): "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed" {
  if (value <= 20) return "Extreme Fear";
  if (value <= 40) return "Fear";
  if (value <= 60) return "Neutral";
  if (value <= 80) return "Greed";
  return "Extreme Greed";
}
