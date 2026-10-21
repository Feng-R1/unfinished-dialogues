import type { Philosopher } from "@/lib/philosophers";

// Original vector studies. Interpretive portraits, not verified historical likenesses.
export function Portrait({ person, large = false }: { person: Philosopher; large?: boolean }) {
  const east = person.portrait === "east";
  const greek = person.portrait === "greek" || person.portrait === "roman";
  const woman = person.portrait === "woman";
  const monk = person.portrait === "monk";
  return <svg className={`portrait ${large ? "portrait-large" : ""}`} viewBox="0 0 160 180" role="img" aria-label={`${person.name}的艺术化肖像`} style={{ color: person.color }}>
    <defs><pattern id={`lines-${person.id}-${large}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="M0 0v5" stroke="currentColor" strokeWidth=".5" opacity=".18"/></pattern></defs>
    <path d="M15 171V79a65 65 0 0 1 130 0v92" fill="currentColor" opacity=".055"/>
    <path d="M21 165V80a59 59 0 0 1 118 0v85" stroke="currentColor" fill="none" opacity=".22" strokeWidth=".7"/>
    <path d="M26 176q5-39 34-44l5-23h31l5 23q31 4 34 44" fill={`url(#lines-${person.id}-${large})`} stroke="currentColor" strokeWidth="1" opacity=".8"/>
    <path d="M59 132q20 15 42 0M53 136l26 24 26-24M79 160l-4 17M44 146l-8 30M116 146l8 30" stroke="currentColor" fill="none" opacity=".5" strokeWidth=".9"/>
    {woman ? <><path d="M47 122q-12-39 1-67 7-22 33-23 31 0 37 30l-6 63-16 8-32-5Z" fill="currentColor" opacity=".14"/><path d="M50 109q-12-60 29-69 39 0 32 66M47 73q16-9 26-28 7 19 39 25" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M56 67q-3 27 4 43 9 18 21 18 16-1 24-23 4-17 0-37" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="m73 139 6 17 9-17M53 92q-7 23-5 39M110 86q7 29 2 47M60 54q8-11 18-10M90 45q14 3 18 16" stroke="currentColor" fill="none" opacity=".7"/></> : east ? <><path d="M54 67q-4-17 8-26l3-11h29l4 10q16 9 12 27M65 31q-5-15 13-15 18 0 16 15M57 47q23 9 46 0" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M55 62q-8 10-3 24l4 18q4 26 24 42 22-17 25-42l4-22q4-14-4-20M58 64q17 10 44 0" stroke="currentColor" fill="none" strokeWidth="1.1"/><path d="m64 106 16 8 16-8M61 106q2 23 19 39m20-40q-4 23-20 40M70 116l10 27 10-27M78 116l2 27" stroke="currentColor" fill="none" opacity=".7" strokeWidth=".8"/></> : greek ? <><path d="M51 70q-9-22 7-31 2-13 15-10 11-7 18 1 14-3 18 12 12 6 3 28M53 69q-9 12-1 24l5 14q2 30 23 35 25-9 24-35l7-18q6-13-3-20" fill="none" stroke="currentColor" strokeWidth="1.25"/><path d="M57 57q9-1 8-10m4 6q13 0 9-15m6 17q12-1 7-13m5 18q13 2 7-11M57 102q8-2 11 6l12 7 12-7q5-9 12-7M63 113l8 15m2-13 7 22m5-23 2 16m8-19-2 15" stroke="currentColor" fill="none" opacity=".7" strokeWidth="1.1"/></> : monk ? <><path d="M53 72q-6-39 27-40 34 1 28 40M55 68q-8 1-6 14l8 15q3 29 23 32 20-3 23-32l8-15q4-13-5-14" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M62 45q14-13 28-6M56 74q8-3 16-1m17 0q9-2 15 1M62 139l18 25 24-32M59 147q11-12 24-12" fill="none" stroke="currentColor" opacity=".6"/></> : <><path d="M51 74q-7-37 10-40 18-17 39 1 16 8 9 39M55 63q18-5 25-20 8 13 27 18M55 73q-9-2-5 13l7 15q4 23 22 28 20-3 24-28l7-16q4-13-5-12" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M60 132l15 13-8 16-15-23m48-6-18 13 10 16 17-22M76 146l6-1 4 29H73Z" fill="none" stroke="currentColor" strokeWidth="1"/>{person.id === "nietzsche" && <path d="M63 103q6-9 17-2 11-7 18 2l-2 11q-9-7-16-5-7-2-15 5Z" fill="currentColor" opacity=".8"/>}</>}
    <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".85"><path d="M59 77q7-5 14-1m13 0q7-4 15 1M62 82h8m19 0h8M79 78l-3 17 7 2M71 105q8 3 16 0"/><path d="m60 90 5 2m30 0 6-3" opacity=".4"/></g>
    <path d="M14 177h132" stroke="currentColor" strokeWidth=".7" opacity=".35"/>
  </svg>;
}
