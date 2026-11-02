// Deterministic isometric city block for the hero. A seeded grid of
// extruded buildings, road corridors and a river edge — drawn once as
// SVG so it stays crisp at any size and costs no runtime animation.

type Block = {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  tone: number;
};

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const ISO_X = 26;
const ISO_Y = 13;

function top(cx: number, cy: number, w: number, d: number, h: number) {
  const hw = (w * ISO_X) / 2;
  const hd = (d * ISO_Y) / 2;
  return `${cx},${cy - h - hd} ${cx + hw},${cy - h} ${cx},${cy - h + hd} ${cx - hw},${cy - h}`;
}

function left(cx: number, cy: number, w: number, d: number, h: number) {
  const hw = (w * ISO_X) / 2;
  const hd = (d * ISO_Y) / 2;
  return `${cx - hw},${cy - h} ${cx},${cy - h + hd} ${cx},${cy + hd} ${cx - hw},${cy}`;
}

function right(cx: number, cy: number, w: number, d: number, h: number) {
  const hw = (w * ISO_X) / 2;
  const hd = (d * ISO_Y) / 2;
  return `${cx + hw},${cy - h} ${cx},${cy - h + hd} ${cx},${cy + hd} ${cx + hw},${cy}`;
}

function buildBlocks(): Block[] {
  const rand = seeded(20261101);
  const blocks: Block[] = [];
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      // Road corridors: two avenues and one cross street stay empty.
      if (col === 4 || row === 3 || col === 7) continue;
      const cx = 120 + col * 92 + (row % 2) * 18;
      const cy = 150 + row * 52 + col * 10;
      const nearCentre = Math.max(0, 1 - Math.hypot(col - 4, row - 3) / 6);
      blocks.push({
        x: cx,
        y: cy,
        w: 1.1 + rand() * 0.9,
        d: 1.1 + rand() * 0.9,
        h: 14 + rand() * 26 + nearCentre * 64 + (rand() > 0.86 ? 42 : 0),
        tone: Math.floor(rand() * 4),
      });
    }
  }
  return blocks.sort((a, b) => a.y - b.y);
}

const TONES = [
  { top: "#16324a", left: "#0b1c2e", right: "#0e2438" },
  { top: "#1a3a56", left: "#0d2136", right: "#112a44" },
  { top: "#143048", left: "#0a1a2c", right: "#0c2236" },
  { top: "#1d405f", left: "#0f2740", right: "#142f4c" },
];

const blocks = buildBlocks();

export default function CityScene() {
  return (
    <svg
      className="cl-city-scene"
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="clGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081627" />
          <stop offset="100%" stopColor="#04090f" />
        </linearGradient>
        <linearGradient id="clRiver" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0d3a52" stopOpacity="0" />
          <stop offset="50%" stopColor="#155a7d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#0d3a52" stopOpacity="0" />
        </linearGradient>
      </defs>

      <polygon points="500,26 964,258 500,594 36,258" fill="url(#clGround)" />
      <polygon
        points="500,26 964,258 500,594 36,258"
        fill="none"
        stroke="rgba(95,215,255,0.16)"
      />

      {/* River Kaduna edge, south-west boundary */}
      <path
        d="M36,258 C220,330 300,470 500,594 L420,594 C280,486 180,360 60,300 Z"
        fill="url(#clRiver)"
      />

      {/* Road corridors */}
      <g stroke="rgba(125,205,240,0.20)" strokeWidth="10" strokeLinecap="round">
        <line x1="500" y1="40" x2="500" y2="580" />
        <line x1="80" y1="270" x2="920" y2="270" />
        <line x1="180" y1="120" x2="820" y2="460" />
      </g>
      <g stroke="rgba(240,249,255,0.35)" strokeWidth="1.4" strokeDasharray="10 12">
        <line x1="500" y1="40" x2="500" y2="580" />
        <line x1="80" y1="270" x2="920" y2="270" />
        <line x1="180" y1="120" x2="820" y2="460" />
      </g>

      {/* Report route: pin to pin across the avenues */}
      <path
        className="cl-route-line"
        d="M300,238 L500,300 L655,238 L742,330"
        fill="none"
        stroke="#5fd7ff"
        strokeWidth="1.6"
        strokeDasharray="5 7"
        opacity="0.85"
      />

      {blocks.map((b, i) => {
        const tone = TONES[b.tone];
        return (
          <g key={i}>
            <polygon points={left(b.x, b.y, b.w, b.d, b.h)} fill={tone.left} />
            <polygon points={right(b.x, b.y, b.w, b.d, b.h)} fill={tone.right} />
            <polygon points={top(b.x, b.y, b.w, b.d, b.h)} fill={tone.top} />
            {b.h > 58 && (
              <g fill="rgba(150,220,250,0.5)">
                <rect x={b.x - 8} y={b.y - b.h + 14} width="3" height="5" />
                <rect x={b.x + 4} y={b.y - b.h + 24} width="3" height="5" />
                <rect x={b.x - 2} y={b.y - b.h + 36} width="3" height="5" />
              </g>
            )}
          </g>
        );
      })}

      {/* Case pins, matched to the floating cards in the hero */}
      <g className="cl-pin cl-pin-critical">
        <circle cx="300" cy="238" r="16" fill="rgba(255,177,94,0.16)" />
        <circle cx="300" cy="238" r="5" fill="#ffb15e" />
      </g>
      <g className="cl-pin">
        <circle cx="655" cy="238" r="16" fill="rgba(95,215,255,0.16)" />
        <circle cx="655" cy="238" r="5" fill="#5fd7ff" />
      </g>
      <g className="cl-pin cl-pin-ok">
        <circle cx="742" cy="330" r="16" fill="rgba(67,211,154,0.16)" />
        <circle cx="742" cy="330" r="5" fill="#43d39a" />
      </g>
    </svg>
  );
}
