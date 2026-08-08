import { useEffect } from "react";

// JS-side rather than a static index.html/robots.txt change: production
// and the demo share one repo and one build, so a static file would
// wrongly deindex production too. This component is only ever mounted
// when DEMO_MODE is true (see App.tsx).
export function DemoSeoGuard() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
  return null;
}
