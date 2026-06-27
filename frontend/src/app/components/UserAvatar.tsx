import { Compass } from "lucide-react";
import { cn } from "../lib/utils";

interface UserAvatarProps {
  name: string;
  seed?: string;
  className?: string;
  initialsClassName?: string;
  badgeClassName?: string;
}

const avatarPalettes = [
  "from-sky-500 via-blue-500 to-cyan-400",
  "from-emerald-500 via-teal-500 to-sky-400",
  "from-indigo-500 via-blue-500 to-slate-500",
  "from-rose-500 via-orange-400 to-amber-400",
  "from-violet-500 via-indigo-500 to-blue-500",
  "from-slate-600 via-slate-500 to-sky-500",
];

function hashSeed(seed: string) {
  return [...seed].reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "VJ";
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : parts[0]?.[1] || "";
  return `${first}${last}`.toUpperCase();
}

export function UserAvatar({
  name,
  seed,
  className,
  initialsClassName,
  badgeClassName,
}: UserAvatarProps) {
  const safeName = name.trim() || "VietJourney";
  const palette = avatarPalettes[hashSeed(seed || safeName) % avatarPalettes.length];

  return (
    <span
      aria-label={safeName}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-primary-foreground shadow-sm ring-2 ring-card",
        palette,
        className,
      )}
      title={safeName}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.5),transparent_32%)]" />
      <span
        className={cn(
          "relative z-10 font-black uppercase tracking-normal text-white drop-shadow-sm",
          initialsClassName,
        )}
      >
        {initialsFor(safeName)}
      </span>
      <span
        className={cn(
          "absolute bottom-0 right-0 z-20 flex items-center justify-center rounded-full border border-card bg-card text-primary shadow-sm",
          badgeClassName,
        )}
      >
        <Compass className="size-3" strokeWidth={2.6} />
      </span>
    </span>
  );
}
