import Image from "next/image";
import { Wifi, WifiOff } from "lucide-react";
import { SECONDARY_BUTTON_CLASS } from "../constants";
import { getStreamLabel, streamTone } from "../formatters";
import type { StreamStatus } from "../state";

interface DashboardHeaderProps {
  offlineMode: boolean;
  streamStatus: StreamStatus;
  onToggleOfflineMode: () => void;
}

export function DashboardHeader({
  offlineMode,
  streamStatus,
  onToggleOfflineMode,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <Image
          src="/user-avatar.png"
          alt="Demo user avatar"
          width={48}
          height={48}
          className="h-12 w-12 rounded-full border border-slate-300 object-cover"
        />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
            Subscription billing runner
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">Demo control room</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${streamTone(
            streamStatus,
          )}`}
        >
          {streamStatus === "offline" ? (
            <WifiOff className="h-4 w-4" />
          ) : (
            <Wifi className="h-4 w-4" />
          )}
          <span>{getStreamLabel(streamStatus)}</span>
        </div>
        <button
          type="button"
          className={SECONDARY_BUTTON_CLASS}
          title={
            offlineMode
              ? "Reconnect this tab to the live event stream."
              : "Temporarily disconnect this tab from the live event stream."
          }
          onClick={onToggleOfflineMode}
        >
          {offlineMode ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Go online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Go offline</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
