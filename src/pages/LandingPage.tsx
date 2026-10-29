
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Eye,
  FileCheck2,
  Layers3,
  MapPin,
  Menu,
  ShieldCheck,
  ScanSearch,
  Workflow,
} from "lucide-react";
import "./LandingPage.css";

const workflow = [
  {
    number: "01",
    icon: Eye,
    title: "Capture what you see",
    description:
      "Document road damage, blocked drainage and waste accumulation with a photograph and its location.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Examine the evidence",
    description:
      "AI-assisted image analysis helps organise observations, uncertainty and evidence that needs further review.",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Review and follow through",
    description:
      "Human reviewers can assess findings, verify reports and keep a record of status changes.",
  },
];

const principles = [
  "Visible evidence separated from inference",
  "Human review before verification",
  "Traceable report status and history",
];

export default function LandingPage() {
  useEffect(() => {
    document.title =
      "CivicLens AI — Civic infrastructure evidence, made actionable";

    const description =
      "Document civic infrastructure problems, organise visual evidence and track reports through a transparent review workflow with CivicLens AI.";

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

  return (
    <div className="cl-site">
      <header className="cl-nav">
        <a className="cl-brand" href="#home" aria-label="CivicLens AI home">
          <span className="cl-brand-mark">
            <Layers3 size={19} strokeWidth={1.8} />
          </span>
          <span className="cl-brand-name">
            CivicLens <span>AI</span>
          </span>
        </a>

        <nav className="cl-nav-links" aria-label="Main navigation">
          <a href="#approach">Our approach</a>
          <a href="#workflow">How it works</a>
          <a href="#principles">Principles</a>
        </nav>

        <Link className="cl-nav-cta" to="/dashboard">
          Open command center <ArrowUpRight size={16} />
        </Link>

        <a className="cl-mobile-cta" href="#workflow" aria-label="Explore workflow">
          <Menu size={21} />
        </a>
      </header>

      <main id="home">
        <section className="cl-hero">
          <div className="cl-hero-copy">
            <div className="cl-kicker">
              <span className="cl-kicker-dot" />
              CIVIC INFRASTRUCTURE · EVIDENCE WORKSPACE
            </div>

            <h1>
              See the problem.
              <br />
              Document the <span>evidence.</span>
              <br />
              Track what happens next.
            </h1>

            <p className="cl-hero-description">
              CivicLens AI helps turn observations of everyday infrastructure
              problems into structured, reviewable reports — from the first
              photograph to the next action.
            </p>

            <div className="cl-hero-actions">
              <Link className="cl-button-primary" to="/dashboard">
                Launch command center <ArrowRight size={17} />
              </Link>
              <a className="cl-button-secondary" href="#workflow">
                Explore the workflow <ArrowDownRight size={16} />
              </a>
            </div>

            <div className="cl-hero-footnote">
              <ShieldCheck size={15} />
              Human-reviewed evidence. Clear uncertainty. Traceable updates.
            </div>
          </div>

          <div className="cl-hero-visual" aria-label="Civic evidence workspace preview">
            <div className="cl-visual-top">
              <div className="cl-window-controls">
                <i /><i /><i />
              </div>
              <span>FIELD NOTE / 001</span>
              <span className="cl-visual-status">WORKSPACE PREVIEW</span>
            </div>

            <div className="cl-photo-scene">
              <div className="cl-scene-sky" />
              <div className="cl-scene-building cl-building-a" />
              <div className="cl-scene-building cl-building-b" />
              <div className="cl-scene-building cl-building-c" />
              <div className="cl-scene-road" />
              <div className="cl-scene-crack" />
              <div className="cl-scene-label">
                <span />
                INFRASTRUCTURE OBSERVATION
              </div>
              <div className="cl-scene-target">
                <span className="cl-target-corner tl" />
                <span className="cl-target-corner tr" />
                <span className="cl-target-corner bl" />
                <span className="cl-target-corner br" />
                <span className="cl-target-cross" />
              </div>
            </div>

            <div className="cl-visual-caption">
              <div>
                <span className="cl-caption-label">REPORT WORKFLOW</span>
                <strong>From observation to review</strong>
              </div>
              <div className="cl-caption-number">01 <span>/ 03</span></div>
            </div>

            <div className="cl-evidence-strip">
              <div className="cl-evidence-icon"><MapPin size={17} /></div>
              <div className="cl-evidence-copy">
                <strong>Location and evidence</strong>
                <span>Attach a photo, context and location</span>
              </div>
              <span className="cl-evidence-state">INPUT</span>
            </div>

            <div className="cl-visual-index">CL / EVIDENCE SYSTEMS</div>
          </div>

          <div className="cl-hero-index">
            <span>01 — DOCUMENT</span>
            <span>02 — REVIEW</span>
            <span>03 — FOLLOW THROUGH</span>
          </div>
        </section>

        <section className="cl-trust-line" id="approach">
          <p>BUILT AROUND EVIDENCE, NOT ASSUMPTIONS</p>
          <div className="cl-trust-items">
            <span><Check size={14} /> Structured observations</span>
            <span><Check size={14} /> Human verification</span>
            <span><Check size={14} /> Report history</span>
          </div>
        </section>

        <section className="cl-workflow-section" id="workflow">
          <div className="cl-section-heading">
            <div>
              <span className="cl-section-label">A CLEARER PROCESS</span>
              <h2>Make every observation count.</h2>
            </div>
            <p>
              A practical workflow for documenting civic issues and making
              their evidence easier to assess.
            </p>
          </div>

          <div className="cl-workflow-grid">
            {workflow.map((step) => {
              const Icon = step.icon;

              return (
                <article className="cl-workflow-item" key={step.number}>
                  <div className="cl-workflow-meta">
                    <span>{step.number} / PROCESS</span>
                    <Icon size={19} strokeWidth={1.6} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  <a href="#principles" aria-label={`Learn about ${step.title}`}>
                    Explore principle <ChevronRight size={15} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="cl-principles-section" id="principles">
          <div className="cl-principles-heading">
            <span className="cl-section-label">THE STANDARD</span>
            <h2>Trust is built into the process.</h2>
            <p>
              AI can help interpret an image. It cannot independently confirm
              every real-world condition or guarantee that a public authority
              will act.
            </p>
            <Link className="cl-text-link" to="/dashboard">
              Explore the workspace <ArrowUpRight size={16} />
            </Link>
          </div>

          <div className="cl-principle-list">
            {principles.map((principle, index) => (
              <div className="cl-principle-row" key={principle}>
                <span>0{index + 1}</span>
                <strong>{principle}</strong>
                <Check size={17} />
              </div>
            ))}
            <div className="cl-principle-note">
              <Workflow size={17} />
              <span>Designed for a reviewable evidence lifecycle</span>
            </div>
          </div>
        </section>

        <section className="cl-final-cta">
          <div>
            <span className="cl-section-label">START WITH WHAT YOU SEE</span>
            <h2>Better records begin with a clear observation.</h2>
          </div>
          <Link className="cl-button-primary" to="/dashboard">
            Enter CivicLens <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="cl-footer">
        <a className="cl-brand cl-footer-brand" href="#home">
          <span className="cl-brand-mark">
            <Layers3 size={17} />
          </span>
          <span className="cl-brand-name">
            CivicLens <span>AI</span>
          </span>
        </a>
        <span>See it. Document it. Follow through.</span>
        <span className="cl-footer-note">
          CivicLens AI is a developing prototype, not an official emergency
          or municipal reporting service.
        </span>
      </footer>
    </div>
  );
}
