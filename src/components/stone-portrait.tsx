import { useId } from "react";

// Original sculptural studies in SVG. These evoke a tradition, not a verified historical likeness.
export function StonePortrait({ kind, className = "" }: { kind: "greek" | "east" | "woman"; className?: string }) {
  const id = useId().replace(/:/g, "");
  const stone = `url(#${id}-stone)`;
  const shade = `url(#${id}-shade)`;
  const light = `url(#${id}-light)`;
  return <svg className={`stone-portrait ${className}`} viewBox="0 0 360 500" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-stone`} x1="62" y1="106" x2="310" y2="330" gradientUnits="userSpaceOnUse"><stop stopColor="#b7a47d"/><stop offset=".28" stopColor="#81765c"/><stop offset=".65" stopColor="#48483a"/><stop offset="1" stopColor="#24291f"/></linearGradient>
      <linearGradient id={`${id}-shade`} x1="112" y1="210" x2="252" y2="350" gradientUnits="userSpaceOnUse"><stop stopColor="#77735b"/><stop offset=".45" stopColor="#343c2f"/><stop offset="1" stopColor="#171d17"/></linearGradient>
      <linearGradient id={`${id}-light`} x1="88" y1="94" x2="229" y2="277" gradientUnits="userSpaceOnUse"><stop stopColor="#d1b98c"/><stop offset=".48" stopColor="#918367"/><stop offset="1" stopColor="#41483a"/></linearGradient>
    </defs>
    <path d="M29 468q4-84 59-101l52-26 8-46h73l4 45 58 28q51 21 53 100Z" fill={stone}/>
    <path d="m146 326-27 49 57 92-84-29-43 30H29q6-83 59-101Z" fill={light} opacity=".66"/>
    <path d="m217 326 25 47-44 94 97-38 41 39q-3-80-53-100Z" fill={shade}/>
    <path d="m141 345 36 65 47-70-4 56-29 69-22-37-49-52Z" fill={shade}/>
    <path d="m89 370-17 65 36-30 24 23m109-58 26 54 38 20M111 386l36 59M64 445l45-5" stroke="#c8b087" strokeOpacity=".19" strokeWidth="1.2"/>
    {kind === "greek" ? <>
      <path d="M100 163q-23-35-4-60-3-26 28-33 17-35 51-25 28-17 49 7 31 0 32 31 28 18 12 48l-8 62-40 111-74 8-36-75Z" fill={shade}/>
      <path d="M119 129q19-37 59-41 52 1 62 40l4 45-6 54-23 48-47 15-37-35-14-58Z" fill={light}/>
      <path d="m181 88 43 17 17 36-22 27 6 29-18 13-3 34-24 40 32-9 26-48 8-51-7-48-15-23Z" fill={stone}/>
      <path d="M117 168q-18-9-20 8l11 35 14 8m116-49q17-7 15 11l-12 28-8 7" fill={stone}/>
      <path d="m167 152-12 18-27-6 9-11Z" fill="#353c30"/><path d="m190 150 29 8 7 12-35-2Z" fill="#30392c"/>
      <path d="m169 162-5 43 17 8 10-9-12-9 1-36Z" fill={stone}/>
      <path d="m164 168 1 30-9 10 24 4" stroke="#d0b58a" strokeOpacity=".35"/>
      <path d="m139 174 17-3m40-1 17 5" stroke="#c2b291" strokeOpacity=".7" strokeWidth="2"/>
      <path d="M116 211q12 4 21 22l28-7 15 7 18-7 20 4 18-22-5 48-18 51-31 31-40-24-21-53Z" fill={stone}/>
      <path d="m132 234 13 50 14-14 13 47 14-39 17 24 17-61-22-15-18 7-15-7Z" fill={shade}/>
      <path d="m147 237 17 5 17-4 20 4 17-8" stroke="#b5a07d" strokeOpacity=".5" strokeWidth="2"/>
      <g stroke="#c7ae83" strokeOpacity=".23" strokeWidth="2"><path d="M102 134q-13-24 9-31-10-22 18-22 6-27 26-12m7-7q24-12 27 8 27-7 26 13 22-6 25 14m-31-13q7 24 24 27m-89-28q-10 24-27 25m16-8q10 14 22-8m44-6q-3 19 16 16m-89 130 7 33m13-18 8 39m13-36 8 40m18-44-7 28m21-35-6 29"/></g>
      <path d="m138 108 16 13-7 20m59 38 15 19-9 14" stroke="#20291f" strokeOpacity=".55"/>
    </> : kind === "east" ? <>
      <path d="m104 118 12-43 16-10 12-30 69 6 8 26 20 12 13 48-15 25-123-4Z" fill={shade}/>
      <path d="m116 75 24-12 72 2 23 16-9 30-101 4Z" fill={stone}/>
      <path d="m143 38 66 6 3 21-72-2Z" fill={light}/>
      <path d="M122 125q54-23 108 3l3 52-11 62-37 39-42-30-23-64Z" fill={light}/>
      <path d="m177 117 48 8 7 54-12 63-35 38 3-46 21-36-15-40Z" fill={stone}/>
      <path d="M125 159q-19-10-18 12l13 34 10 7m101-52q18-11 15 11l-11 35-10 6" fill={stone}/>
      <path d="m133 156 26-5 8 9-32 5Zm53-3 30 6 5 8-35-5Z" fill="#353e2e"/>
      <path d="m139 173 18-3m36 2 17 6" stroke="#c2ac84" strokeOpacity=".65" strokeWidth="1.5"/>
      <path d="m172 159-9 42 15 11 12-8-10-10 1-32Z" fill={stone}/>
      <path d="m164 199-5 8 20 6" stroke="#c1aa82" strokeOpacity=".35"/>
      <path d="m136 216 24-1 19 10 19-8 20 5-14 20-25-9-26 6Z" fill={shade}/>
      <path d="M135 236q13 10 23 17l21 65 29-63 14-20q-5 80-41 119-38-39-46-118Z" fill={stone}/>
      <path d="m151 248 28 92 13-62-13 40-21-65Z" fill={light} opacity=".6"/>
      <path d="m160 242 20 8 20-8m-42 18 21 67m24-66-15 62m-47-135 10 10m57-6 9 9" stroke="#d0b68a" strokeOpacity=".26"/>
      <path d="m122 111 49 6 60-7M134 87l16-5m10-3 39 1" stroke="#cfb78d" strokeOpacity=".32"/>
      <path d="m217 132-10 10 10 17m-78 41 8 13-9 8" stroke="#252e22" strokeOpacity=".55"/>
    </> : <>
      <path d="M104 294q-25-88-6-170 4-69 77-74 67-7 83 62l-5 152-25 57-86-4Z" fill={shade}/>
      <path d="M125 123q29-24 49-45 20 30 59 47l-3 72-16 54-33 26-34-17-21-50Z" fill={light}/>
      <path d="m177 80 39 38 16 7-2 72-16 54-33 26 11-43 16-43-15-45Z" fill={stone}/>
      <path d="M103 175q-3-77 52-102-20 47-50 68m69-63q35 43 70 52l-7 99 9 53-27 32 7-71 6-118" fill={stone}/>
      <path d="m136 155 25-4 5 8-27 5m48-10 27 7 5 9-31-9" fill="#323b2d"/>
      <path d="m144 173 15-2m35 2 16 5" stroke="#c2aa82" strokeWidth="1.5" strokeOpacity=".65"/>
      <path d="m174 163-10 39 14 7 11-5-11-9 3-32Z" fill={stone}/>
      <path d="m157 230 20-9 20 9-18 7Z" fill={shade}/>
      <path d="m156 230 21 1 20-1" stroke="#bea783" strokeOpacity=".45"/>
      <path d="m150 250 29 17 24-18-12 40-19 10-25-15Z" fill={stone}/>
      <path d="M99 127q-3-67 77-76 74-1 81 61l-30-12-49-25-47 33Z" fill={stone}/>
      <g stroke="#d0b88c" strokeOpacity=".22"><path d="M104 121q12-48 66-60m-48 62q15-37 49-49m12-13q44 6 58 40M107 184l3 88m-1-55 8 72m124-121-6 101m-97 66 37 45 49-48"/></g>
      <path d="m143 134 12 7-5 12m65 46-10 8 6 10" stroke="#242e21" strokeOpacity=".55"/>
    </>}
    <path d="M70 466h220l10 15H59Z" fill={stone}/><path d="M59 481h241v13H59Z" fill={shade}/>
    <path d="M69 467h218" stroke="#baa079" strokeOpacity=".35"/>
  </svg>;
}
