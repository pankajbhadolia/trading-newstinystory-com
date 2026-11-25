"use client";

import { useEffect, useState } from "react";
import { clockHandAngles, formatMarketTime, marketSchedules, worldClocks } from "@/modules/market-tools/markets";

function useCurrentTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);
  return now;
}

function AnalogClock({ now, zone }: { now: Date | null; zone: string }) {
  const hands = now ? clockHandAngles(now, zone) : null;
  return <svg className="world-clock-face" viewBox="0 0 120 120" aria-hidden="true">
    <circle className="world-clock-dial" cx="60" cy="60" r="56" />
    {Array.from({ length: 12 }, (_, index) => <line className="world-clock-tick" key={index} x1="60" y1="10" x2="60" y2={index % 3 === 0 ? 17 : 14} transform={`rotate(${index * 30} 60 60)`} />)}
    {hands && <>
      <line className="world-clock-hour" x1="60" y1="63" x2="60" y2="33" transform={`rotate(${hands.hour} 60 60)`} />
      <line className="world-clock-minute" x1="60" y1="64" x2="60" y2="22" transform={`rotate(${hands.minute} 60 60)`} />
      <line className="world-clock-second" x1="60" y1="69" x2="60" y2="19" transform={`rotate(${hands.second} 60 60)`} />
      <circle className="world-clock-centre" cx="60" cy="60" r="3" />
    </>}
  </svg>;
}

export function WorldClock() {
  const now = useCurrentTime();
  return <>
    <p className="market-tool-note">Times use your device clock and time-zone data, including daylight saving time where applicable.</p>
    <div className="market-tool-grid">{worldClocks.map((clock) => <section className="ui-card market-tool-card" key={clock.zone}>
      <h2>{clock.city}</h2><p>{clock.zone}</p><AnalogClock now={now} zone={clock.zone} /><strong>{now ? formatMarketTime(now, clock.zone) : "Loading time…"}</strong>
    </section>)}</div>
  </>;
}

export function MarketTimings() {
  const now = useCurrentTime();
  return <>
    <div className="directory-notice">Static reference hours only, not a live open/closed indicator. Holidays, special sessions, interruptions and early closes are not included. Verify the current schedule with the exchange before trading. Hours vary by instrument.</div>
    <div className="market-tool-grid">{marketSchedules.map((market) => <section className="ui-card market-tool-card" key={market.name}>
      <h2>{market.name}</h2><p>{market.zone} · regular weekday hours</p><strong>{market.sessions}</strong>
      <p>Current local time: {now ? formatMarketTime(now, market.zone) : "Loading time…"}</p>
      <a className="text-link" href={market.source} target="_blank" rel="noopener noreferrer">{market.sourceLabel} ↗</a>
    </section>)}</div>
  </>;
}
