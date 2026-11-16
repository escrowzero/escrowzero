import { createServerFn } from "@tanstack/react-start";

export type LiveQuote = { price: number; change24h: number | null };
export type LivePrices = Partial<Record<"ETH" | "NVDA" | "TSLA" | "AAPL" | "SPY" | "USDG", LiveQuote>>;

async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`price ${response.status}`);
  return response.json();
}

async function ethQuote(): Promise<LiveQuote> {
  const body = await getJson("https://api.kraken.com/0/public/Ticker?pair=XETHZUSD");
  const row = body.result.XETHZUSD;
  const price = Number(row.c[0]);
  const open = Number(row.o);
  if (!Number.isFinite(price) || price <= 0) throw new Error("bad eth price");
  const change24h = Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null;
  return { price, change24h };
}

async function stockQuote(symbol: string): Promise<LiveQuote> {
  const body = await getJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
  );
  const meta = body.chart.result[0].meta;
  const price = Number(meta.regularMarketPrice);
  const prev = Number(meta.chartPreviousClose ?? meta.previousClose);
  if (!Number.isFinite(price) || price <= 0) throw new Error(`bad ${symbol} price`);
  const change24h = Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : null;
  return { price, change24h };
}

async function usdgQuote(): Promise<LiveQuote> {
  const body = await getJson("https://api.coinbase.com/v2/prices/USDG-USD/spot");
  const price = Number(body.data.amount);
  if (!Number.isFinite(price) || price <= 0) throw new Error("bad usdg price");
  return { price, change24h: null };
}

export const getLivePrices = createServerFn({ method: "GET" }).handler(async (): Promise<LivePrices> => {
  const jobs: Array<[keyof LivePrices, Promise<LiveQuote>]> = [
    ["ETH", ethQuote()],
    ["NVDA", stockQuote("NVDA")],
    ["TSLA", stockQuote("TSLA")],
    ["AAPL", stockQuote("AAPL")],
    ["SPY", stockQuote("SPY")],
    ["USDG", usdgQuote()],
  ];
  const settled = await Promise.allSettled(jobs.map(([, job]) => job));
  const prices: LivePrices = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") prices[jobs[index][0]] = result.value;
  });
  return prices;
});
