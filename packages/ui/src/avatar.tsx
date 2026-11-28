import { useState } from "react";

export interface AvatarProps {
  name: string;
  /** Initials or other caller-provided local fallback. */
  initials?: string;
  /** Local image URL only. Remote and script/data SVG schemes fail closed. */
  src?: string;
  status?: "online" | "offline" | "busy";
  statusLabel?: string;
  className?: string;
}

/** Display-only identity marker with accessible name and optional status. */
export function Avatar({ name, initials, src, status, statusLabel, className }: AvatarProps) {
  const normalized = src?.trim().replaceAll("\\", "/");
  if (
    normalized &&
    (/^\/\//.test(normalized) ||
      (/^[a-z][a-z0-9+.-]*:/i.test(normalized) &&
        !/^(?:blob:|data:image\/(?:png|jpe?g|webp|gif);base64,)/i.test(normalized)))
  ) {
    throw new Error("Avatar images must use local or raster data URLs.");
  }
  const [failedSource, setFailedSource] = useState<string>();
  const fallback =
    initials ??
    name
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((word) => Array.from(word)[0] ?? "")
      .join("");
  const statusText = status ? (statusLabel ?? status) : undefined;
  return (
    <span
      className={["ui-avatar", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={[name, statusText].filter(Boolean).join(", ")}
    >
      {src && failedSource !== src ? (
        <img className="ui-avatar__image" src={src} alt="" onError={() => setFailedSource(src)} />
      ) : (
        <span aria-hidden="true">{fallback || "?"}</span>
      )}
      {status && <span className="ui-avatar__status" data-status={status} aria-hidden="true" />}
    </span>
  );
}
