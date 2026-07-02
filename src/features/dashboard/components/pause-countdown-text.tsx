"use client";

import { useEffect, useState } from "react";
import { formatRemainingPause } from "../formatters";

export function PauseCountdownText({ pauseUntil }: { pauseUntil: string }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return <>{formatRemainingPause(pauseUntil, nowMs)}</>;
}
