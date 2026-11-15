import React from 'react';

export type BodySystemKey =
  | 'cardiovascular'
  | 'respiratory'
  | 'musculoskeletal'
  | 'neurological'
  | 'immune';

interface LayeredSvgAnatomyProps {
  selectedSystem: string | null;
  onSelectSystem: (system: string) => void;
  statusMap?: Record<string, 'normal' | 'watch' | 'review' | 'urgent'>;
  heartRate?: number;
}

type Pt = [number, number];
type Seg = { c?: [Pt, Pt]; p: Pt };
const MIRROR = 'matrix(-1 0 0 1 400 0)';
const START: Pt = [182, 118];
const LEFT: Seg[] = [
  { c: [[181, 132], [179, 144]], p: [172, 152] },
  { c: [[150, 160], [126, 162]], p: [112, 170] },
  { c: [[98, 178], [92, 196]], p: [92, 214] },
  { c: [[88, 236], [84, 262]], p: [84, 288] },
  { c: [[84, 300], [82, 312]], p: [82, 322] },
  { c: [[79, 344], [78, 376]], p: [82, 410] },
  { c: [[80, 424], [76, 440]], p: [75, 456] },
  { c: [[74, 476], [78, 494]], p: [86, 502] },
  { c: [[92, 506], [98, 500]], p: [99, 490] },
  { c: [[101, 474], [103, 456]], p: [104, 444] },
  { c: [[104, 432], [104, 422]], p: [104, 412] },
  { c: [[106, 388], [110, 360]], p: [114, 332] },
  { c: [[117, 300], [120, 262]], p: [124, 234] },
  { c: [[126, 252], [128, 272]], p: [130, 290] },
  { c: [[131, 306], [131, 318]], p: [130, 330] },
  { c: [[128, 350], [122, 372]], p: [122, 394] },
  { c: [[121, 430], [125, 470]], p: [132, 510] },
  { c: [[138, 545], [142, 575]], p: [143, 600] },
  { c: [[144, 620], [141, 642]], p: [142, 664] },
  { c: [[143, 700], [152, 740]], p: [156, 780] },
  { c: [[157, 792], [150, 806]], p: [152, 814] },
  { c: [[156, 824], [176, 824]], p: [184, 818] },
  { c: [[188, 814], [186, 800]], p: [184, 790] },
  { c: [[184, 750], [182, 710]], p: [184, 672] },
  { c: [[186, 646], [180, 624]], p: [184, 604] },
  { c: [[188, 570], [192, 520]], p: [194, 470] },
  { c: [[195, 450], [196, 436]], p: [200, 428] },
];

const mir = (p: Pt): Pt => [400 - p[0], p[1]];

const BODY_PATH = (() => {
  let d = `M${START[0]} ${START[1]}`;
  for (const g of LEFT) d += g.c ? ` C${g.c[0][0]} ${g.c[0][1]}, ${g.c[1][0]} ${g.c[1][1]}, ${g.p[0]} ${g.p[1]}` : ` L${g.p[0]} ${g.p[1]}`;
  const pts: Pt[] = [START, ...LEFT.map((g) => g.p)];
  for (let i = LEFT.length - 1; i >= 0; i--) {
    const g = LEFT[i];
    d += g.c
      ? ` C${mir(g.c[1])[0]} ${mir(g.c[1])[1]}, ${mir(g.c[0])[0]} ${mir(g.c[0])[1]}, ${mir(pts[i])[0]} ${mir(pts[i])[1]}`
      : ` L${mir(pts[i])[0]} ${mir(pts[i])[1]}`;
  }
  return `${d} Z`;
})();

const HEAD_PATH =
  'M200 20 C223 20 239 37 239 62 C239 80 235 95 228 105 C221 115 211 123 200 123 C189 123 179 115 172 105 C165 95 161 80 161 62 C161 37 177 20 200 20 Z';

const STATUS_COLOR_HEX = {
  normal: '#6FBF9B',
  watch: '#E0BE6A',
  review: '#E58F55',
  urgent: '#DE6A64',
};

export const LayeredSvgAnatomy: React.FC<LayeredSvgAnatomyProps> = ({
  selectedSystem,
  onSelectSystem,
  statusMap = {},
  heartRate = 78,
}) => {
  const getSysColor = (sys: BodySystemKey) => {
    const status = statusMap[sys] || 'normal';
    return STATUS_COLOR_HEX[status];
  };

  const isCardioActive = selectedSystem === 'cardiovascular' || !selectedSystem;
  const isRespActive = selectedSystem === 'respiratory' || !selectedSystem;
  const isMskActive = selectedSystem === 'musculoskeletal' || !selectedSystem;
  const isNeuroActive = selectedSystem === 'neurological' || !selectedSystem;
  const isImmuneActive = selectedSystem === 'immune' || !selectedSystem;

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none overflow-hidden p-2">
      <svg
        viewBox="60 0 280 840"
        className="h-full max-h-[82vh] w-auto drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] transition-all duration-300"
      >
        <defs>
          <filter id="glow-cardio" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-hotspot" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Translucent Body Silhouette */}
        <g opacity="0.35">
          <path
            d={BODY_PATH}
            fill="#0B1017"
            stroke="#B8CCE6"
            strokeWidth="1.25"
            strokeOpacity="0.3"
          />
          <path
            d={HEAD_PATH}
            fill="#0B1017"
            stroke="#B8CCE6"
            strokeWidth="1.25"
            strokeOpacity="0.3"
          />
        </g>

        {/* 2. Musculoskeletal Layer (Spine, Ribs, Pelvis, Bones) */}
        <g
          onClick={() => onSelectSystem('musculoskeletal')}
          className="cursor-pointer transition-opacity duration-300 group"
          opacity={isMskActive ? 1.0 : 0.25}
        >
          {/* Spinal Column */}
          <g stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : '#8D97A6'} strokeWidth="2.5" fill="none">
            {Array.from({ length: 22 }).map((_, i) => (
              <line
                key={`vert-${i}`}
                x1={194}
                y1={138 + i * 11}
                x2={206}
                y2={138 + i * 11}
                strokeWidth={i > 14 ? '3.5' : '2.5'}
                opacity={0.85}
              />
            ))}
          </g>

          {/* Ribs arcs */}
          <g stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.4)'} strokeWidth="1.2" fill="none">
            {[-1, 1].map((side) =>
              Array.from({ length: 9 }).map((_, i) => (
                <path
                  key={`rib-${side}-${i}`}
                  d={`M 200 ${170 + i * 11} Q ${200 + side * (32 + i * 2)} ${180 + i * 10} ${200 + side * (16 + i * 3)} ${205 + i * 8}`}
                />
              ))
            )}
          </g>

          {/* Clavicles */}
          <path
            d="M 130 168 Q 165 174 200 170 Q 235 174 270 168"
            stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.5)'}
            strokeWidth="2"
            fill="none"
          />

          {/* Pelvis Girdle */}
          <path
            d="M 160 380 Q 200 405 240 380 Q 248 425 200 422 Q 152 425 160 380 Z"
            fill="none"
            stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.45)'}
            strokeWidth="1.8"
          />

          {/* Leg bone axes */}
          <line x1="172" y1="425" x2="160" y2="600" stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.3)'} strokeWidth="2.5" />
          <line x1="228" y1="425" x2="240" y2="600" stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.3)'} strokeWidth="2.5" />
          <line x1="160" y1="610" x2="170" y2="780" stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.3)'} strokeWidth="2.2" />
          <line x1="240" y1="610" x2="230" y2="780" stroke={selectedSystem === 'musculoskeletal' ? '#E0BE6A' : 'rgba(184,204,230,0.3)'} strokeWidth="2.2" />
        </g>

        {/* 3. Respiratory Layer (Lungs & Trachea) */}
        <g
          onClick={() => onSelectSystem('respiratory')}
          className="cursor-pointer transition-opacity duration-300"
          opacity={isRespActive ? 1.0 : 0.25}
        >
          {/* Trachea */}
          <line x1="200" y1="125" x2="200" y2="185" stroke="#B8CCE6" strokeWidth="3" strokeDasharray="2,2" opacity="0.6" />
          {/* Left Lung */}
          <path
            d="M 188 188 C 172 195 158 220 156 250 C 154 278 165 295 186 295 C 192 295 194 280 192 250 Z"
            fill="rgba(111,191,155,0.18)"
            stroke={selectedSystem === 'respiratory' ? '#6FBF9B' : 'rgba(111,191,155,0.6)'}
            strokeWidth="1.5"
          />
          {/* Right Lung */}
          <path
            d="M 212 188 C 228 195 242 220 244 250 C 246 278 235 295 214 295 C 208 295 206 280 208 250 Z"
            fill="rgba(111,191,155,0.18)"
            stroke={selectedSystem === 'respiratory' ? '#6FBF9B' : 'rgba(111,191,155,0.6)'}
            strokeWidth="1.5"
          />
        </g>

        {/* 4. Cardiovascular Layer (Heart & Great Vessels) */}
        <g
          onClick={() => onSelectSystem('cardiovascular')}
          className="cursor-pointer transition-opacity duration-300"
          opacity={isCardioActive ? 1.0 : 0.25}
        >
          {/* Aortic Arch */}
          <path
            d="M 198 225 Q 196 200 206 202 Q 214 205 210 226"
            fill="none"
            stroke="#DE6A64"
            strokeWidth="3.5"
          />
          {/* Heart Silhouette with Pulsing Glow */}
          <g filter={selectedSystem === 'cardiovascular' ? 'url(#glow-hotspot)' : 'url(#glow-cardio)'}>
            <path
              d="M 200 224 C 188 214 176 226 178 244 C 180 262 196 278 206 282 C 218 274 226 256 222 238 C 218 220 206 216 200 224 Z"
              fill={selectedSystem === 'cardiovascular' ? '#DE6A64' : 'rgba(222,106,100,0.85)'}
              stroke="#ECE8E1"
              strokeWidth="1.5"
              className="animate-pulse"
              style={{ animationDuration: `${60 / heartRate}s` }}
            />
          </g>
          {/* Carotid & Radial lines */}
          <line x1="198" y1="200" x2="192" y2="135" stroke="#DE6A64" strokeWidth="1.5" opacity="0.6" />
          <line x1="208" y1="202" x2="214" y2="135" stroke="#DE6A64" strokeWidth="1.5" opacity="0.6" />
        </g>

        {/* 5. Neurological Layer (Brain & Cranial Plexus) */}
        <g
          onClick={() => onSelectSystem('neurological')}
          className="cursor-pointer transition-opacity duration-300"
          opacity={isNeuroActive ? 1.0 : 0.25}
        >
          <path
            d="M 182 52 C 178 36 222 36 218 52 C 230 62 226 84 216 88 C 206 92 194 92 184 88 C 174 84 170 62 182 52 Z"
            fill={selectedSystem === 'neurological' ? 'rgba(184,204,230,0.35)' : 'rgba(184,204,230,0.15)'}
            stroke={selectedSystem === 'neurological' ? '#B8CCE6' : 'rgba(184,204,230,0.7)'}
            strokeWidth="1.5"
          />
          {/* Gyri lines */}
          <path d="M 188 56 Q 200 48 212 56 Q 200 66 188 64" fill="none" stroke="#B8CCE6" strokeWidth="1" opacity="0.7" />
          <path d="M 192 72 Q 202 78 210 70" fill="none" stroke="#B8CCE6" strokeWidth="1" opacity="0.7" />
        </g>

        {/* 6. Immune & Metabolic Layer (Liver, Kidneys, Abdomen) */}
        <g
          onClick={() => onSelectSystem('immune')}
          className="cursor-pointer transition-opacity duration-300"
          opacity={isImmuneActive ? 1.0 : 0.25}
        >
          {/* Liver */}
          <path
            d="M 174 300 Q 198 296 216 304 Q 224 330 196 332 Q 170 332 174 300 Z"
            fill="rgba(224,190,106,0.18)"
            stroke={selectedSystem === 'immune' ? '#E0BE6A' : 'rgba(224,190,106,0.5)'}
            strokeWidth="1.4"
          />
          {/* Kidneys */}
          <ellipse cx="178" cy="342" rx="7" ry="11" fill="rgba(224,190,106,0.25)" stroke={selectedSystem === 'immune' ? '#E0BE6A' : 'rgba(224,190,106,0.6)'} strokeWidth="1.2" />
          <ellipse cx="222" cy="342" rx="7" ry="11" fill="rgba(224,190,106,0.25)" stroke={selectedSystem === 'immune' ? '#E0BE6A' : 'rgba(224,190,106,0.6)'} strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
};
