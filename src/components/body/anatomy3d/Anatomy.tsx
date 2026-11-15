'use client';

/**
 * Anatomical body figure (front view, ~8 heads tall) drawn as layered SVG:
 * skin → skeleton → abdominal organs → kidneys → lungs → heart → ribcage → lymphatic system → brain, eyes.
 * Each organ system is an interactive group. "anatomy" view uses natural tissue colours with anime-style
 * cel shading (hard-stop gradients, line art, gloss); "status" view tints every system by its health status.
 * It is the fallback for the 3D body and behaves like it: same systems and names, hover tooltip, click to focus
 * (the rest dims), click empty space to return, Skeleton and Organs layers, Status colours. Unisex by design.
 */
import { useEffect, useRef } from 'react';
import { cx, STATUS_LABEL, type Status } from '../../../data/solarisFormat';
import type { OrganDef } from '../../../data/solarisCatalog';
import s from './anatomy.module.css';

export type AnatomyView = 'anatomy' | 'status';

type Pt = [number, number];
type Seg = { c?: [Pt, Pt]; p: Pt };
const MIRROR = 'matrix(-1 0 0 1 400 0)';
const OX = 100; // body (400 wide, centred on x=200) inside the 600-wide frame, with room for the labels
const FRAME_W = 600;

/* ------------------------------------------------------------------ body outline (left half, mirrored) */
const START: Pt = [182, 118];
const LEFT: Seg[] = [
  { c: [[181, 132], [179, 144]], p: [172, 152] }, // neck
  { c: [[150, 160], [126, 162]], p: [112, 170] }, // trapezius
  { c: [[98, 178], [92, 196]], p: [92, 214] }, // deltoid
  { c: [[88, 236], [84, 262]], p: [84, 288] }, // upper arm
  { c: [[84, 300], [82, 312]], p: [82, 322] }, // elbow
  { c: [[79, 344], [78, 376]], p: [82, 410] }, // forearm
  { c: [[80, 424], [76, 440]], p: [75, 456] }, // hand
  { c: [[74, 476], [78, 494]], p: [86, 502] }, // fingers
  { c: [[92, 506], [98, 500]], p: [99, 490] }, // fingertips
  { c: [[101, 474], [103, 456]], p: [104, 444] }, // palm
  { c: [[104, 432], [104, 422]], p: [104, 412] }, // wrist
  { c: [[106, 388], [110, 360]], p: [114, 332] }, // inner forearm
  { c: [[117, 300], [120, 262]], p: [124, 234] }, // inner upper arm → armpit
  { c: [[126, 252], [128, 272]], p: [130, 290] }, // latissimus
  { c: [[131, 306], [131, 318]], p: [130, 330] }, // waist
  { c: [[128, 350], [122, 372]], p: [122, 394] }, // hip
  { c: [[121, 430], [125, 470]], p: [132, 510] }, // outer thigh
  { c: [[138, 545], [142, 575]], p: [143, 600] }, // knee
  { c: [[144, 620], [141, 642]], p: [142, 664] }, // calf
  { c: [[143, 700], [152, 740]], p: [156, 780] }, // ankle
  { c: [[157, 792], [150, 806]], p: [152, 814] }, // heel
  { c: [[156, 824], [176, 824]], p: [184, 818] }, // toes
  { c: [[188, 814], [186, 800]], p: [184, 790] }, // inner ankle
  { c: [[184, 750], [182, 710]], p: [184, 672] }, // inner calf
  { c: [[186, 646], [180, 624]], p: [184, 604] }, // inner knee
  { c: [[188, 570], [192, 520]], p: [194, 470] }, // inner thigh
  { c: [[195, 450], [196, 436]], p: [200, 428] }, // groin
];
const mir = (p: Pt): Pt => [400 - p[0], p[1]];
const BODY = (() => {
  let d = `M${START}`;
  for (const g of LEFT) d += g.c ? ` C${g.c[0]} ${g.c[1]} ${g.p}` : ` L${g.p}`;
  const pts: Pt[] = [START, ...LEFT.map((g) => g.p)];
  for (let i = LEFT.length - 1; i >= 0; i--) {
    const g = LEFT[i];
    d += g.c ? ` C${mir(g.c[1])} ${mir(g.c[0])} ${mir(pts[i])}` : ` L${mir(pts[i])}`;
  }
  return `${d} Z`;
})();
const HEAD =
  'M200 20 C223 20 239 37 239 62 C239 80 235 95 228 105 C221 115 211 123 200 123 C189 123 179 115 172 105 ' +
  'C165 95 161 80 161 62 C161 37 177 20 200 20 Z';
const EAR = 'M162 60 C155 57 153 70 155 79 C157 88 162 89 164 84 Z';

// Surface anatomy (muscle contours), left side; mirrored for the right.
const CONTOURS = [
  'M126 236 C146 256 176 258 196 246', // pectoralis lower border
  'M114 176 C120 196 124 214 126 234', // deltopectoral groove
  'M96 220 C100 246 102 270 100 296', // biceps
  'M90 336 C92 360 94 384 96 404', // forearm
  'M176 266 C174 300 176 350 186 404', // rectus abdominis border
  'M178 296 C186 300 194 300 198 298',
  'M178 326 C186 330 194 330 198 328',
  'M180 356 C188 360 194 360 198 358',
  'M140 362 C154 384 172 404 190 424', // inguinal "V"
  'M184 124 C188 138 192 150 196 166', // sternocleidomastoid
  'M136 470 C142 510 150 548 158 584', // vastus lateralis
  'M176 448 C178 500 180 550 178 590', // rectus femoris
  'M178 560 C186 570 186 590 178 598', // vastus medialis
  'M150 598 C156 606 172 606 178 598', // knee
  'M150 640 C152 670 156 700 160 728', // gastrocnemius
  'M180 650 C178 676 176 700 174 720',
  'M86 470 L88 496',
  'M91 470 L93 500',
  'M96 468 L97 496',
];

/* ------------------------------------------------------------------ helpers */
function Grad({ id }: { id: string }) {
  return (
    <radialGradient id={`ana-${id}`} cx="0.36" cy="0.3" r="0.85">
      <stop offset="0" style={{ stopColor: 'var(--o1)' }} />
      <stop offset="0.34" style={{ stopColor: 'var(--o1)' }} />
      <stop offset="0.4" style={{ stopColor: 'var(--o2)' }} />
      <stop offset="0.74" style={{ stopColor: 'var(--o2)' }} />
      <stop offset="0.82" style={{ stopColor: 'var(--o3)' }} />
      <stop offset="1" style={{ stopColor: 'var(--o3)' }} />
    </radialGradient>
  );
}

function Part({ name, children, shareGradient }: { name: string; children: React.ReactNode;
  shareGradient?: boolean }) {
  return (
    <g className={cx(s.part, s[`p_${name}`])}>
      {shareGradient ? null : <Grad id={name} />}
      {children}
    </g>
  );
}

function Shape({ part, d, mirror, transform }: { part: string; d: string; mirror?: boolean; transform?: string }) {
  return (
    <>
      <path className={s.shape} d={d} fill={`url(#ana-${part})`} transform={transform} />
      {mirror ? <path className={s.shape} d={d} fill={`url(#ana-${part})`} transform={MIRROR} /> : null}
    </>
  );
}

function Tube({ d, w, mirror }: { d: string; w: number; mirror?: boolean }) {
  const one = (t?: string) => (
    <g className={s.tube} transform={t}>
      <path d={d} strokeWidth={w + 2.4} className={s.tubeLine} />
      <path d={d} strokeWidth={w} className={s.tubeBody} />
      <path d={d} strokeWidth={Math.max(1, w * 0.28)} className={s.tubeShine} />
    </g>
  );
  return (
    <>
      {one()}
      {mirror ? one(MIRROR) : null}
    </>
  );
}

function Detail({ d, mirror }: { d: string; mirror?: boolean }) {
  return (
    <>
      <path className={s.detail} d={d} />
      {mirror ? <path className={s.detail} d={d} transform={MIRROR} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ organ systems */
function Skeleton() {
  const vertebrae = Array.from({ length: 22 }, (_, i) => 128 + i * 11.4);
  return (
    <Part name="bone">
      <rect className={s.hit} x={70} y={176} width={56} height={330} />
      <rect className={s.hit} x={274} y={176} width={56} height={330} />
      <rect className={s.hit} x={122} y={436} width={156} height={390} />
      {vertebrae.map((y) => (
        <rect key={y} className={s.shape} x={194.5} y={y} width={11} height={8.6} rx={2.6} fill="url(#ana-bone)" />
      ))}
      {/* clavicles */}
      <Shape part="bone" mirror
        d="M196 170 C182 166 158 166 132 172 C130 175 132 178 135 177 C158 172 182 172 196 176 Z" />
      {/* pelvis (ilium, pubis, ischium) + sacrum */}
      <Shape part="bone" mirror
        d="M200 372 C190 372 178 368 170 360 C160 350 144 350 138 360 C132 372 138 392 148 404 C154 412 162 418 168 424 C176 432 188 432 196 424 L200 420 Z" />
      <ellipse className={s.hole} cx={177} cy={413} rx={6.5} ry={8.5} />
      <ellipse className={s.hole} cx={223} cy={413} rx={6.5} ry={8.5} />
      <Shape part="bone" d="M190 374 L210 374 L206 402 L200 411 L194 402 Z" />
      {/* femur, patella, tibia, fibula */}
      <Shape part="bone" mirror
        d="M146 418 C148 409 160 408 162 417 L170 584 C176 588 176 598 170 602 C164 606 156 604 154 598 C152 592 156 586 160 584 L150 426 C147 424 146 421 146 418 Z" />
      <Shape part="bone" mirror d="M152 403 C158 402 162 407 161 413 C160 419 154 421 149 418 C145 415 146 404 152 403 Z" />
      <Shape part="bone" mirror d="M165 596 C170 596 172 602 171 607 C170 612 160 612 159 607 C158 602 160 596 165 596 Z" />
      <Shape part="bone" mirror d="M158 614 C160 608 174 608 176 614 L171 778 C172 784 164 786 163 780 Z" />
      <Shape part="bone" mirror d="M150 620 L154 618 L158 774 L154 776 Z" />
      {/* humerus, ulna, radius, hand */}
      <Shape part="bone" mirror
        d="M100 194 C100 186 114 186 114 194 C114 199 111 203 109 206 L104 310 C108 313 109 320 105 324 C101 327 93 326 92 321 C91 317 94 313 97 311 L101 206 C100 203 100 199 100 194 Z" />
      <Shape part="bone" mirror d="M93 328 C95 325 99 326 98 330 L92 404 C91 408 87 408 87 404 Z" />
      <Shape part="bone" mirror d="M101 330 C103 328 107 329 106 333 L100 406 C99 410 95 409 95 405 Z" />
      <Shape part="bone" mirror d="M86 414 C90 410 99 410 101 415 C102 421 96 425 91 424 C86 423 84 418 86 414 Z" />
      <Detail mirror d="M84 428 L83 488 M89 428 L89 496 M94 428 L95 494 M99 428 L100 482" />
    </Part>
  );
}

function Abdomen() {
  const colon =
    'M156 410 C152 390 150 368 152 350 C156 340 172 338 200 340 C228 338 244 340 248 350 C252 368 250 392 246 410 ' +
    'C240 420 226 420 214 422 C206 424 202 428 200 434';
  const small =
    'M180 356 C192 350 208 358 222 352 C234 348 238 362 226 368 C212 374 196 366 182 372 C170 378 172 392 186 390 ' +
    'C200 388 214 394 226 388 C238 384 240 398 228 404 C216 408 200 402 186 406';
  return (
    <>
      <Part name="liver">
        <Shape part="liver"
          d="M140 288 C148 276 176 274 202 280 C218 283 232 290 236 298 C228 304 214 308 202 314 C184 322 164 330 152 326 C142 322 138 304 140 288 Z" />
        <Detail d="M200 282 C196 296 190 308 186 320" />
        <ellipse className={s.gloss} cx={164} cy={292} rx={12} ry={5} transform="rotate(-12 164 292)" />
      </Part>
      <Part name="pancreas">
        <Shape part="pancreas"
          d="M178 334 C192 328 214 330 236 324 C242 326 240 334 232 336 C212 340 194 342 180 342 C174 340 174 336 178 334 Z" />
      </Part>
      <Part name="colon">
        <Tube d={colon} w={13} />
        <path className={s.haustra} d={colon} strokeWidth={13} />
      </Part>
      <Part name="small">
        <Tube d={small} w={7.5} />
      </Part>
      <Part name="stomach">
        <Shape part="stomach"
          d="M212 290 C222 284 240 286 248 298 C256 312 254 330 242 340 C232 348 216 348 206 342 C200 338 200 330 206 328 C212 326 218 330 226 328 C234 324 236 312 230 304 C226 298 218 296 212 300 Z" />
        <Detail d="M238 300 C244 312 244 326 236 336" />
        <ellipse className={s.gloss} cx={236} cy={300} rx={6} ry={3} transform="rotate(30 236 300)" />
      </Part>
      <Part name="gall">
        <Shape part="gall" d="M170 318 C166 322 168 331 174 331 C180 331 180 322 176 318 Z" />
      </Part>
    </>
  );
}

function Kidneys() {
  const kidney =
    'M162 312 C150 312 144 326 146 340 C148 354 158 362 166 358 C172 354 170 346 166 340 C170 334 172 326 170 320 ' +
    'C169 315 166 312 162 312 Z';
  return (
    <>
      <Part name="kidney">
        <ellipse className={s.hit} cx={158} cy={337} rx={16} ry={26} />
        <ellipse className={s.hit} cx={242} cy={331} rx={16} ry={26} />
        <Shape part="kidney" d={kidney} />
        <Shape part="kidney" d={kidney} transform={`${MIRROR} translate(0 -6)`} />
        <Detail d="M166 340 C162 336 158 334 154 336 M166 340 C160 342 156 346 154 350" />
        <ellipse className={s.gloss} cx={153} cy={324} rx={3} ry={6} />
        <ellipse className={s.gloss} cx={247} cy={318} rx={3} ry={6} />
      </Part>
      <Part name="ureter">
        <Tube d="M168 342 C172 366 182 392 192 414" w={2.4} />
        <Tube d="M232 336 C228 362 218 390 208 414" w={2.4} />
      </Part>
      <Part name="bladder">
        <Shape part="bladder" d="M188 412 C186 402 214 402 212 412 C212 424 206 431 200 431 C194 431 188 424 188 412 Z" />
      </Part>
    </>
  );
}

function Lungs() {
  const lung =
    'M186 182 C176 180 162 192 154 214 C146 236 142 262 144 284 C146 292 158 294 172 288 C182 284 190 280 194 274 ' +
    'L194 200 C194 190 192 182 186 182 Z';
  const lungR =
    'M214 182 C224 180 238 192 246 214 C254 236 258 262 256 284 C254 292 242 294 228 288 C222 285 216 282 212 280 ' +
    'C214 266 220 256 222 248 C220 242 212 240 208 236 L206 200 C206 190 208 182 214 182 Z';
  return (
    <>
      <Part name="lung">
        <Shape part="lung" d={lung} />
        <Shape part="lung" d={lungR} />
        <Detail d="M150 238 C164 236 178 238 192 236 M156 274 C170 252 182 232 192 214 M244 270 C232 252 220 236 210 222" />
        <Detail d="M182 198 C176 210 168 222 162 236 M178 206 C172 218 166 236 164 256 M218 198 C224 210 232 222 238 236 M222 206 C228 220 234 238 236 256" />
        <ellipse className={s.gloss} cx={164} cy={208} rx={5} ry={12} transform="rotate(25 164 208)" />
        <ellipse className={s.gloss} cx={236} cy={208} rx={5} ry={12} transform="rotate(-25 236 208)" />
      </Part>
      <Part name="airway">
        <Shape part="airway" d="M196 128 L204 128 L204 178 L196 178 Z" />
        <Detail d="M196 134 H204 M196 140 H204 M196 146 H204 M196 152 H204 M196 158 H204 M196 164 H204 M196 170 H204" />
        <Tube d="M200 178 C197 186 190 192 182 198" w={4.6} />
        <Tube d="M200 178 C203 186 210 192 218 198" w={4.6} />
      </Part>
    </>
  );
}

function Heart() {
  return (
    <>
      <Part name="vein">
        <Shape part="vein" d="M186 204 L194 204 L194 240 L186 240 Z" />
        <Shape part="vein" d="M206 242 C206 230 212 222 222 218 L224 225 C217 228 213 234 213 244 Z" />
      </Part>
      <Part name="artery">
        <Shape part="artery"
          d="M200 236 L200 214 C200 202 210 196 220 198 C230 200 234 208 232 220 L232 240 L226 240 L226 220 C226 212 222 206 216 206 C210 206 206 210 206 216 L206 236 Z" />
      </Part>
      <Part name="heart">
        <Shape part="heart"
          d="M196 232 C186 234 182 246 186 258 C190 272 204 284 226 292 C232 284 238 270 238 256 C238 242 230 232 218 232 C212 228 202 228 196 232 Z" />
        <Detail d="M214 236 C210 252 212 270 222 286 M198 246 C204 256 212 262 220 264" />
        <ellipse className={s.gloss} cx={200} cy={246} rx={4.5} ry={8} transform="rotate(-20 200 246)" />
      </Part>
    </>
  );
}

function Ribcage() {
  const ribs = Array.from({ length: 7 }, (_, i) => {
    const y = 182 + i * 13;
    return `M196 ${y} C176 ${y - 6} 146 ${y + 2} ${136 - i * 0.6} ${y + 24 + i * 2}`;
  });
  return (
    <Part name="bone" shareGradient>
      <Shape part="bone" d="M196 172 L204 172 L203 262 L200 274 L197 262 Z" />
      {ribs.map((d) => (
        <Tube key={d} d={d} w={1.8} mirror />
      ))}
      <Tube d="M198 272 C182 280 160 292 140 300" w={2.2} mirror />
    </Part>
  );
}

function Lymphatic() {
  const nodes: [number, number, number][] = [
    [186, 132, 3], [214, 132, 3], [132, 232, 3.6], [268, 232, 3.6], [137, 244, 2.6], [263, 244, 2.6],
    [178, 430, 3], [222, 430, 3],
  ];
  return (
    <>
      {nodes.map(([x, y]) => (
        <circle key={`h${x}-${y}`} className={s.hit} cx={x} cy={y} r={9} />
      ))}
      <Part name="node">
        <Detail d="M186 132 C170 160 150 200 132 232 M214 132 C230 160 250 200 268 232 M137 244 C150 320 166 390 178 430 M263 244 C250 320 234 390 222 430" />
        {nodes.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} className={s.shape} cx={x} cy={y} r={r} fill="url(#ana-node)" />
        ))}
      </Part>
      <Part name="thymus">
        <Shape part="thymus"
          d="M194 186 C190 192 190 204 196 208 C198 204 199 196 200 190 C201 196 202 204 204 208 C210 204 210 192 206 186 C204 184 196 184 194 186 Z" />
      </Part>
      <Part name="spleen">
        <Shape part="spleen" d="M250 290 C262 288 270 300 266 314 C262 326 250 328 246 318 C242 308 242 294 250 290 Z" />
        <ellipse className={s.gloss} cx={256} cy={298} rx={3} ry={5} />
      </Part>
    </>
  );
}

function Brain() {
  return (
    <Part name="brain">
      <Shape part="brain"
        d="M200 30 C186 26 170 34 168 50 C166 60 172 68 182 68 C188 69 194 66 200 64 C206 66 212 69 218 68 C228 68 234 60 232 50 C230 34 214 26 200 30 Z" />
      <Detail d="M200 31 L200 63" />
      <Detail mirror
        d="M174 44 C178 40 184 46 189 41 M171 54 C176 50 181 57 187 53 C190 51 192 55 195 52 M178 63 C182 59 187 64 192 60 M186 34 C190 38 194 34 196 38" />
      <ellipse className={s.gloss} cx={182} cy={38} rx={7} ry={3} transform="rotate(-20 182 38)" />
    </Part>
  );
}

function Eyes() {
  const eye = 'M176 73 C180 68 190 68 194 73 C190 77.5 180 77.5 176 73 Z';
  return (
    <Part name="eye">
      <rect className={s.hit} x={172} y={64} width={56} height={18} />
      {[undefined, MIRROR].map((t) => (
        <g key={t ?? 'l'} transform={t}>
          <path className={s.sclera} d={eye} />
          <circle className={s.iris} cx={185} cy={73} r={3.5} />
          <circle className={s.pupil} cx={185} cy={73} r={1.6} />
          <path className={s.lid} d="M175 72.4 C180 66.8 190 66.8 195.2 72.6" />
        </g>
      ))}
      <circle className={s.catch} cx={186.4} cy={71.7} r={0.95} />
      <circle className={s.catch} cx={216.4} cy={71.7} r={0.95} />
    </Part>
  );
}

const SYSTEMS: Record<string, () => React.ReactElement> = {
  musculo: Skeleton,
  metabolism: Abdomen,
  kidneys: Kidneys,
  lungs: Lungs,
  heart: Heart,
  immune: Lymphatic,
  brain: Brain,
  eyes: Eyes,
};
const PAINT_ORDER = ['musculo', 'metabolism', 'kidneys', 'lungs', 'heart', 'ribs', 'immune', 'brain', 'eyes'];

interface Callout {
  organ: string;
  side: 'l' | 'r';
  y: number;
  to: Pt;
}
const CALLOUTS: Callout[] = [
  { organ: 'brain', side: 'l', y: 46, to: [168, 48] },
  { organ: 'immune', side: 'l', y: 214, to: [132, 232] },
  { organ: 'lungs', side: 'l', y: 268, to: [150, 250] },
  { organ: 'kidneys', side: 'l', y: 342, to: [147, 336] },
  { organ: 'musculo', side: 'l', y: 500, to: [157, 500] },
  { organ: 'eyes', side: 'r', y: 74, to: [195, 73] },
  { organ: 'heart', side: 'r', y: 246, to: [236, 258] },
  { organ: 'metabolism', side: 'r', y: 316, to: [250, 316] },
];
/** Average glyph width of the callout font (20 px), for placing the leader lines. */
const CHAR = 10.4;
const LINE = 21;
/** The system's own name, on two lines when long ("Bones &" / "muscles"), so it fits beside the body. */
function labelLines(name: string): string[] {
  if (name.length <= 11) return [name];
  const amp = name.indexOf(' & ');
  if (amp > 0) return [name.slice(0, amp + 2), name.slice(amp + 3)];
  const sp = name.indexOf(' ');
  return sp > 0 ? [name.slice(0, sp), name.slice(sp + 1)] : [name];
}

export interface AnatomyLayers {
  skeleton: boolean;
  organs: boolean;
}
const ALL_LAYERS: AnatomyLayers = { skeleton: true, organs: true };
const NO_GREY: Record<string, boolean> = {};

/* ------------------------------------------------------------------ component */
export function Anatomy({
  organs,
  organStatus,
  grey = NO_GREY,
  selected,
  hover,
  view,
  layers = ALL_LAYERS,
  onSelect,
  onHover,
}: {
  organs: OrganDef[];
  organStatus: Record<string, Status>;
  /** Systems shown in neutral grey: no recent reading and nothing flagged. */
  grey?: Record<string, boolean>;
  selected: string | null;
  hover: string | null;
  view: AnatomyView;
  layers?: AnatomyLayers;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  // A click on empty space returns to the whole body, like the 3D view (Escape does the same). The systems are the
  // controls; this only listens for clicks that land between them.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-system]')) onSelectRef.current(null);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);
  const name = (id: string) => organs.find((o) => o.id === id)?.name ?? id;
  const isGrey = (id: string) => Boolean(grey[id]) && (organStatus[id] ?? 'ok') === 'ok';
  const word = (id: string) => (isGrey(id) ? 'No recent reading' : STATUS_LABEL[organStatus[id] ?? 'ok']);
  const stCls = (id: string) => {
    const st = organStatus[id] ?? 'ok';
    return isGrey(id) ? s.st_none : cx(`st-${st}`, s[`st_${st}`]);
  };
  // Layers hide systems like the 3D view does; the focused system always stays visible.
  const shown = (id: string) => id === selected ||
    (id === 'musculo' ? layers.skeleton : layers.organs);

  // Tooltip like the 3D view's: follows the pointer without re-rendering, flips to stay inside the stage.
  const showTip = (id: string, e: React.PointerEvent) => {
    const el = tip.current;
    const box = wrap.current;
    if (!el || !box) return;
    if (el.hidden || el.dataset.id !== id) {
      el.dataset.id = id;
      el.dataset.status = isGrey(id) ? 'none' : (organStatus[id] ?? 'ok');
      (el.firstElementChild as HTMLElement).textContent = name(id);
      (el.lastElementChild as HTMLElement).textContent = word(id);
      el.hidden = false;
    }
    const r = box.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x + 14;
    let top = y + 16;
    if (left + w > r.width - 6) left = x - 12 - w;
    if (top + h > r.height - 6) top = y - 12 - h;
    left = Math.max(6, Math.min(left, r.width - w - 6));
    top = Math.max(6, Math.min(top, r.height - h - 6));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  const hideTip = () => {
    if (tip.current) tip.current.hidden = true;
  };
  // Hover (mouse, pen) shows the tooltip and highlights the list; touch has no hover, a tap focuses.
  const pointerProps = (id: string) => ({
    onPointerEnter: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') onHover(id);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') showTip(id, e);
    },
    onPointerLeave: () => {
      hideTip();
      onHover(null);
    },
    onClick: () => onSelect(id),
    'data-system': id,
  });

  return (
    <div ref={wrap} className={s.wrap}>
      <svg className={cx(s.svg, view === 'anatomy' ? s.anatomy : s.status, selected && s.focused)} viewBox={`0 0 ${FRAME_W} 860`}
        role="group" aria-label="Interactive anatomical body map. Choose a body system.">
        <defs>
          <pattern id="ana-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="var(--accent)" opacity="0.4" />
          </pattern>
          <linearGradient id="ana-scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="0.6" stopColor="var(--accent)" stopOpacity="0.13" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="ana-floor" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={OX + 200} cy={830} rx={120} ry={16} fill="url(#ana-floor)" />

        <g transform={`translate(${OX} 0)`}>
          {/* skin & surface anatomy */}
          <g className={s.skin} aria-hidden>
            <linearGradient id="ana-skin" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" style={{ stopColor: 'var(--s1)' }} />
              <stop offset="0.42" style={{ stopColor: 'var(--s1)' }} />
              <stop offset="0.48" style={{ stopColor: 'var(--s2)' }} />
              <stop offset="0.66" style={{ stopColor: 'var(--s2)' }} />
              <stop offset="0.74" style={{ stopColor: 'var(--s3)' }} />
              <stop offset="1" style={{ stopColor: 'var(--s3)' }} />
            </linearGradient>
            <path className={s.body} d={EAR} />
            <path className={s.body} d={EAR} transform={MIRROR} />
            <path className={s.body} d={BODY} />
            <path className={s.body} d={HEAD} />
            <path className={s.dots} d={BODY} />
            <path className={s.dots} d={HEAD} />
            {CONTOURS.map((d) => (
              <g key={d}>
                <path className={s.contour} d={d} />
                <path className={s.contour} d={d} transform={MIRROR} />
              </g>
            ))}
            <path className={s.contour} d="M200 262 L200 404 M192 166 C196 170 204 170 208 166" />
            <ellipse className={s.contour} cx={200} cy={340} rx={2.5} ry={4} />
            <path className={s.brow} d="M176 63 C181 59.5 189 59.5 195 62" />
            <path className={s.brow} d="M176 63 C181 59.5 189 59.5 195 62" transform={MIRROR} />
            <path className={s.face} d="M200 77 C199 84 197 89 196 93 C198 95.5 202 95.5 204 93" />
            <path className={s.face} d="M192 105 C196 107 204 107 208 105" />
            <ellipse className={s.blush} cx={180} cy={88} rx={6.5} ry={3} />
            <ellipse className={s.blush} cx={220} cy={88} rx={6.5} ry={3} />
            {/* anime-style skin sheen */}
            <ellipse className={s.sheen} cx={104} cy={196} rx={5} ry={10} transform="rotate(-25 104 196)" />
            <ellipse className={s.sheen} cx={296} cy={196} rx={5} ry={10} transform="rotate(25 296 196)" />
            <ellipse className={s.sheen} cx={146} cy={520} rx={4} ry={22} transform="rotate(-6 146 520)" />
            <ellipse className={s.sheen} cx={150} cy={690} rx={3} ry={16} />
            <ellipse className={s.sheen} cx={176} cy={100} rx={3} ry={6} transform="rotate(20 176 100)" />
          </g>

          {PAINT_ORDER.map((id) => {
            if (id === 'ribs') {
              return shown('musculo') ? (
                <g key="ribs" className={cx(s.overlay, stCls('musculo'), selected === 'musculo' && s.selected)}
                  aria-hidden>
                  <Ribcage />
                </g>
              ) : null;
            }
            if (!shown(id)) return null;
            const Sys = SYSTEMS[id];
            return (
              <g
                key={id}
                className={cx(s.organ, stCls(id), hover === id && s.hover, selected === id && s.selected)}
                role="button"
                tabIndex={0}
                aria-pressed={selected === id}
                aria-label={`${name(id)}: ${word(id)}`}
                {...pointerProps(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(id);
                  }
                }}
                onFocus={(e) => {
                  if (e.currentTarget.matches(':focus-visible')) onHover(id);
                }}
                onBlur={() => onHover(null)}
              >
                <Sys />
              </g>
            );
          })}
        </g>

        {CALLOUTS.map((c) => {
          if (!shown(c.organ)) return null;
          const lines = labelLines(name(c.organ));
          const w = Math.max(...lines.map((l) => l.length)) * CHAR;
          const tx = c.side === 'l' ? 8 : FRAME_W - 8;
          const lx = c.side === 'l' ? 8 + w + 8 : FRAME_W - 8 - w - 8;
          const ox = c.to[0] + OX;
          const top = c.y - ((lines.length - 1) * LINE) / 2 + 7;
          return (
            <g key={c.organ} aria-hidden
              className={cx(s.callout, stCls(c.organ), hover === c.organ && s.hover, selected === c.organ && s.selected)}
              {...pointerProps(c.organ)}>
              <line x1={lx} y1={c.y} x2={ox} y2={c.to[1]} />
              <circle cx={ox} cy={c.to[1]} r={3.6} />
              <circle className={s.pulse} cx={ox} cy={c.to[1]} r={3.6} />
              <text x={tx} y={top} textAnchor={c.side === 'l' ? 'start' : 'end'}>
                {lines.map((l, i) => (
                  <tspan key={l} x={tx} dy={i ? LINE : 0}>
                    {l}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
        <rect className={s.scan} x={0} y={0} width={FRAME_W} height={110} />
      </svg>
      <div ref={tip} className={s.tip} hidden aria-hidden>
        <b />
        <span />
      </div>
    </div>
  );
}
