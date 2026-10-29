# Instant EUR Payments — Architecture Decision Lab

An interactive, self-contained HTML/CSS/JS report explaining the architecture of a new
**instant EUR payments** feature in a digital banking system. Built as a teaching artifact for
the *Architecture Decision Lab* lecture — not a production specification.

No build step, no external dependencies, no CDN links, no network calls. Everything runs
from static files.

## Run it locally

Just open [index.html](index.html) directly in your browser (double-click it or use
`File > Open`) — no server, build step, or installation required.

## What's inside

- [index.html](index.html) — page structure and section layout.
- [styles.css](styles.css) — dark theme, isometric-style tier bands, legend, inspector, cards.
- [data.js](data.js) — the single source of truth: components, connections, payment-journey
  steps, failure scenarios, decisions, risks, cost drivers, and presenter summary. The diagram,
  inspector, legend, and journey are all generated from this file so content can't drift.
- [app.js](app.js) — rendering and interaction logic (diagram construction, inspector panel,
  filters, step player, failure-scenario selector, budget toggle, nav scrollspy, presentation mode).

## Sections

1. **Overview & Diagram** — hero, constraints, the interactive three-tier architecture diagram
   with a shared infrastructure plane and external ecosystem, plus a component/connection inspector.
2. **Payment Journey** — a 9-step walkthrough of a payment (`Next`/`Previous`/`Reset`) and a
   failure-scenario selector (duplicate retry, payment-rail timeout, fraud service unavailable).
3. **Decisions & Trade-offs** — the five architecture decisions (style, communication, data
   consistency, resilience, scalability) plus a cost panel with an illustrative budget-pressure scenario.
4. **Risks & Controls** — the three headline risks with triggers/impact/mitigation, plus a
   secondary risk list.
5. **Accepted & Not Built** — the accepted eventual-consistency trade-off and the explicit
   decision not to rebuild the core ledger.
6. **Presenter Summary** — a compact closing synthesis and the core lesson.

## Notes on accuracy

All technology names (Kafka, PostgreSQL, Kubernetes, etc.) are labeled as illustrative examples,
not requirements. Budget figures (€2.0M vs €500K) are invented classroom numbers for discussing
trade-offs, not real prices. The core banking ledger is always shown as the bank's existing,
authoritative system — this feature does not replace or duplicate it.
