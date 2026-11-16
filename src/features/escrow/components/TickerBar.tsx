import React, { useEffect, useRef, useState } from 'react';
import { TokenAsset } from '../types';

interface TickerBarProps {
  tokens: Record<string, TokenAsset>;
}

function formatPrice(price: number) {
  if (price <= 0) return "—";
  if (price < 1) return `$${price.toFixed(4)}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TickerBar: React.FC<TickerBarProps> = ({ tokens }) => {
  const tokenList = Object.values(tokens);
  const previous = useRef<Record<string, number>>({});
  const [ticks, setTicks] = useState<Record<string, "up" | "down">>({});

  useEffect(() => {
    const next: Record<string, "up" | "down"> = {};
    for (const token of tokenList) {
      const before = previous.current[token.symbol];
      if (before && token.priceUsd > 0 && token.priceUsd !== before) {
        next[token.symbol] = token.priceUsd > before ? "up" : "down";
      }
      previous.current[token.symbol] = token.priceUsd;
    }
    if (Object.keys(next).length === 0) return;
    setTicks(next);
    const timer = window.setTimeout(() => setTicks({}), 1200);
    return () => window.clearTimeout(timer);
  }, [tokens]);

  const row = (copy: string) => (
    <div className="flex items-center gap-8 pr-8" aria-hidden={copy === "b" ? true : undefined}>
      {tokenList.map((token) => {
        const tick = ticks[token.symbol];
        return (
          <div key={`${copy}-${token.symbol}`} className="flex items-center gap-2 shrink-0">
            <span className="font-robotics font-bold text-[#3a5e3c]">${token.symbol}</span>
            <span className={`tabular-nums font-semibold transition-colors ${tick === "up" ? "ticker-up" : tick === "down" ? "ticker-down" : "text-[#3a5e3c]"}`}>
              {tick === "up" ? "↑ " : tick === "down" ? "↓ " : ""}
              {formatPrice(token.priceUsd)}
            </span>
            {token.priceUsd > 0 && token.change24h != null && (
              <span className={`text-[11px] font-bold tabular-nums ${token.change24h >= 0 ? "text-[#145c32]" : "text-rose-700"}`}>
                {token.change24h >= 0 ? "+" : ""}
                {token.change24h.toFixed(2)}%
              </span>
            )}
            <span className="text-[rgba(58,94,60,0.16)]">|</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="w-full max-w-full bg-[#d9fce8] border-b border-[rgba(58,94,60,0.12)] py-1.5 overflow-hidden select-none text-[#3a5e3c]">
      <div className="flex items-center text-xs font-mono min-w-0">
        <div className="hidden md:flex items-center gap-2 pl-4 pr-3 border-r border-[rgba(58,94,60,0.12)] shrink-0 text-[#1e3a2c] bg-[#d9fce8] z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-[#82f5ad] led-blink-green" />
          <span className="text-[#3a5e3c] font-robotics font-bold">RBN-L2 LIVE FEED</span>
          <span className="text-[#1e3a2c] text-[10px]">LIVE</span>
        </div>
        <div className="overflow-hidden flex-1 relative min-w-0">
          <div className="ticker-track">
            {row("a")}
            {row("b")}
          </div>
        </div>
      </div>
    </div>
  );
};
