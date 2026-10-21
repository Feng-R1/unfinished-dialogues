import type { CSSProperties } from "react";

const paths = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  back: "M19 12H5m5-5-5 5 5 5",
  close: "m6 6 12 12M18 6 6 18",
  book: "M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15",
  clock: "M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  spark: "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z",
  plus: "M12 5v14M5 12h14",
  settings: "M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6",
  pause: "M9 5v14M15 5v14",
  play: "m8 5 11 7-11 7V5Z",
  volume: "M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
  mute: "M11 4 5 9H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7",
  retry: "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.8-1L20 9M4 15l2.1 3a7 7 0 0 0 11.8-1",
  stop: "M6 6h12v12H6Z",
  check: "m5 12 4 4L19 6",
  external: "M14 3h7v7m0-7L10 14M10 3H4v17h17v-6",
  down: "m6 9 6 6 6-6",
  quote: "M10 6H4v7h6V6Zm10 0h-6v7h6V6ZM10 13c0 4-2 5-5 6m15-6c0 4-2 5-5 6",
  leaf: "M5 19c-6-11 4-14 15-15-1 11-4 21-15 15Zm0 0L15 9",
  copy: "M9 9h12v12H9zM15 9V3H3v12h6",
} as const;
export type IconName = keyof typeof paths;
export function Icon({ name, size = 20, className = "", style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true"><path d={paths[name]} /></svg>;
}
export function Mark({ size = 35 }: { size?: number }) {
  return <svg width={size} height={size + 2} viewBox="0 0 35 37" fill="none" aria-hidden="true"><path d="M5 32V17a12.5 12.5 0 0 1 25 0v15M10 32V17a7.5 7.5 0 0 1 15 0v15M2 33h31" stroke="currentColor" strokeWidth="1.2"/><circle cx="17.5" cy="21" r="2" fill="currentColor"/></svg>;
}
