import React, { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  ticker: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({ ticker }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    container.current.innerHTML = '';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Check if dark mode is active on the document root
    const isDark = document.documentElement.classList.contains('dark');

    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "NASDAQ:${ticker}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "${isDark ? 'dark' : 'light'}",
        "style": "1",
        "locale": "he_IL",
        "enable_publishing": false,
        "backgroundColor": "rgba(0, 0, 0, 0)",
        "gridColor": "${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
      }`;
    container.current.appendChild(script);
  }, [ticker]);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
    </div>
  );
});
