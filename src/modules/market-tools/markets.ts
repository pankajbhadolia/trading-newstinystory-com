export const worldClocks = [
  { city: "Mumbai", zone: "Asia/Kolkata" },
  { city: "London", zone: "Europe/London" },
  { city: "New York", zone: "America/New_York" },
  { city: "Tokyo", zone: "Asia/Tokyo" },
  { city: "Singapore", zone: "Asia/Singapore" },
  { city: "Sydney", zone: "Australia/Sydney" },
] as const;

export function formatMarketTime(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, weekday: "short", day: "numeric", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", timeZoneName: "short",
  }).format(date);
}

export function clockHandAngles(date: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: "hour" | "minute" | "second") => {
    const part = parts.find((item) => item.type === type);
    if (!part) throw new Error(`Missing ${type} in formatted market time.`);
    return Number(part.value);
  };
  const hour = value("hour");
  const minute = value("minute");
  const second = value("second");
  return {
    hour: (hour % 12) * 30 + minute * 0.5 + second / 120,
    minute: minute * 6 + second / 10,
    second: second * 6,
  };
}

export const marketSchedules = [
  {
    name: "Indian equity market", zone: "Asia/Kolkata",
    sessions: "Non-F&O stocks: 09:15–15:30; F&O stocks: 09:15–15:15, followed by a closing auction until 15:30.",
    source: "https://support.zerodha.com/category/trading-and-markets/trading-faqs/market-sessions/articles/what-are-the-market-timings",
    sourceLabel: "Zerodha market timings",
  },
  {
    name: "New York Stock Exchange (NYSE)", zone: "America/New_York",
    sessions: "Core equity session: 09:30–16:00.",
    source: "https://www.nyse.com/trade/hours-calendars",
    sourceLabel: "NYSE hours and calendar",
  },
  {
    name: "Tokyo Stock Exchange (TSE)", zone: "Asia/Tokyo",
    sessions: "Equity auction trading: 09:00–11:30 and 12:30–15:30.",
    source: "https://www.jpx.co.jp/english/equities/trading/domestic/01.html",
    sourceLabel: "JPX trading hours",
  },
] as const;
