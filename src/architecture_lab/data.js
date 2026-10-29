/*
 * Data model for the Instant EUR Payments architecture report.
 * Kept separate from rendering logic (app.js) so the diagram, inspector,
 * legend, journey steps and failure scenarios all stay in sync with one
 * source of truth instead of duplicating labels across the HTML.
 */

const CANVAS = { w: 1200, h: 800 };

// --- Components -------------------------------------------------------
// tier: 'presentation' | 'application' | 'data' | 'infra' | 'external'
const COMPONENTS = [
  {
    id: 'mobile-app', name: 'Mobile Banking App', tier: 'presentation',
    x: 50, y: 88, w: 230, h: 90,
    boundary: 'Tier 1 · Presentation / Access — inside the bank boundary',
    purpose: 'Lets a customer initiate a EUR instant payment and see its status and later notifications.',
    tech: 'Native iOS/Android banking app (illustrative).',
    comm: 'HTTPS/REST to the API Gateway; receives push notifications asynchronously.',
    scale: { level: 'yes', reason: 'Each customer\u2019s app instance runs independently; no shared state to contend for.' },
    failure: 'If unavailable, the customer simply cannot use the app; no impact on other customers or in-flight payments.',
    reason: 'Primary channel for the instant-payments feature.'
  },
  {
    id: 'web-app', name: 'Web Banking App', tier: 'presentation',
    x: 300, y: 88, w: 230, h: 90,
    boundary: 'Tier 1 · Presentation / Access — inside the bank boundary',
    purpose: 'Equivalent browser-based channel for initiating and tracking payments.',
    tech: 'Browser single-page application (illustrative).',
    comm: 'HTTPS/REST to the API Gateway.',
    scale: { level: 'yes', reason: 'Stateless per browser session; scales like any web frontend.' },
    failure: 'Outage affects only the web channel; the mobile channel keeps working.',
    reason: 'Gives customers a channel choice without duplicating backend logic.'
  },
  {
    id: 'gateway', name: 'WAF / API Gateway', tier: 'presentation',
    x: 560, y: 88, w: 310, h: 90,
    boundary: 'Tier 1 · Presentation / Access — inside the bank boundary',
    purpose: 'Single controlled entry point for all channel traffic: routes requests, enforces rate limits, and applies a Web Application Firewall (WAF) to filter malicious traffic.',
    tech: 'Managed API gateway + WAF (illustrative).',
    comm: 'Receives HTTPS/REST from channels; forwards validated requests to the Payment Orchestrator.',
    scale: { level: 'yes', reason: 'Stateless request routing scales horizontally behind a load balancer.' },
    failure: 'A gateway outage blocks all channel traffic \u2014 redundant instances and health checks reduce this risk.',
    reason: 'Keeps channels from calling internal services directly and centralizes security policy.'
  },
  {
    id: 'orchestrator', name: 'Payment Orchestrator', tier: 'application',
    x: 50, y: 240, w: 270, h: 95,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Central coordinator of the payment lifecycle: validates the request, checks the idempotency key, enforces business rules, and tracks payment state. It is the coordinator, not the ledger itself.',
    tech: 'Containerized business service (illustrative).',
    comm: 'REST in from the gateway; REST out to Identity, Fraud, the ledger adapter and the rail adapter; publishes events to the broker.',
    scale: { level: 'yes', reason: 'Stateless per request if payment state lives in the operational store; can run many instances.' },
    failure: 'An instance crash mid-request must not leave a payment half-processed \u2014 idempotency and explicit states protect against duplicates.',
    reason: 'Avoids spreading payment business rules across every channel and keeps one place responsible for lifecycle correctness.'
  },
  {
    id: 'identity', name: 'Identity & SCA', tier: 'application',
    x: 340, y: 240, w: 210, h: 95,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Confirms the customer is who they claim to be and requests Strong Customer Authentication (SCA) when policy requires it.',
    tech: 'Bank\u2019s existing identity/auth platform (illustrative, reused \u2014 not rebuilt for this feature).',
    comm: 'Synchronous call from the Payment Orchestrator.',
    scale: { level: 'sometimes', reason: 'Usually an existing shared platform; its capacity is governed by its own team, not this feature.' },
    failure: 'If unavailable, authentication cannot be confirmed \u2014 the payment should not proceed without a policy-defined safe response.',
    reason: 'Reuses existing authentication investment instead of building a parallel identity system.'
  },
  {
    id: 'fraud', name: 'Real-Time Fraud Decision', tier: 'application',
    x: 570, y: 240, w: 300, h: 95,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Gives a synchronous risk decision before the payment executes, when bank policy requires one. Distinct from after-the-fact fraud analytics.',
    tech: 'Real-time risk scoring service (illustrative).',
    comm: 'Synchronous call from the Payment Orchestrator; must respond within a strict timeout.',
    scale: { level: 'constrained', reason: 'Real-time scoring models can be computationally heavy; capacity needs validation under peak load.' },
    failure: 'If unavailable or too slow, the control must not be silently bypassed \u2014 a policy-controlled safe response (e.g. hold/retry) applies instead.',
    reason: 'Protects the bank and customers from fraudulent payments before money moves, at the cost of added request latency.'
  },
  {
    id: 'ledger-adapter', name: 'Core Banking / Ledger Adapter', tier: 'application',
    x: 50, y: 345, w: 220, h: 105,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Integration boundary that translates Payment Orchestrator requests into calls the existing core banking system understands.',
    tech: 'Adapter / integration service (illustrative).',
    comm: 'Synchronous call to the core banking ledger; must honor the ledger\u2019s own transactional guarantees.',
    scale: { level: 'sometimes', reason: 'The adapter itself can scale, but it cannot scale past what the core ledger can safely process.' },
    failure: 'If the ledger is slow or unavailable, payments cannot be safely booked \u2014 the orchestrator must wait, time out safely, or reject, never guess.',
    reason: 'Keeps core banking integration logic in one place instead of duplicating it across services.'
  },
  {
    id: 'rail-adapter', name: 'Payment-Rail / Scheme Adapter', tier: 'application',
    x: 280, y: 345, w: 230, h: 105,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Integrates with the external instant-payment scheme and the receiving bank\u2019s ecosystem.',
    tech: 'Scheme-specific adapter service (illustrative).',
    comm: 'Synchronous submission to the external payment rail; may also support status queries for reconciliation.',
    scale: { level: 'sometimes', reason: 'Throughput is ultimately bounded by the external scheme\u2019s own limits and contracts.' },
    failure: 'A rail timeout does not tell us whether the payment moved \u2014 the system must preserve an uncertain state and reconcile rather than retry blindly.',
    reason: 'Isolates scheme-specific protocol detail from the rest of the payment logic.'
  },
  {
    id: 'notif-consumer', name: 'Notification Consumer', tier: 'application',
    x: 520, y: 345, w: 190, h: 105,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Listens for payment outcome events and sends the customer a push, SMS, or email notification.',
    tech: 'Event-driven consumer service (illustrative).',
    comm: 'Consumes asynchronous events from the broker; calls an external notification provider.',
    scale: { level: 'yes', reason: 'Independent consumer; can scale with event volume without affecting the payment critical path.' },
    failure: 'A delayed or failed notification does not change the underlying payment outcome \u2014 it is a side effect, not the source of truth.',
    reason: 'Keeps notification delivery off the synchronous payment path.'
  },
  {
    id: 'audit-consumer', name: 'Audit & Monitoring Consumers', tier: 'application',
    x: 720, y: 345, w: 150, h: 105,
    boundary: 'Tier 2 · Application / Business Logic — inside the bank boundary',
    purpose: 'Use payment outcome events to build audit records and feed operational monitoring/reporting.',
    tech: 'Event-driven consumer services (illustrative).',
    comm: 'Consumes asynchronous events from the broker; writes to the audit store.',
    scale: { level: 'yes', reason: 'Independent of the payment path; scales with event volume.' },
    failure: 'A backlog here delays audit visibility, not the customer-facing payment result.',
    reason: 'Lets audit and monitoring evolve independently without the Payment Service calling each one directly.'
  },
  {
    id: 'core-ledger', name: 'Core Banking Ledger', tier: 'data', existing: true,
    x: 50, y: 528, w: 270, h: 95,
    boundary: 'Tier 3 · Data / System of Record — existing bank system',
    purpose: 'The bank\u2019s single authoritative source of truth for account balances and financial booking.',
    tech: 'Existing core banking platform (pre-existing, outside this feature\u2019s deployment boundary).',
    comm: 'Transactional calls via the Core Banking/Ledger Adapter, governed by the core system\u2019s own consistency rules.',
    scale: { level: 'constrained', reason: 'Often the hardest component to scale \u2014 its capacity must be validated, not assumed.' },
    failure: 'If unavailable, no financial booking can be safely confirmed \u2014 the feature must not invent a substitute source of truth.',
    reason: 'Never rebuilt or bypassed: financial correctness depends on keeping one authoritative ledger.'
  },
  {
    id: 'op-store', name: 'Payment Operational Store', tier: 'data',
    x: 340, y: 528, w: 270, h: 95,
    boundary: 'Tier 3 · Data / System of Record — owned by this feature',
    purpose: 'Stores this feature\u2019s payment lifecycle state, correlation references, and idempotency records \u2014 not account balances.',
    tech: 'Relational database such as PostgreSQL (illustrative, not a universal banking standard).',
    comm: 'Read/write from the Payment Orchestrator.',
    scale: { level: 'sometimes', reason: 'Can scale with standard database techniques, but write throughput still needs capacity planning.' },
    failure: 'If unavailable, the orchestrator loses its view of in-flight payment state \u2014 a key reason for redundancy and backups here.',
    reason: 'Keeps lifecycle/idempotency tracking out of the core ledger, which should only hold authoritative financial data.'
  },
  {
    id: 'audit-store', name: 'Audit Records / Audit Store', tier: 'data',
    x: 630, y: 528, w: 240, h: 95,
    boundary: 'Tier 3 · Data / System of Record — owned by this feature',
    purpose: 'Durable storage for audit information, retained and protected according to the bank\u2019s retention, access, and tamper-protection requirements.',
    tech: 'Append-oriented / durable store (illustrative).',
    comm: 'Written by audit consumers.',
    scale: { level: 'yes', reason: 'Mostly append-only writes; scales well horizontally with standard data-store techniques.' },
    failure: 'Unavailability delays audit capture; it does not affect whether a payment itself succeeded.',
    reason: 'No single storage technology guarantees regulatory compliance by itself \u2014 governance and retention policy still apply.'
  },
  {
    id: 'broker', name: 'Event Broker', tier: 'infra',
    x: 950, y: 60, w: 210, h: 100,
    boundary: 'Shared integration & infrastructure plane',
    purpose: 'Distributes durable payment outcome events (e.g. PaymentBooked, PaymentRejected) to independent consumers without the Payment Service calling each one directly.',
    tech: 'Kafka or a comparable event/messaging platform (illustrative, not a requirement).',
    comm: 'Asynchronous publish/subscribe.',
    scale: { level: 'sometimes', reason: 'Scales with partitioning, but consumer lag and ordering requirements must be designed for.' },
    failure: 'Outage delays notifications, audit, and analytics \u2014 the payment result itself must not depend on the broker being healthy.',
    reason: 'Decouples the critical payment path from downstream consumers.'
  },
  {
    id: 'observability', name: 'Observability', tier: 'infra',
    x: 950, y: 170, w: 210, h: 100,
    boundary: 'Shared integration & infrastructure plane',
    purpose: 'Centralized logs, metrics, traces, dashboards, and alerts across the feature.',
    tech: 'Logging / metrics / tracing stack (illustrative).',
    comm: 'Telemetry sent from application-tier services.',
    scale: { level: 'yes', reason: 'Collection pipelines scale independently of the payment path.' },
    failure: 'Reduces visibility during an incident, but does not itself stop payments from processing.',
    reason: 'Needed to detect and diagnose the failure modes this design anticipates.'
  },
  {
    id: 'secrets', name: 'Secrets / Identity Infra', tier: 'infra',
    x: 950, y: 295, w: 210, h: 100,
    boundary: 'Shared integration & infrastructure plane',
    purpose: 'Centrally manages service credentials and access policies for the feature\u2019s components.',
    tech: 'Secrets manager / service-identity platform (illustrative).',
    comm: 'Queried by services that need credentials or policy decisions.',
    scale: { level: 'yes', reason: 'Typically a shared platform capability sized for the whole bank, not just this feature.' },
    failure: 'Unavailability can block services from authenticating to each other \u2014 a security-critical dependency.',
    reason: 'Avoids hard-coded or scattered credentials across services.'
  },
  {
    id: 'deploy-platform', name: 'Deployment / Runtime Platform', tier: 'infra',
    x: 950, y: 420, w: 210, h: 100,
    boundary: 'Shared integration & infrastructure plane',
    purpose: 'Hosts and runs the application-tier services, e.g. as containers on a managed platform.',
    tech: 'Containers on a managed container platform; Kubernetes only as one illustrative example.',
    comm: 'Not a request path \u2014 underlies how and where services run.',
    scale: { level: 'sometimes', reason: 'The platform can add capacity, but the exact hosting choice depends on the bank\u2019s policies and operational capabilities.' },
    failure: 'A platform-level incident can affect many services at once \u2014 redundancy and health checks matter here too.',
    reason: 'The hosting choice is a bank platform decision, not invented specifically for this feature.'
  },
  {
    id: 'scheme', name: 'Instant-Payment Scheme', tier: 'external',
    x: 40, y: 692, w: 360, h: 95,
    boundary: 'Outside the bank boundary \u2014 external payment rail',
    purpose: 'The external interbank scheme that carries the instant EUR payment to the receiving bank.',
    tech: 'Illustrative \u2014 exact protocol and scheme depend on the real-world implementation.',
    comm: 'Submission and (where supported) status queries via the Payment-Rail Adapter, crossing the bank\u2019s trust boundary.',
    scale: { level: 'constrained', reason: 'Throughput and availability are governed by the scheme operator, not the bank.' },
    failure: 'Scheme slowness or outage can leave payments in an uncertain state requiring reconciliation.',
    reason: 'Required to reach banks outside the bank\u2019s own systems \u2014 not something the bank can replace or bypass.'
  },
  {
    id: 'receiving-bank', name: 'Receiving Bank', tier: 'external',
    x: 420, y: 692, w: 360, h: 95,
    boundary: 'Outside the bank boundary \u2014 external organization',
    purpose: 'The counterpart bank that receives and credits the payment on the customer\u2019s behalf.',
    tech: 'Outside the bank\u2019s control \u2014 illustrative placeholder.',
    comm: 'Reached only through the instant-payment scheme, never directly.',
    scale: { level: 'constrained', reason: 'Entirely outside this bank\u2019s influence.' },
    failure: 'Issues on the receiving side can delay confirmation but do not change how this bank manages its own ledger correctness.',
    reason: 'Represents the real-world counterpart that makes the payment meaningful to the customer.'
  },
  {
    id: 'ext-notif', name: 'External Notification Provider', tier: 'external',
    x: 800, y: 692, w: 370, h: 95,
    boundary: 'Outside the bank boundary \u2014 external organization (optional)',
    purpose: 'Third-party service used to deliver push, SMS, or email notifications to the customer\u2019s device.',
    tech: 'Push/SMS/email gateway provider (illustrative, optional).',
    comm: 'Asynchronous call from the Notification Consumer; crosses the bank\u2019s trust boundary.',
    scale: { level: 'sometimes', reason: 'Usually a managed third-party service with its own scaling and rate limits.' },
    failure: 'A delayed notification is a customer-experience issue, not a payment-correctness issue.',
    reason: 'Shown only to make the asynchronous notification path concrete; not essential to the payment\u2019s financial correctness.'
  }
];

// --- Links --------------------------------------------------------------
// type: 'sync' | 'async' | 'telemetry'
const LINKS = [
  { id: 'l-mobile-gw', source: 'mobile-app', target: 'gateway', type: 'sync', label: 'HTTPS/REST', explain: 'The channel sends the payment request as a protected HTTPS/REST call; it never calls internal services directly.' },
  { id: 'l-web-gw', source: 'web-app', target: 'gateway', type: 'sync', label: 'HTTPS/REST', explain: 'Same protected entry path as the mobile channel.' },
  { id: 'l-gw-orch', source: 'gateway', target: 'orchestrator', type: 'sync', label: 'Routed request / status', explain: 'The gateway forwards validated requests to the Payment Orchestrator and relays the status response back to the channel.' },
  { id: 'l-orch-identity', source: 'orchestrator', target: 'identity', type: 'sync', label: 'Auth / SCA check', explain: 'The orchestrator confirms the customer is authenticated and that any required SCA step has been completed.' },
  { id: 'l-orch-fraud', source: 'orchestrator', target: 'fraud', type: 'sync', label: 'Real-time risk decision', explain: 'A synchronous pre-execution risk check, required by policy before the payment proceeds.' },
  { id: 'l-orch-ledgeradapter', source: 'orchestrator', target: 'ledger-adapter', type: 'sync', label: 'Ledger operation request', explain: 'The orchestrator asks the adapter to perform the appropriate core banking operation.' },
  { id: 'l-ledgeradapter-coreledger', source: 'ledger-adapter', target: 'core-ledger', type: 'sync', label: 'Core banking transaction', explain: 'The adapter calls the existing authoritative ledger, which applies its own transactional rules.' },
  { id: 'l-orch-railadapter', source: 'orchestrator', target: 'rail-adapter', type: 'sync', label: 'Submit instant payment', explain: 'The orchestrator hands the payment to the scheme adapter for external submission.' },
  { id: 'l-railadapter-scheme', source: 'rail-adapter', target: 'scheme', type: 'sync', label: 'Payment rail message', explain: 'This call crosses the bank\u2019s trust boundary to the external instant-payment scheme.' },
  { id: 'l-scheme-receivingbank', source: 'scheme', target: 'receiving-bank', type: 'sync', label: 'Interbank settlement', explain: 'The scheme forwards the payment on toward the receiving bank.' },
  { id: 'l-orch-opstore', source: 'orchestrator', target: 'op-store', type: 'sync', label: 'Persist payment state', explain: 'The orchestrator records the idempotency key and payment lifecycle state \u2014 never the account balance itself.' },
  { id: 'l-orch-broker', source: 'orchestrator', target: 'broker', type: 'async', label: 'Publish outcome event', explain: 'Once a meaningful outcome is durably recorded, the orchestrator publishes an event such as PaymentBooked or PaymentRejected.' },
  { id: 'l-broker-notif', source: 'broker', target: 'notif-consumer', type: 'async', label: 'Payment outcome event', explain: 'The notification consumer subscribes independently \u2014 the orchestrator never calls it directly.' },
  { id: 'l-broker-audit', source: 'broker', target: 'audit-consumer', type: 'async', label: 'Payment outcome event', explain: 'Audit and monitoring consumers subscribe to the same event stream for their own purposes.' },
  { id: 'l-notif-extnotif', source: 'notif-consumer', target: 'ext-notif', type: 'async', label: 'Send push/SMS/email', explain: 'The notification service hands off delivery to a third-party provider, independent of the original API response.' },
  { id: 'l-audit-auditstore', source: 'audit-consumer', target: 'audit-store', type: 'sync', label: 'Write audit record', explain: 'Audit consumers persist durable, retained records for investigation and compliance reporting.' },
  { id: 'l-orch-observability', source: 'orchestrator', target: 'observability', type: 'telemetry', label: 'Logs / metrics / traces', explain: 'Telemetry supports detection and diagnosis of the failure modes this design anticipates.' },
  { id: 'l-railadapter-observability', source: 'rail-adapter', target: 'observability', type: 'telemetry', label: 'Logs / metrics / traces', explain: 'Rail-adapter telemetry is critical for spotting scheme slowness or timeouts.' },
  { id: 'l-fraud-observability', source: 'fraud', target: 'observability', type: 'telemetry', label: 'Logs / metrics / traces', explain: 'Latency and decision metrics for the real-time fraud check.' },
  { id: 'l-identity-secrets', source: 'identity', target: 'secrets', type: 'telemetry', label: 'Credential / policy lookup', explain: 'Services fetch credentials and access policy from a centrally managed source rather than hard-coding them.' },
  { id: 'l-orch-deploy', source: 'orchestrator', target: 'deploy-platform', type: 'telemetry', label: 'Runs on managed platform', explain: 'Represents the hosting relationship \u2014 not a request on the payment path.' }
];

// --- Payment journey steps ----------------------------------------------
const FLOW_STEPS = [
  { id: 1, title: 'Customer submits a payment', components: ['mobile-app', 'web-app', 'gateway'], links: ['l-mobile-gw', 'l-web-gw'],
    text: 'The customer enters an instant EUR payment in the mobile or web app. The request leaves the channel as a protected HTTPS/REST call.' },
  { id: 2, title: 'Gateway routes the request', components: ['gateway', 'orchestrator'], links: ['l-gw-orch'],
    text: 'The WAF/API Gateway enforces security policy and rate limits, then routes the validated request to the Payment Orchestrator. Channels never call internal services directly.' },
  { id: 3, title: 'Validation, SCA & idempotency', components: ['orchestrator', 'identity', 'op-store'], links: ['l-orch-identity', 'l-orch-opstore'],
    text: 'The Payment Orchestrator checks permissions and required SCA status with Identity & SCA, validates the request, and checks the idempotency key against the operational store to avoid creating a duplicate payment instruction.' },
  { id: 4, title: 'Real-time fraud decision', components: ['orchestrator', 'fraud'], links: ['l-orch-fraud'],
    text: 'When bank policy requires it, the Payment Orchestrator requests a synchronous, pre-execution risk decision. This is separate from later fraud analytics.' },
  { id: 5, title: 'Core banking booking', components: ['orchestrator', 'ledger-adapter', 'core-ledger'], links: ['l-orch-ledgeradapter', 'l-ledgeradapter-coreledger'],
    text: 'The orchestrator asks the Core Banking/Ledger Adapter to perform the appropriate financial operation. The existing core ledger \u2014 not this feature \u2014 remains the authoritative source of truth and applies its own transactional rules.' },
  { id: 6, title: 'Submission to the payment rail', components: ['orchestrator', 'rail-adapter', 'scheme', 'receiving-bank'], links: ['l-orch-railadapter', 'l-railadapter-scheme', 'l-scheme-receivingbank'],
    text: 'The Payment-Rail Adapter submits the payment to the external instant-payment scheme, which forwards it toward the receiving bank. This call crosses the bank\u2019s trust boundary.' },
  { id: 7, title: 'A truthful status is returned', components: ['orchestrator', 'gateway', 'op-store'], links: ['l-gw-orch', 'l-orch-opstore'],
    text: 'The customer gets a status based on what is actually known right now \u2014 e.g. accepted/processing, booked, sent, confirmed, rejected, or status unknown/reconciliation required. These states are not interchangeable, and not every rail uses the same lifecycle.' },
  { id: 8, title: 'Outcome event published', components: ['orchestrator', 'broker', 'notif-consumer', 'audit-consumer'], links: ['l-orch-broker', 'l-broker-notif', 'l-broker-audit'],
    text: 'Once a meaningful outcome is durably recorded, the orchestrator publishes an event such as PaymentBooked, PaymentRejected, or PaymentStatusChanged. Independent consumers subscribe without the orchestrator calling each one directly.' },
  { id: 9, title: 'Asynchronous notification & audit', components: ['notif-consumer', 'ext-notif', 'audit-consumer', 'audit-store', 'mobile-app'], links: ['l-notif-extnotif', 'l-audit-auditstore'],
    text: 'The notification service sends the customer a message independently of the original API response, and audit/monitoring consumers record the outcome. A delayed notification does not by itself mean the payment failed \u2014 the customer\u2019s payment result must never depend on a push notification being delivered.' }
];

// --- Failure scenarios ----------------------------------------------------
const FAILURE_SCENARIOS = [
  {
    id: 'duplicate', title: 'Duplicate client retry',
    components: ['mobile-app', 'gateway', 'orchestrator', 'op-store'],
    links: ['l-mobile-gw', 'l-gw-orch', 'l-orch-opstore'],
    trigger: 'A client or network retries the same payment submission (e.g. the customer taps "pay" twice, or the app resends after a slow response).',
    safeBehavior: 'The Payment Orchestrator recognizes the same idempotency key in the operational store and returns the result of the original request instead of creating a second payment instruction. No second core-ledger booking happens.'
  },
  {
    id: 'rail-timeout', title: 'Payment-rail timeout',
    components: ['orchestrator', 'rail-adapter', 'scheme', 'op-store'],
    links: ['l-orch-railadapter', 'l-railadapter-scheme', 'l-orch-opstore'],
    trigger: 'The external payment-rail call times out after submission \u2014 the scheme may or may not have received and processed it.',
    safeBehavior: 'The payment is recorded as "status unknown / reconciliation required" rather than assumed failed. The system uses rail-supported status checks and bounded, safe retries instead of blindly submitting a new payment.'
  },
  {
    id: 'fraud-down', title: 'Fraud service unavailable',
    components: ['orchestrator', 'fraud', 'op-store'],
    links: ['l-orch-fraud'],
    trigger: 'The mandatory real-time fraud decision service is slow or unreachable when a payment needs it.',
    safeBehavior: 'The control is never silently bypassed. A policy-controlled safe response applies \u2014 such as a temporary hold/retryable status \u2014 and the exact behavior is a bank risk-and-compliance decision, not a purely technical one.'
  }
];

// --- Decisions --------------------------------------------------------------
const DECISIONS = [
  {
    id: 'style', title: 'Architecture style',
    choice: 'A clear three-tier structure with a modular application layer; split out a separate service only when it truly needs independent scaling or ownership.',
    why: 'Keeps boundaries understandable and integration with existing core banking systems safe, while leaving room to separate a genuinely independent capability later.',
    tradeoff: 'A modular, service-based design needs API contracts, deployment coordination, and operational discipline. A single large application is simpler at first but limits independent scaling and ownership as demand grows.',
    alternative: 'Not chosen: splitting every business function into its own microservice from day one.'
  },
  {
    id: 'comm', title: 'Communication',
    choice: 'HTTPS/REST for customer-facing requests that need an immediate answer; asynchronous events for notifications, audit, and analytics.',
    why: 'The customer needs a clear payment result; notifications and analytics must not hold up the critical path, and events let new consumers subscribe without extra calls from the Payment Service.',
    tradeoff: 'Asynchronous consumers can lag, events can be redelivered, and troubleshooting needs correlation IDs and idempotent consumers.',
    alternative: 'Not chosen: calling every downstream system synchronously and directly from the Payment Service.'
  },
  {
    id: 'consistency', title: 'Data consistency',
    choice: 'The core ledger stays authoritative with its own transactional guarantees; an operational store tracks this feature\u2019s lifecycle; notifications/analytics/reporting are eventually consistent.',
    why: 'Financial correctness cannot depend on a delayed event or a cached balance; non-financial messages can update a little later without risk.',
    tradeoff: 'The UI and downstream reports may briefly disagree. Explicit payment states, idempotency, and reconciliation are required \u2014 there is no single atomic transaction spanning the ledger, rail, broker, and every consumer.',
    alternative: 'Not chosen: assuming one distributed transaction keeps the ledger, rail, broker, and all consumers perfectly in sync.'
  },
  {
    id: 'resilience', title: 'Resilience',
    choice: 'Redundant instances where the platform supports it, health checks, sensible timeouts, bounded retries, durable events, idempotency, and tested reconciliation \u2014 with policy-controlled safe behavior when the fraud check is unavailable.',
    why: 'An instance failure or temporary dependency outage should never cause a duplicate payment or a silently lost known outcome.',
    tradeoff: 'Redundancy and recovery mechanisms add cost, configuration, and operational complexity; simplicity itself is also part of resilience.',
    alternative: 'Not chosen: silently bypassing the fraud control, or blindly resubmitting a payment after any timeout.'
  },
  {
    id: 'scale', title: 'Scalability',
    choice: 'Stateless request-handling services scale horizontally; event consumers scale with load/consumer lag; caching is used only for reference/configuration data, never for live balances.',
    why: 'Customer traffic and downstream event volume grow at different rates \u2014 scale the part that needs it, not the whole system.',
    tradeoff: 'More instances and partitions raise infrastructure cost and operational complexity, and the core ledger, database, fraud service, and external rail can still become the real bottleneck.',
    alternative: 'Not chosen: assuming every component scales infinitely just because it runs in containers.'
  }
];

const COST_DRIVERS = [
  'Baseline compute & API capacity',
  'High availability / redundant instances',
  'Database & core-system capacity',
  'Event broker throughput & retention',
  'Monitoring, logs, traces & audit retention',
  'Third-party & payment-scheme fees',
  'Support, on-call, testing & disaster recovery'
];

const BUDGET_SCENARIO = {
  proposal: '\u20AC2.0M / year',
  budget: '\u20AC500K / year',
  note: 'These are invented classroom figures used to illustrate a trade-off discussion \u2014 not market prices or a vendor quote.',
  options: [
    'Phase optional capabilities instead of building everything at once',
    'Reuse existing bank platforms (identity, observability, hosting) instead of standing up new ones',
    'Negotiate scope with payment-rail and notification providers',
    'Revisit non-essential redundancy and defer it until volume justifies it'
  ],
  nonNegotiable: [
    'Ledger correctness and the existing core ledger as source of truth',
    'Required SCA / authentication controls',
    'Mandatory real-time fraud decisioning policy',
    'Auditability and required retention',
    'Minimum required availability for the payment path'
  ]
};

const RISKS_MAIN = [
  {
    id: 'risk-duplicate', title: 'Duplicate or uncertain payment outcome',
    trigger: 'Client retry, timeout, service restart, or the external rail responds too late to know the result.',
    impact: 'Duplicate payment, inconsistent customer status, reconciliation workload, and loss of trust.',
    mitigation: 'Idempotency for the business request, explicit payment states, correlation IDs, rail-supported status checking, safe retry rules, and reconciliation. Never assume a timeout means no payment occurred.'
  },
  {
    id: 'risk-dependency', title: 'A critical dependency is unavailable or too slow',
    trigger: 'Core ledger, real-time fraud decision, broker, or external rail becomes unavailable or exceeds its timeout.',
    impact: 'Payment delays, unavailable service, unsafe fallback behavior, or a growing backlog.',
    mitigation: 'Dependency-specific timeout and recovery policy, health monitoring, bounded retries, capacity validation, carefully defined fail-safe behavior, and tested operational runbooks. Uninterrupted processing is never promised for every outage.'
  },
  {
    id: 'risk-growth', title: 'Growth exceeds a constrained component\u2019s capacity',
    trigger: 'Payment volume increases sharply while a core ledger, database, fraud engine, or payment rail cannot scale at the same rate.',
    impact: 'Rising latency, timeouts, queue growth, and customer-visible delays.',
    mitigation: 'Load testing, end-to-end capacity modeling, bottleneck dashboards, scaling policies where supported, and early agreements with owners of constrained dependencies.'
  }
];

const RISKS_SECONDARY = [
  'Data protection / customer data exposure',
  'Access control gaps across services',
  'Unvetted change from a third-party provider (scheme or notification)',
  'Misinterpreting a regulatory or scheme rule'
];

const ACCEPTED_TRADEOFF = {
  statement: 'We accept eventual consistency for notifications, analytics, and reporting so the critical payment flow does not wait for downstream consumers.',
  boundary: 'This applies to downstream views and side effects \u2014 not to the bank\u2019s required financial booking and balance correctness. A notification may arrive late; the authoritative payment state must still be correctly managed.',
  gain: ['Shorter critical path for the customer', 'Fewer direct dependencies in the payment request', 'Independent consumers that can evolve separately'],
  accept: ['Downstream delays in notifications, analytics and reporting', 'Duplicate event handling needs idempotent consumers', 'More monitoring and reconciliation work']
};

const NOT_BUILT = {
  statement: 'We do not build a new core ledger or a new source of truth for account balances.',
  why: [
    'The bank already has an authoritative core banking / ledger system.',
    'Rebuilding it would dramatically expand scope, risk, time, and validation burden.',
    'The new feature integrates with the existing ledger and stores only the operational data it owns.'
  ],
  secondary: [
    'A custom notification platform instead of using the bank\u2019s chosen provider',
    'A separate microservice for every small function, regardless of need'
  ]
};

const PRESENTER_SUMMARY = [
  { title: 'Architecture style', text: 'Start with a clear three-tier design and modular business boundaries; create independently deployable services only where justified.' },
  { title: 'Communication', text: 'REST for immediate customer requests, events for downstream work that need not block the payment flow.' },
  { title: 'Data consistency', text: 'The existing core ledger stays authoritative; downstream views can converge asynchronously.' },
  { title: 'Resilience', text: 'Design for known failure modes using redundancy where justified, timeouts, bounded retries, idempotency, monitoring, and reconciliation.' },
  { title: 'Scalability', text: 'Scale suitable stateless services and consumers independently, while validating constrained components such as the ledger, database, broker, and external rail.' },
  { title: 'Cost', text: 'Invest in capabilities that protect critical financial and business outcomes; revisit optional complexity and phase delivery if the budget is insufficient.' }
];

const CORE_LESSON = 'There is no perfect architecture. Good architecture makes the business priorities, risks, and trade-offs explicit \u2014 and keeps financial correctness non-negotiable.';

const TIER_META = {
  presentation: {
    label: 'Tier 1 \u00b7 Presentation / Access', x: 25, y: 28, w: 870, h: 150,
    description: 'Customer-facing channels and the single controlled entry point into the bank\u2019s APIs. Customers never call internal services directly \u2014 every request passes through the gateway\u2019s routing, rate limits, and security policy first.'
  },
  application: {
    label: 'Tier 2 \u00b7 Application / Business Logic', x: 25, y: 188, w: 870, h: 270,
    description: 'The payment business rules: identity/SCA checks, real-time fraud decisioning, and adapters to the core ledger and the payment rail. This tier coordinates the payment lifecycle \u2014 it does not store financial data itself.'
  },
  data: {
    label: 'Tier 3 \u00b7 Data / System of Record', x: 25, y: 468, w: 870, h: 155,
    description: 'Authoritative and operational data stores. The core ledger is the bank\u2019s pre-existing system of record for balances; the operational store and audit store belong to this feature and never substitute for ledger correctness.'
  },
  infra: {
    label: 'Shared infra', x: 930, y: 10, w: 250, h: 622,
    description: 'Shared infra means infrastructure and platform capabilities used across all three tiers, rather than owned by any single one of them: the event broker that distributes outcome events, observability (logs/metrics/traces/alerts), secrets and identity infrastructure, and the deployment/runtime platform that hosts the services. These support the feature end-to-end but are not part of its payment business logic.'
  },
  external: {
    label: 'External ecosystem \u2014 outside the bank boundary', x: 10, y: 642, w: 1170, h: 148,
    description: 'Organizations and systems outside the bank\u2019s boundary: the instant-payment scheme, the receiving bank, and optionally a third-party notification provider. Every call crossing into this area crosses a trust boundary and must be treated accordingly.'
  }
};

const BANK_BOUNDARY = { x: 10, y: 10, w: 900, h: 622 };
