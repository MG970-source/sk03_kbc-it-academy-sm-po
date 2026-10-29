# Copilot Build Brief: Interactive Architecture Report for an Instant Payments Feature

## Your role and mission

Act as a senior software architect, information designer, and frontend engineer. In this local project, build a polished, interactive HTML report that explains the architecture of a new instant-payments feature in a digital banking system.

The final result will be shown live to students at the end of a lecture called **Architecture Decision Lab**. It is a teaching artifact, not a production architecture specification. It must be visually impressive, technically coherent, and understandable to banking professionals who are experienced in banking but are not software engineers.

**Do not just write a textual report or draw a generic boxes-and-arrows diagram.** Build a beautiful visual explanation of the feature’s anatomy: the three architectural tiers, the surrounding core banking ecosystem, how requests and events move between components, which components can scale, how failures are handled, and why the major decisions were made.

A subtle 3-D / isometric presentation is desirable. Prioritize clarity and readability over a dramatic effect. Aim for a high-quality architecture exhibit or interactive engineering infographic.

---

## 1. Start by inspecting the project

Before changing anything:

1. Inspect the current workspace, existing app structure, scripts, dependencies, styling conventions, and entry points.
2. Reuse the existing stack and conventions if a suitable app already exists.
3. If this is an empty or minimal project, create a small, self-contained solution using **HTML, CSS, JavaScript, and SVG**. Avoid adding a build system or dependency unless there is a clear benefit.
4. Do not overwrite unrelated files. Keep changes focused on this visualization.
5. Make the result easy to run locally. Include a brief README or run instructions if the project does not already explain how to launch it.

Prefer **no external runtime dependencies** and no CDN-hosted libraries. The visualization should work when opened locally and should not send data to external services. Use SVG/CSS for the diagram and 2.5-D/isometric effects where practical. Do not introduce a heavyweight WebGL/3-D engine just to make the diagram look 3-D.

If the workspace already contains a framework that is clearly appropriate, use it rather than creating a conflicting second app. Make reasonable decisions without asking the user questions.

---

## 2. Audience and teaching objective

**Audience:** Banking professionals who need to understand technology choices and communicate with architects, developers, operations, security, risk, and compliance colleagues. They do not need implementation-level code.

**Teaching objective:** Students should finish the report able to explain:

- what the proposed system consists of and how it fits into a wider banking environment;
- how a customer payment travels through the system;
- why some operations must be synchronous while notifications and analytics can be asynchronous;
- where financial correctness must be protected;
- what can scale horizontally, what may become a bottleneck, and why;
- how resilience mechanisms reduce some risks while introducing complexity and cost;
- three major architectural risks, one accepted trade-off, and one thing deliberately not built.

Use clear language. Every technology name must have a short explanation of its role. Avoid unexplained acronyms, unnecessary implementation details, and claims that a particular design automatically guarantees compliance or resilience.

---

## 3. Business scenario

The bank wants to add a new feature to its existing mobile and web banking channels:

> **Instant EUR payments to other participating European banks, available 24/7.**

The feature must support a fast customer experience, reliable payment processing, fraud controls, auditability, regulatory and security requirements, and future growth. It must integrate with existing banking systems rather than replace the bank’s core banking platform.

Treat these as the scenario’s business requirements:

- Customers can initiate a payment from the mobile or web banking app.
- The system authenticates the customer and applies required authorization / strong customer authentication (SCA) rules when applicable.
- A real-time fraud decision is obtained before executing a payment when that control is required by bank policy.
- The bank’s authoritative ledger/core banking system remains the source of truth for account balances and financial booking.
- The payment is sent through an external instant-payment scheme or payment-rail integration to the receiving bank.
- The customer receives a clear status. A push notification may arrive later than the immediate API response.
- Important outcomes are recorded for audit, monitoring, reporting, and investigation.
- The system must handle duplicate submissions, timeouts, temporary dependency outages, and increased traffic safely.
- The design should allow growth without introducing microservices or infrastructure that are not justified by the business need.

**Important scope boundary:** This is a reference teaching design. Do not present it as a complete SEPA Instant implementation, formal regulatory assessment, or a replacement for the bank’s core banking / ledger system. Label illustrative assumptions as such.

---

## 4. Architecture concept: three tiers plus the wider ecosystem

Show the **classic three-tier architecture** clearly, as three visually distinct, stacked layers. The 3-D effect should help students understand the layers, not obscure labels or connections.

### Tier 1 — Presentation / Access

Purpose: customer-facing interfaces and the controlled entry point into the bank’s APIs.

Show these components:

- **Mobile Banking App** — customer initiates a payment and sees its status.
- **Web Banking App** — equivalent web channel.
- **WAF / API Gateway** — controlled API entry, request routing, rate limiting, and security policies. Expand “WAF” in a tooltip or explanation as “Web Application Firewall.”

Show HTTPS / REST request-response communication from the channels through the gateway to the application tier. Do not imply that the browser or mobile app talks directly to the database, Kafka, or the core ledger.

### Tier 2 — Application / Business Logic

Purpose: enforce payment rules, coordinate services, integrate with existing systems, and publish outcomes.

Show these components as separate, labeled cards. Keep the diagram readable; arrange them into a logical flow:

- **Payment Orchestrator / Payment Service** — coordinates the payment lifecycle, validates business rules, checks the idempotency key, and manages payment state. Explain that this is the central coordinator, not the ledger itself.
- **Identity & SCA** — uses the bank’s existing identity/authentication capabilities to establish that the customer is allowed to initiate the payment and to request additional authentication when required.
- **Real-Time Fraud Decision** — synchronous risk decision before execution when required. Keep this distinct from post-payment fraud analytics.
- **Core Banking / Ledger Adapter** — integration boundary to the existing core banking system; translates and manages calls to the authoritative ledger capabilities.
- **Payment-Rail / Scheme Adapter** — integrates with the external instant-payment scheme or payment rail and the receiving bank’s ecosystem.
- **Notification Consumer / Service** — receives payment outcome events and sends push/email/SMS notifications through the bank’s chosen notification provider.
- **Audit & Monitoring Consumers** — use key payment outcomes for audit records, operational visibility, and downstream monitoring/reporting.

Use concise labels on cards and longer explanations in a side panel or tooltip. Make clear that the diagram is a logical architecture: some capabilities may be existing systems or components hosted in different environments.

### Tier 3 — Data / System of Record

Purpose: store authoritative financial data and the operational records needed to manage the payment lifecycle.

Show these components:

- **Core Banking Ledger / Account System** — the authoritative source of truth for balances and financial booking. It may be a pre-existing platform outside the new feature’s deployment boundary. Never imply the new feature maintains a competing source of truth for account balances.
- **Payment Operational Store** — stores the feature’s payment status/lifecycle, correlation references, idempotency records, and operational metadata. Choose a familiar example technology such as PostgreSQL only if useful, and label it as an illustrative choice rather than a universal banking standard.
- **Audit Records / Audit Store** — durable audit information subject to the bank’s retention, access, and tamper-protection requirements. Do not claim a particular storage technology guarantees regulatory compliance by itself.

Visually distinguish the bank’s **existing authoritative ledger** from data owned by the new feature. Do not suggest that analytics, notifications, or cached data are authoritative for balances.

### Shared integration / infrastructure plane

The three tiers do not describe every infrastructure component. Show a separate horizontal integration band or side plane that can connect to multiple tiers:

- **Event Broker (e.g., Kafka or a comparable broker)** — distributes durable payment outcome events to independent consumers. Label Kafka as one possible technology, not a requirement.
- **Observability** — logs, metrics, traces, dashboards, and alerts.
- **Secrets / Identity Infrastructure** — centrally managed service credentials and access policies, where relevant.
- **Deployment / Runtime Platform** — for example, containers on a managed container platform or Kubernetes. State that the exact hosting choice depends on the bank’s platform, policies, and operational capabilities.

Do not put every component into one of the three tiers if that makes the model misleading. Make the three tiers the primary visual structure and show cross-cutting infrastructure separately.

### External systems around the bank boundary

Show these outside the bank’s internal system boundary, with a clearly different visual treatment:

- **Instant-Payment Scheme / Payment Rail**
- **Receiving Bank**
- **External Notification Provider** (optional; show only if it helps explain the flow)

Mark trust boundaries. Indicate which calls cross the bank boundary. Avoid inventing a specific vendor, exact protocol, or regulatory implementation.

---

## 5. Communication and payment flow

Make the communication types obvious and visually different. Include a legend that remains visible or is easy to reopen.

- **Solid arrows:** synchronous request/response, where the caller waits for a result.
- **Dashed arrows:** asynchronous event delivery / background processing.
- **Optional dotted arrows:** monitoring, telemetry, or control-plane links.
- Label important links with a short protocol or message name, not only with an arrow.

Use color plus line style and text labels so that meaning does not depend on color alone. Include arrowheads and make direction unambiguous.

### Flow A — Initiating and executing a payment

Show a numbered sequence, preferably with a “Play flow” interaction or a step-by-step selector:

1. Customer submits an EUR payment in the mobile or web app.
2. The channel sends a protected HTTPS/REST request through the WAF/API Gateway.
3. The Payment Service validates the request, checks permissions and required SCA status, validates the payment request, and checks its idempotency key.
4. The Payment Service requests a real-time fraud decision when required by policy.
5. The Payment Service uses the Core Banking/Ledger Adapter to request the appropriate financial operation from the authoritative core banking system. Account and ledger updates must obey the bank’s core transaction rules.
6. The payment is sent to the external payment rail through the Payment-Rail Adapter. Make the design’s payment-state transitions explicit enough to avoid implying that a network timeout tells us whether money moved.
7. The system returns a truthful status to the channel based on what is known at that point. Distinguish “accepted/processing,” “booked,” “sent,” “confirmed,” “rejected,” and “status unknown/reconciliation required” when relevant to the chosen flow. Do not imply that all these states are interchangeable or that all rails use the same lifecycle.
8. Once a meaningful outcome is durably recorded, the system publishes an event such as `PaymentBooked`, `PaymentRejected`, or `PaymentStatusChanged` for interested consumers.

Be careful about sequence details. The exact point at which the ledger is debited, funds are reserved, the external payment is submitted, and settlement is confirmed depends on the payment scheme and core banking interfaces. Present the flow as a logical reference pattern, and add a small note that scheme-specific sequencing must be validated in a real implementation.

### Flow B — Asynchronous outcomes

Show that after a durable payment outcome event is published:

- Notification service sends a customer message independently of the immediate API response.
- Audit/monitoring consumers capture the outcome for their own purposes.
- Reporting and analytics can consume events without the Payment Service making direct calls to every consumer.

Explain visually: **“The customer’s payment result must not depend on a push notification being delivered.”** A delayed notification does not by itself mean the payment failed.

### Failure path — Timeout or duplicate request

Add one concise interactive failure example:

- A client or network retries the same payment request.
- The idempotency key lets the Payment Service recognize the same business request and avoid creating a second payment instruction.
- If a payment-rail call times out after submission, the system must not blindly submit a new payment as though the first attempt definitely failed. It should preserve an uncertain/in-progress state and use rail-supported status checks, safe retry behavior, or reconciliation as appropriate.

Explain the distinction simply:

- **Idempotency key:** protects against duplicate business requests.
- **Event ID / consumer deduplication:** protects consumers from processing the same event more than once.

Do not imply retries are always safe. Retries must be bounded, use timeouts, and respect idempotency and the external scheme’s capabilities.

---

## 6. Make these architectural decisions explicit

The report must show each decision, **what was chosen, why, what it costs or complicates, and what alternative was not chosen**. These are the reference decisions for the teaching visualization; show them as decisions, not as universal rules.

### Decision 1 — Architecture style

**Suggested choice:** Keep the customer-facing feature within a clear three-tier architecture, with a modular application layer and explicit boundaries around integrations. Deploy only components that need independent scaling or ownership as separate services. Do not split every business function into a microservice automatically.

**Why:** The bank needs understandable boundaries and safe integration with existing core banking systems. A modular design keeps complexity manageable while leaving room to separate a genuinely independent or high-load capability later.

**Trade-off:** A more modular service-based design requires API contracts, deployment coordination, observability, and operational discipline. A single large application might initially be simpler, but it could limit independent scaling and change ownership as demand grows.

Show the alternative in a small comparison: “one large application” vs “modular application with selected independently deployable services.” Avoid treating “microservices” as an automatic sign of better architecture.

### Decision 2 — Communication

**Suggested choice:** HTTPS/REST for customer-facing requests and interactions that need an immediate response; asynchronous events for notifications, audit downstream processing, and analytics.

**Why:** The customer needs a clear result from the payment workflow, while notifications and analytics should not hold up the critical payment path. Events let new consumers subscribe without requiring the Payment Service to call each one directly.

**Trade-off:** Asynchronous consumers may process events later, events can be redelivered, and end-to-end troubleshooting becomes harder. Systems need monitoring, idempotent consumers, correlation IDs, and safe replay/recovery procedures.

### Decision 3 — Data consistency

**Suggested choice:** Keep the core ledger authoritative and require the bank’s appropriate transactional guarantees for balances and financial booking. Use an operational payment record to track the feature’s lifecycle. Accept eventual consistency for notifications, analytics, and non-authoritative reporting views.

**Why:** Financial correctness must not rely on a delayed event or a cached balance. Non-financial customer messages and analytics can be updated asynchronously without blocking a payment.

**Trade-off:** The UI and downstream reports may briefly show different states. Payment state handling and reconciliation are needed, especially when an external call times out or the result is uncertain.

**Important nuance:** Do not claim that one database transaction automatically covers the core ledger, payment rail, broker, and every downstream service. They usually do not share one atomic transaction. Show the need for explicit lifecycle states, idempotency, events, and reconciliation across boundaries.

### Decision 4 — Resilience

**Suggested choice:** Use redundant application instances where the platform supports it, health checks, sensible timeouts, bounded retries, controlled failover, monitoring/alerting, durable event delivery, and tested recovery/reconciliation procedures. Protect financial operations with idempotency and explicit state transitions.

**Why:** An instance failure or temporary dependency outage should not cause duplicate payments or silent loss of a known outcome.

**Fraud-service behavior:** If a mandatory real-time fraud decision is unavailable, do not silently bypass the control. Show a policy-controlled safe response, such as a temporary failure/retryable status or an explicitly governed alternative path. State that the exact behavior requires the bank’s risk and compliance decision.

**External rail timeout:** Show the payment as unresolved/in progress when the system cannot safely determine the outcome, and reconcile or query status before risking a duplicate submission.

**Trade-off:** Redundancy and recovery mechanisms improve tolerance of specific failures but add cost, configuration, monitoring, and operational complexity. Simplicity itself can also support resilience by making behavior easier to diagnose and recover; redundancy is not a substitute for a well-understood design.

### Decision 5 — Scalability

**Suggested choice:** Design stateless request-handling components so they can scale horizontally; scale event consumers based on load/consumer lag where the broker and consumer design permit it; monitor the ledger and database as potential constraints. Use caching only for suitable reference/configuration data, never as an alternative source of truth for the current account balance.

**Why:** Customer-facing traffic and downstream event volume may grow at different rates. Independently scaling the appropriate parts avoids scaling the whole system just to increase one capacity.

**Trade-off:** More instances and partitions can increase infrastructure cost and operational complexity. The core ledger, database write capacity, external payment rail limits, and ordering/partitioning requirements may be the bottleneck, so horizontal scaling does not make every part infinitely scalable.

Include a visual “scale independently” marker on components that can plausibly be scaled, and a “constrained dependency / validate capacity” marker on the core ledger, database, broker, fraud service, and external rail as appropriate. Do not claim every component has unlimited horizontal scalability.

### Cost — make the financial implications visible

Treat cost as a decision dimension across the design, not an isolated technology shopping list.

Show the main cost drivers:

- baseline compute/runtime and API capacity;
- high availability / redundant instances;
- database and core-system capacity;
- event broker throughput and retention;
- monitoring, logs, traces, and audit retention;
- third-party / payment-scheme fees and provider contracts;
- support, on-call, testing, disaster recovery, and operational ownership.

Use a clear panel for **“Budget pressure scenario”**. The exercise discussed an ambitious proposal estimated at **€2.0 million per year against a €500,000 annual budget**. Treat these as invented classroom figures, not market prices or a vendor quote. Label them clearly as illustrative. Show how the team could revisit optional complexity, phase capabilities, reuse bank platforms, or negotiate scope—without casually removing required ledger correctness, security, fraud controls, auditability, or required availability.

Do not invent detailed per-vendor prices. If you display a cost breakdown, use qualitative levels or explicitly marked fictional estimates. Make clear that precise cost requires traffic assumptions, provider contracts, availability targets, data retention, and platform pricing.

---

## 7. Three major architectural risks

Create an unmistakable **“Top 3 Risks”** panel. For each risk, show the trigger, the possible business impact, and the mitigation/response. Use concise language suitable for a classroom presentation.

### Risk 1 — Duplicate or uncertain payment outcome

- **Trigger:** Client retry, timeout, service restart, or the external rail responds too late to know the result.
- **Impact:** Duplicate payment, inconsistent customer status, reconciliation workload, and loss of trust.
- **Mitigation:** Idempotency for the business request, explicit payment states, correlation IDs, rail-supported status checking, safe retry rules, and reconciliation. Never assume a timeout means that no payment occurred.

### Risk 2 — A critical dependency is unavailable or too slow

- **Trigger:** Core ledger, real-time fraud decision, broker, or external rail becomes unavailable or exceeds its timeout.
- **Impact:** Payment delays, unavailable service, unsafe fallback behavior, or a growing backlog.
- **Mitigation:** Dependency-specific timeout and recovery policy, health monitoring, bounded retries, capacity validation, carefully defined fail-safe behavior, and tested operational runbooks. Do not promise uninterrupted processing for every outage.

### Risk 3 — Growth exceeds a constrained component’s capacity

- **Trigger:** Payment volume increases sharply while a core ledger, database, fraud engine, or payment rail cannot scale at the same rate.
- **Impact:** Rising latency, timeouts, queue growth, and customer-visible delays.
- **Mitigation:** Load testing, end-to-end capacity modeling, bottleneck dashboards, scaling policies where supported, and early agreements with owners of constrained dependencies.

You may surface data protection, access control, third-party change, or regulatory interpretation as additional risks in a secondary list, but keep the three headline risks above visually dominant and explainable.

---

## 8. One major trade-off accepted

Make this visible in its own card:

> **We accept eventual consistency for notifications, analytics, and reporting so the critical payment flow does not wait for downstream consumers.**

Explain the boundary carefully: this trade-off applies to downstream views and side effects, **not** to weakening the bank’s required financial booking and balance correctness. A notification may arrive late; the authoritative payment state must still be correctly managed.

Add a small “What we gain / What we accept” visual:

- **Gain:** shorter critical path, fewer direct dependencies, independent consumers.
- **Accept:** downstream delays, duplicate event handling, more monitoring and reconciliation needs.

---

## 9. One thing deliberately not built

Give this its own visible card:

> **We do not build a new core ledger or a new source of truth for account balances.**

Why:

- The bank already has an authoritative core banking / ledger system.
- Rebuilding it would dramatically expand the scope, risk, time, and validation burden.
- The new feature integrates with the existing ledger and stores only the operational data it owns.

Optional additional “not built” examples may include a custom notification platform or one microservice for every small function. Do not let these dilute the primary choice above.

---

## 10. Visual and interaction requirements

The deliverable should feel like a polished interactive architecture report, not a default HTML page or a corporate slide copied into a browser.

### Visual direction

- Dark or deep-neutral background with restrained, high-quality accent colors.
- Clear typography, strong hierarchy, generous spacing, consistent iconography, careful contrast, and well-aligned cards.
- A hero area with the feature name, one-sentence purpose, and small status chips such as “Illustrative reference architecture,” “Instant EUR payments,” and “3-tier view.”
- Three visually distinct stacked tiers with a subtle isometric / 2.5-D treatment: perspective planes, depth, shadows, and connector lines. Keep text horizontal/readable; do not rotate labels.
- Distinct visual styling for internal bank components, the existing core system, shared infrastructure, and external organizations.
- Use a clean color-coded legend, but also use arrow styles, line labels, and icons so the diagram remains understandable for color-blind viewers.
- Use polished microinteractions only where they improve understanding; avoid unnecessary animation or motion that distracts from a classroom explanation.

### Main layout / sections

Create a coherent experience with these sections:

1. **Overview** — feature purpose, key constraints, and the main architecture diagram.
2. **Explore the architecture** — interactive three-tier diagram plus side panel with selected component details.
3. **Payment journey** — numbered synchronous flow and asynchronous follow-on path.
4. **Decisions and trade-offs** — architecture style, communication, data consistency, resilience, scalability, and cost.
5. **Risks and controls** — three major risks with mitigations.
6. **What we accepted / what we did not build** — the key trade-off and deliberate scope boundary.
7. **Presenter summary** — a compact, readable conclusion that brings the decisions together.

These may be tabs, anchor-linked sections, or a compact navigation rail. Keep the primary diagram easy to return to.

### Interactions

Implement useful interactions, not decorative controls that do nothing:

- Clicking a component opens an inspector panel containing its purpose, owner/boundary, technology example, communication type, scaling potential, failure consideration, and why it exists.
- Selecting a communication arrow highlights the source, destination, and a short explanation of the interaction.
- A step selector or “Next step” button walks through the payment journey and highlights the active path. Include reset and previous/next behavior if practical.
- Toggles or filters can show/hide synchronous calls, asynchronous events, and observability/control-plane links.
- A “Failure scenario” selector can show at least one meaningful path, such as payment-rail timeout or duplicate client retry, and reveal the expected safe behavior.
- A “Budget pressure” state can show the €2.0M vs €500K illustrative constraint and highlight options to revisit, without making mandatory controls look optional.
- Ensure all buttons have a visible and useful effect. Do not add faux controls.

If a complete interactive diagram would make the page fragile or overcomplicated, implement the main architecture as static SVG with reliable component selection and flow highlighting. Clarity and reliability matter more than the quantity of interactions.

### Responsive and classroom use

- Work well on a 16:9 projector or laptop display and remain usable on a smaller screen.
- At small widths, stack the inspector and content rather than making the diagram unreadable.
- Provide a **presentation mode** or compact toggle if feasible: hide secondary navigation and enlarge the diagram and flow labels.
- Include a **Reset / Overview** control so the presenter can recover quickly during the lesson.
- Respect reduced-motion preferences. Keep essential content visible without hover; click/tap must work.
- Provide keyboard focus states, meaningful button names, adequate contrast, and accessible text descriptions for important SVG components where practical.

---

## 11. Component inspector: required details

When a student selects a component, show relevant fields in plain language. Not every field must appear on every component, but use a consistent template:

- **Purpose:** What business or technical job does this component perform?
- **Tier / boundary:** Presentation, application, data, shared infrastructure, existing bank system, or external system.
- **Technology example:** A plausible technology or category, clearly marked as illustrative.
- **Communication:** REST/HTTPS, database transaction, event, or external scheme interface as applicable.
- **Can it scale independently?** Yes / sometimes / constrained, with one-sentence reasoning.
- **Failure consideration:** What happens if this component becomes slow or unavailable?
- **Architectural reason:** Why is it included and what trade-off does it introduce?

Use human-readable text instead of relying only on technical labels. Example: “Kafka (event broker): distributes payment outcome events to several independent systems so that notifications and analytics do not need to be called one by one by the Payment Service.”

---

## 12. Technology examples and accuracy guardrails

Use technology names to make the design concrete, but do not imply one stack is mandatory for banks.

Plausible illustrative examples include:

- Customer channels: native mobile app and web application.
- API entry: WAF and API gateway.
- Service runtime: containerized services on the bank’s approved platform; Kubernetes only as an example if useful.
- API style: HTTPS/REST with authentication and authorization handled through the bank’s existing identity approach.
- Event broker: Kafka or a comparable event/messaging platform.
- Operational store: a relational database such as PostgreSQL as an example, assuming it is appropriate for the bank’s standards.
- Observability: centralized logs, metrics, distributed tracing, dashboards, and alerting.
- Integrations: adapters for core banking and the chosen payment rail.

Guardrails:

- Do not hardcode vendor-specific details unless the current project already uses them or the scenario explicitly requires them.
- Do not invent exact throughput, latency, availability, recovery-time, or pricing figures. Use targets only if clearly labeled as illustrative assumptions.
- Do not claim that Kubernetes, Kafka, microservices, database replicas, or cloud hosting automatically provide resilience or scalability.
- Do not suggest that caching an account balance or publishing an event is equivalent to a correct ledger transaction.
- Do not suggest that API success, ledger booking, payment-rail submission, interbank settlement, and customer notification are necessarily the same moment or state.
- Do not assume a distributed transaction spans the core ledger, payment rail, broker, and all consumers.
- Make uncertain external-payment outcomes visible and explain safe reconciliation.
- Mention that actual security, SCA, fraud, retention, and regulatory behavior must be validated against the bank’s policies, scheme rules, and applicable requirements.

---

## 13. Presenter summary: the story the visualization should tell

Conclude with a concise synthesis of the architecture decisions:

1. **Architecture style:** start with a clear three-tier design and modular business boundaries; create independently deployable services only where justified.
2. **Communication:** REST for immediate customer requests, events for downstream work that need not block the payment flow.
3. **Data consistency:** the existing core ledger stays authoritative; downstream views can converge asynchronously.
4. **Resilience:** design for known failure modes using redundancy where justified, timeouts, bounded retries, idempotency, monitoring, and reconciliation.
5. **Scalability:** scale suitable stateless services and consumers independently, while validating constrained components such as the ledger, database, broker, and external rail.
6. **Cost:** invest in capabilities that protect critical financial and business outcomes; revisit optional complexity and phase delivery if the budget is insufficient.

End with this core lesson:

> **There is no perfect architecture. Good architecture makes the business priorities, risks, and trade-offs explicit—and keeps financial correctness non-negotiable.**

---

## 14. Suggested report data model

Keep the content data-driven where possible so the diagram and inspector do not drift apart. For example, define a component list with stable IDs, names, tier/boundary, descriptions, technology examples, scale category, failure notes, and position/layout metadata. Define communication links separately with stable IDs, source, target, type (`sync`, `async`, or `telemetry`), label, flow step, and explanation.

Use that same data model to drive:

- diagram rendering;
- component inspector content;
- legend and filters;
- journey step highlighting;
- failure scenario highlighting.

This will make it easier to maintain and extend the report than duplicating labels and descriptions throughout the HTML.

---

## 15. Acceptance criteria / definition of done

Before finishing, verify each point:

### Content and correctness
- [ ] Clearly identifies the feature as instant EUR payments integrated into an existing banking ecosystem.
- [ ] Shows and labels all three tiers: presentation/access, application/business logic, and data/system of record.
- [ ] Shows shared integration infrastructure and external payment systems without forcing everything into the three tiers.
- [ ] Visually separates the existing core ledger from the new feature’s operational store.
- [ ] Distinguishes synchronous requests from asynchronous events.
- [ ] Shows the payment journey and an asynchronous notification/audit path.
- [ ] Explains idempotency and the risk of retrying an uncertain payment blindly.
- [ ] Gives clear explanations for all five decisions and cost implications.
- [ ] Displays three major risks with mitigations.
- [ ] States the accepted trade-off and the thing deliberately not built.
- [ ] Treats budget numbers as fictional classroom assumptions, not market prices.
- [ ] Does not claim that redundancy, brokers, replicas, or a specific platform guarantee resilience.

### Visual and usability
- [ ] Looks intentionally designed and polished, with a visual hierarchy and consistent spacing.
- [ ] Has a readable, subtle 3-D / isometric treatment of the tiers, without tilted or microscopic text.
- [ ] All component names and arrow labels remain legible on a typical laptop/projector screen.
- [ ] Legend clearly explains the different arrow types.
- [ ] Clicking components and using the main controls changes the UI meaningfully.
- [ ] Failure and budget scenarios work, or are omitted rather than presented as broken controls.
- [ ] Responsive behavior is sensible on narrow screens.
- [ ] Keyboard navigation, focus states, and reduced-motion preferences are considered.

### Technical
- [ ] Runs locally using the project’s existing workflow, or has clear minimal run instructions.
- [ ] Does not require sending content to a remote service.
- [ ] No broken links, missing assets, browser-console errors, or inert buttons.
- [ ] No unrelated project files were changed.
- [ ] Includes concise comments around non-obvious layout/flow logic and a short README/run instruction if needed.

Do not stop after producing a diagram mockup. Implement the report, run it locally or use available project checks, inspect the result, fix issues, and provide a concise summary of files changed and how to launch it.

---

## Final instruction

Build the strongest practical version of this visualization within the current project’s constraints. Make sensible implementation choices without asking follow-up questions. Optimize for a presenter being able to walk a classroom through the architecture in a few minutes, click into details when needed, and explain not just **what** was built but **why these trade-offs were accepted**.
