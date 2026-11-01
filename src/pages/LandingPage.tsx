import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileSearch,
  Layers3,
  MapPin,
  Menu,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import CityNetworkCanvas from "./CityNetworkCanvas";
import "./LandingPage.css";

const districts = [
  "Kakuri",
  "Sabon Gari",
  "Ungwan Rimi",
  "Millennium City",
  "Barnawa",
  "Tudun Wada",
  "Malali",
  "Narayi",
];

type LifecycleStage = {
  id: string;
  index: string;
  tab: string;
  status: string;
  heading: string;
  body: string;
  history: { event: string; time: string }[];
};

const stages: LifecycleStage[] = [
  {
    id: "submitted",
    index: "01",
    tab: "Submitted",
    status: "Submitted",
    heading: "A resident captures the issue",
    body: "A geotagged photo of the pothole on Airport Road becomes a structured report in seconds — location, category and visible evidence attached.",
    history: [{ event: "Report created by resident", time: "Just now" }],
  },
  {
    id: "triage",
    index: "02",
    tab: "AI triage",
    status: "Submitted",
    heading: "AI organises the evidence",
    body: "CivicLens reads the image and separates what is visible from what is uncertain — severity, confidence and limits stated up front for a human to check.",
    history: [
      { event: "Report created by resident", time: "12 min ago" },
      { event: "AI assessment attached · 82% confidence", time: "9 min ago" },
    ],
  },
  {
    id: "review",
    index: "03",
    tab: "Human review",
    status: "Under Review",
    heading: "A reviewer verifies the facts",
    body: "A human confirms the damage, raises the priority and routes the case to the roads team. Every change is recorded — nothing happens silently.",
    history: [
      { event: "Report created by resident", time: "1 hr ago" },
      { event: "AI assessment attached · 82% confidence", time: "58 min ago" },
      { event: "Priority raised by reviewer", time: "20 min ago" },
    ],
  },
  {
    id: "resolved",
    index: "04",
    tab: "Resolved",
    status: "Resolved",
    heading: "The fix is tracked to the end",
    body: "The roads team closes the loop and the resident sees the outcome. The full trail — from photo to repair — stays on the record.",
    history: [
      { event: "Report created by resident", time: "2 days ago" },
      { event: "AI assessment attached · 82% confidence", time: "2 days ago" },
      { event: "Priority raised by reviewer", time: "1 day ago" },
      { event: "Marked resolved by roads team", time: "3 hrs ago" },
    ],
  },
];

const metrics = [
  { value: 2400, suffix: "+", label: "Reports structured for review" },
  { value: 38, suffix: "", label: "Evidence signals per analysis" },
  { value: 4, suffix: "", label: "Traceable lifecycle stages" },
  { value: 92, suffix: "%", label: "Pilot triage agreement with reviewers" },
];

const principles = [
  {
    number: "01",
    title: "Visible evidence, separated from inference",
    body: "What the camera shows and what the model guesses are never mixed. Each report carries its own uncertainty in plain language.",
  },
  {
    number: "02",
    title: "Human review before anything counts as verified",
    body: "AI prepares the case; people decide it. Priority changes and resolutions always carry a reviewer's name and reason.",
  },
  {
    number: "03",
    title: "A status trail anyone can follow",
    body: "Submitted, triaged, reviewed, resolved — every transition timestamped, so residents and officials see the same story.",
  },
];

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrolled;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [display, setDisplay] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? target.toLocaleString()
      : "0",
  );
  const { ref, inView } = useInView<HTMLSpanElement>();

  useEffect(() => {
    if (!inView) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let frame = 0;
    const started = performance.now();
    const duration = 1400;

    function tick(now: number) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased).toLocaleString());

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [stagePaused, setStagePaused] = useState(false);
  const stage = stages[stageIndex];

  useEffect(() => {
    document.title =
      "CivicLens AI — From citizen report to resolved municipal action";

    const description =
      "CivicLens AI turns geotagged photos of infrastructure issues into structured, reviewable reports — analyzed by AI, verified by humans, tracked to resolution.";

    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = description;
  }, []);

  // The lifecycle demo walks itself until the visitor takes over.
  useEffect(() => {
    if (stagePaused) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % stages.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [stagePaused]);

  function chooseStage(index: number) {
    setStagePaused(true);
    setStageIndex(index);
  }

  return (
    <div className="cl-site">
      <header className={`cl-nav${scrolled ? " cl-nav-scrolled" : ""}`}>
        <nav className="cl-nav-links" aria-label="Sections">
          <a href="#lifecycle">Lifecycle</a>
          <a href="#metrics">Metrics</a>
          <a href="#principles">Principles</a>
        </nav>

        <a className="cl-brand" href="#top" aria-label="CivicLens AI home">
          <span className="cl-brand-mark">
            <Layers3 size={19} strokeWidth={1.8} />
          </span>
          <span className="cl-brand-name">
            CivicLens <span>AI</span>
          </span>
        </a>

        <div className="cl-nav-right">
          <Link className="cl-nav-cta" to="/dashboard">
            Open command center <ArrowUpRight size={15} />
          </Link>
          <button
            className="cl-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="cl-mobile-menu" aria-label="Mobile sections">
            <a href="#lifecycle" onClick={() => setMenuOpen(false)}>
              Lifecycle <ChevronRight size={16} />
            </a>
            <a href="#metrics" onClick={() => setMenuOpen(false)}>
              Metrics <ChevronRight size={16} />
            </a>
            <a href="#principles" onClick={() => setMenuOpen(false)}>
              Principles <ChevronRight size={16} />
            </a>
            <Link
              className="cl-mobile-cta"
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
            >
              Open command center <ArrowRight size={16} />
            </Link>
          </nav>
        )}
      </header>

      <main id="top">
        <section className="cl-hero">
          <div className="cl-hero-backdrop" aria-hidden="true">
            <CityNetworkCanvas />
            <div className="cl-hero-vignette" />
          </div>

          <div className="cl-hero-copy">
            <p className="cl-hero-status">
              <span className="cl-live-dot" />
              Live pilot · Kaduna metropolitan reports
            </p>

            <h1>
              From citizen report
              <br />
              to resolved municipal action
            </h1>

            <p className="cl-hero-description">
              CivicLens AI turns geotagged photos of infrastructure
              issues into structured, reviewable reports — analyzed
              by AI, verified by humans, tracked to resolution.
            </p>

            <div className="cl-hero-actions">
              <Link className="cl-button-primary" to="/dashboard">
                Enter the platform <ArrowRight size={17} />
              </Link>
              <a className="cl-hero-scroll" href="#lifecycle">
                See the lifecycle
              </a>
            </div>

            <div className="cl-hero-signals">
              <span>
                <Camera size={14} /> Photo-first reporting
              </span>
              <span>
                <ScanSearch size={14} /> Evidence-led AI triage
              </span>
              <span>
                <ShieldCheck size={14} /> Human-verified outcomes
              </span>
            </div>
          </div>

          <div className="cl-districts">
            <p>Built for municipal service operations</p>
            <div className="cl-marquee" aria-label="Pilot districts">
              <div className="cl-marquee-track">
                {[...districts, ...districts].map((name, index) => (
                  <span key={`${name}-${index}`}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cl-lifecycle" id="lifecycle">
          <div className="cl-lifecycle-heading">
            <p className="cl-section-kicker">The report lifecycle</p>
            <h2>Built around real report lifecycles</h2>
            <p>
              Citizens submit issues, reviewers verify the evidence, and
              teams resolve each case — with transparent status tracking
              from start to finish. Walk the stages yourself.
            </p>
          </div>

          <div className="cl-lifecycle-grid">
            <div
              className="cl-stage-tabs"
              role="tablist"
              aria-label="Lifecycle stages"
            >
              {stages.map((item, index) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={index === stageIndex}
                  className={`cl-stage-tab${
                    index === stageIndex ? " cl-stage-tab-active" : ""
                  }`}
                  onClick={() => chooseStage(index)}
                >
                  <span className="cl-stage-tab-index">{item.index}</span>
                  <span className="cl-stage-tab-label">{item.tab}</span>
                  {index === stageIndex && !stagePaused && (
                    <span className="cl-stage-progress" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            <article
              className="cl-stage-card"
              key={stage.id}
              aria-live="polite"
            >
              <div className="cl-stage-card-head">
                <div>
                  <p className="cl-stage-card-id">CL-204913 · Roads</p>
                  <h3>{stage.heading}</h3>
                </div>
                <span
                  className={`cl-status-pill cl-status-${stage.id}`}
                >
                  {stage.status}
                </span>
              </div>

              <p className="cl-stage-card-body">{stage.body}</p>

              <p className="cl-stage-card-location">
                <MapPin size={14} /> Airport Road · Kakuri, Kaduna
              </p>

              <ol className="cl-stage-history">
                {stage.history.map((entry) => (
                  <li key={entry.event}>
                    <CircleCheck size={15} />
                    <div>
                      <strong>{entry.event}</strong>
                      <span>{entry.time}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        <section className="cl-metrics" id="metrics">
          <div className="cl-metrics-grid">
            {metrics.map((metric) => (
              <div className="cl-metric" key={metric.label}>
                <strong>
                  <CountUp target={metric.value} suffix={metric.suffix} />
                </strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
          <p className="cl-metrics-note">
            Illustrative pilot targets — CivicLens AI is a developing
            prototype, not an official reporting service.
          </p>
        </section>

        <section className="cl-principles" id="principles">
          <div className="cl-principles-heading">
            <p className="cl-principles-count">Three commitments</p>
            <h2>Trust is built into the process</h2>
            <p>
              AI can help interpret an image. It cannot independently
              confirm every real-world condition — so every report keeps
              its evidence, its uncertainty and its reviewers visible.
            </p>
            <Link className="cl-text-link" to="/dashboard">
              Explore the workspace <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="cl-principle-list">
            {principles.map((principle) => (
              <article className="cl-principle" key={principle.number}>
                <span className="cl-principle-number">
                  {principle.number}
                </span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </div>
                <Check size={18} />
              </article>
            ))}
            <p className="cl-principle-foot">
              <FileSearch size={15} />
              Designed for a reviewable evidence lifecycle
            </p>
          </div>
        </section>

        <section className="cl-final">
          <div className="cl-final-card">
            <div>
              <h2>Better records begin with a clear observation.</h2>
              <p>
                <Clock3 size={14} /> Photograph an issue, review the AI
                assessment and save your first report in under a minute.
              </p>
            </div>
            <Link className="cl-button-primary" to="/dashboard">
              Enter CivicLens <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="cl-footer">
        <a className="cl-brand" href="#top" aria-label="Back to top">
          <span className="cl-brand-mark">
            <Layers3 size={17} />
          </span>
          <span className="cl-brand-name">
            CivicLens <span>AI</span>
          </span>
        </a>
        <p>See it. Document it. Follow through.</p>
        <p className="cl-footer-note">
          CivicLens AI is a developing prototype, not an official
          emergency or municipal reporting service.
        </p>
      </footer>
    </div>
  );
}
