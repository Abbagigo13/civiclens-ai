import { useEffect, useRef } from "react";

type NetNode = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  phase: number;
};

type NetLink = {
  a: number;
  b: number;
};

type Pulse = {
  link: number;
  t: number;
  speed: number;
  amber: boolean;
};

// Living city-network backdrop: junction nodes drift gently while
// pulses travel the links like reports flowing toward resolution.
// The field brightens around the visitor's cursor. When the visitor
// prefers reduced motion, a single static frame is painted instead.
export default function CityNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const surface: HTMLCanvasElement = canvas;
    const context: CanvasRenderingContext2D = ctx;

    let width = 0;
    let height = 0;
    let nodes: NetNode[] = [];
    let links: NetLink[] = [];
    let pulses: Pulse[] = [];
    let frame = 0;

    const mouse = { x: -9999, y: -9999 };
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function build() {
      const rect = surface.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      const scale = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.floor(width * scale);
      surface.height = Math.floor(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);

      const gap = Math.max(84, Math.min(148, width / 11));
      nodes = [];

      for (let row = gap * 0.4; row < height + gap; row += gap) {
        for (let col = gap * 0.4; col < width + gap; col += gap) {
          const x = col + (Math.random() - 0.5) * gap * 0.55;
          const y = row + (Math.random() - 0.5) * gap * 0.55;

          nodes.push({
            x,
            y,
            baseX: x,
            baseY: y,
            radius: 1 + Math.random() * 1.6,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      links = [];
      const reach = gap * 1.7;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].baseX - nodes[j].baseX;
          const dy = nodes[i].baseY - nodes[j].baseY;

          if (dx * dx + dy * dy <= reach * reach) {
            links.push({ a: i, b: j });
          }

          if (links.length >= 420) break;
        }

        if (links.length >= 420) break;
      }

      const pulseCount = Math.max(
        6,
        Math.min(14, Math.floor(links.length / 22)),
      );

      pulses = Array.from({ length: pulseCount }, (_, index) => ({
        link: links.length
          ? Math.floor(Math.random() * links.length)
          : 0,
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.006,
        amber: index % 4 === 0,
      }));
    }

    function paint(now: number) {
      context.clearRect(0, 0, width, height);
      const time = now / 1000;

      for (const node of nodes) {
        node.x = node.baseX + Math.sin(time * 0.35 + node.phase) * 7;
        node.y = node.baseY + Math.cos(time * 0.28 + node.phase) * 7;
      }

      context.lineWidth = 1;

      for (const link of links) {
        const a = nodes[link.a];
        const b = nodes[link.b];

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const mdx = midX - mouse.x;
        const mdy = midY - mouse.y;
        const near = Math.max(
          0,
          1 - Math.sqrt(mdx * mdx + mdy * mdy) / 320,
        );

        context.strokeStyle = `rgba(110, 186, 228, ${0.1 + near * 0.3})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      // Faint threads from nearby junctions to the cursor.
      for (const node of nodes) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 190) continue;

        context.strokeStyle = `rgba(125, 205, 240, ${
          (1 - distance / 190) * 0.35
        })`;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(mouse.x, mouse.y);
        context.stroke();
      }

      for (const node of nodes) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const near = Math.max(
          0,
          1 - Math.sqrt(dx * dx + dy * dy) / 170,
        );

        context.fillStyle = `rgba(170, 222, 246, ${0.35 + near * 0.6})`;
        context.beginPath();
        context.arc(node.x, node.y, node.radius + near * 1.8, 0, Math.PI * 2);
        context.fill();
      }

      for (const pulse of pulses) {
        const link = links[pulse.link];
        if (!link) continue;

        if (!reducedMotion) {
          pulse.t += pulse.speed;
          if (pulse.t >= 1) {
            pulse.t = 0;
            pulse.link = Math.floor(Math.random() * links.length);
          }
        }

        const a = nodes[link.a];
        const b = nodes[link.b];
        const x = a.x + (b.x - a.x) * pulse.t;
        const y = a.y + (b.y - a.y) * pulse.t;
        const color = pulse.amber ? "255, 178, 102" : "104, 216, 255";

        context.fillStyle = `rgba(${color}, 0.18)`;
        context.beginPath();
        context.arc(x, y, 7, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(${color}, 0.9)`;
        context.beginPath();
        context.arc(x, y, 2.1, 0, Math.PI * 2);
        context.fill();
      }
    }

    function tick(now: number) {
      paint(now);
      frame = window.requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent) {
      const rect = surface.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }

    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function onResize() {
      build();
      if (reducedMotion) paint(1200);
    }

    build();

    if (reducedMotion) {
      paint(1200);
    } else {
      frame = window.requestAnimationFrame(tick);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="cl-city-canvas"
      aria-hidden="true"
    />
  );
}
