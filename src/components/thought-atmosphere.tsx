import type { CSSProperties } from "react";
import { quotations } from "@/lib/philosophers";
import { StonePortrait } from "./stone-portrait";

const mural = [
  { quote: 0, fragment: "万物与我为一", className: "mural-unity" },
  { quote: 1, fragment: "未经审视的生活", className: "mural-examine" },
  { quote: 2, fragment: "行是知之成", className: "mural-action" },
  { quote: 3, fragment: "思而不学则殆", className: "mural-think" },
];

export function ThoughtAtmosphere({ quiet }: { quiet: boolean }) {
  return <div className={`thought-atmosphere ${quiet ? "atmosphere-quiet" : ""}`} aria-hidden="true">
    <div className="vault-glow"/><div className="light-shaft shaft-one"/><div className="light-shaft shaft-two"/>
    <svg className="vault-architecture" viewBox="0 0 1800 1100" preserveAspectRatio="xMidYMid slice" fill="none">
      <defs><linearGradient id="vault-stone"><stop stopColor="#756b4b" stopOpacity=".12"/><stop offset=".5" stopColor="#af9d6a" stopOpacity=".25"/><stop offset="1" stopColor="#554f3b" stopOpacity=".07"/></linearGradient><linearGradient id="vault-fade" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#af9663" stopOpacity=".21"/><stop offset="1" stopColor="#af9663" stopOpacity="0"/></linearGradient></defs>
      <path d="M223 1100V594a677 677 0 0 1 1354 0v506h-24V594a653 653 0 0 0-1306 0v506Z" fill="url(#vault-stone)"/>
      <path d="M260 1100V598a640 640 0 0 1 1280 0v502M295 1100V602a605 605 0 0 1 1210 0v498M347 1100V607a553 553 0 0 1 1106 0v493M368 1100V610a532 532 0 0 1 1064 0v490" stroke="url(#vault-fade)"/>
      <path d="M180 1100V592a720 720 0 0 1 1440 0v508M60 1100V530a840 840 0 0 1 1680 0v570" stroke="#bba172" strokeOpacity=".06"/>
      <path d="M0 940h1800M100 1020h1600M223 773h121M1455 773h121M223 785h121M1455 785h121" stroke="#bba172" strokeOpacity=".06"/>
      <circle cx="900" cy="92" r="3" fill="#c4ae7c" fillOpacity=".6"/>
    </svg>
    <div className="quotation-mural">{mural.map((item, index) => <div className={`mural-inscription ${item.className}`} key={item.className} style={{ "--mural-delay": `${index * -5.8}s`, "--mural-time": `${20 + index * 4}s` } as CSSProperties}><span>{item.fragment}</span><small>{quotations[item.quote].author}</small></div>)}<div className="mural-full-quote"><span>{quotations[0].text}</span><small>庄子 · 齐物论</small></div></div>
    <div className="hall-statue statue-west"><StonePortrait kind="greek"/><span>苏格拉底<small>公元前 469—399</small></span></div>
    <div className="hall-statue statue-east"><StonePortrait kind="east"/><span>庄子<small>约公元前 369—286</small></span></div>
    <div className="hall-horizon"/><div className="atmosphere-vignette"/>
    <div className="dust-field">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 13) % 100}%`, top: `${(i * 23 + 7) % 100}%`, "--dust-delay": `${i * -.87}s`, "--dust-time": `${13 + i % 7 * 3}s`, "--dust-size": `${i % 4 === 0 ? 2 : 1}px` } as CSSProperties}/>)}</div>
  </div>;
}
