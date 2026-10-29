/*
 * Rendering + interaction logic for the Instant EUR Payments architecture report.
 * All diagram content is generated from the data model in data.js so the
 * diagram, inspector, legend, journey steps and failure scenarios cannot drift apart.
 */
(function () {
  'use strict';

  const byId = (id) => COMPONENTS.find((c) => c.id === id);
  const linkById = (id) => LINKS.find((l) => l.id === id);
  const pctX = (v) => (v / CANVAS.w * 100).toFixed(4) + '%';
  const pctY = (v) => (v / CANVAS.h * 100).toFixed(4) + '%';

  const SCALE_LABEL = { yes: 'Yes', sometimes: 'Sometimes', constrained: 'Constrained' };

  // Exact intersection of the center-to-center line with `rect`'s boundary,
  // so lines leaving/entering the same node fan out from distinct points
  // instead of all converging on one side-midpoint.
  function edgeAnchor(rect, otherCenter) {
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const dx = otherCenter.x - cx, dy = otherCenter.y - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const halfW = rect.w / 2, halfH = rect.h / 2;
    const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
    const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function buildMarkers(defs) {
    const sync = svgEl('marker', { id: defs.prefix + '-m-sync', markerWidth: 10, markerHeight: 10, refX: 8.5, refY: 5, orient: 'auto' });
    sync.appendChild(svgEl('path', { d: 'M0,0 L10,5 L0,10 Z', fill: 'var(--sync)' }));
    const async = svgEl('marker', { id: defs.prefix + '-m-async', markerWidth: 11, markerHeight: 11, refX: 9, refY: 5.5, orient: 'auto' });
    async.appendChild(svgEl('path', { d: 'M5.5,0 L11,5.5 L5.5,11 L0,5.5 Z', fill: 'var(--async)' }));
    const tele = svgEl('marker', { id: defs.prefix + '-m-telemetry', markerWidth: 9, markerHeight: 9, refX: 4.5, refY: 4.5, orient: 'auto' });
    tele.appendChild(svgEl('circle', { cx: 4.5, cy: 4.5, r: 3.5, fill: 'var(--telemetry)' }));
    defs.el.appendChild(sync); defs.el.appendChild(async); defs.el.appendChild(tele);
  }

  /**
   * Builds one diagram instance inside `stageEl`, wired to `inspectorEl`.
   * Returns a small API used by journey/failure controls to drive highlighting.
   */
  function createDiagram(stageEl, inspectorEl, opts) {
    opts = opts || {};
    const prefix = stageEl.id;
    stageEl.innerHTML = '';
    let selected = null; // { kind: 'node'|'link', id }
    let stepHighlight = null; // { components:[], links:[] }
    const activeFilters = { sync: true, async: true, telemetry: true };

    // --- background bands -------------------------------------------------
    Object.keys(TIER_META).forEach((tier) => {
      const m = TIER_META[tier];
      const band = document.createElement('div');
      band.className = 'tier-band tier-' + tier;
      band.style.left = pctX(m.x); band.style.top = pctY(m.y);
      band.style.width = pctX(m.w); band.style.height = pctY(m.h);
      band.tabIndex = 0;
      band.setAttribute('role', 'button');
      band.setAttribute('aria-label', m.label + ' — click for a tier overview');      band.title = m.label + ' \u2014 click for a tier overview';      const lbl = document.createElement('div');
      lbl.className = 'tier-label'; lbl.textContent = m.label;
      band.appendChild(lbl);
      band.addEventListener('click', (e) => { e.stopPropagation(); selectTier(tier); });
      band.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTier(tier); } });
      stageEl.appendChild(band);
    });

    const boundary = document.createElement('div');
    boundary.className = 'bank-boundary';
    boundary.style.left = pctX(BANK_BOUNDARY.x); boundary.style.top = pctY(BANK_BOUNDARY.y);
    boundary.style.width = pctX(BANK_BOUNDARY.w); boundary.style.height = pctY(BANK_BOUNDARY.h);
    stageEl.appendChild(boundary);
    const bLabel = document.createElement('div');
    bLabel.className = 'bank-boundary-label';
    bLabel.textContent = "Bank's internal system boundary";
    bLabel.style.left = pctX(BANK_BOUNDARY.x + 10);
    bLabel.style.top = pctY(BANK_BOUNDARY.y + BANK_BOUNDARY.h / 2);
    stageEl.appendChild(bLabel);

    // --- SVG connector layer ----------------------------------------------
    const svg = svgEl('svg', { viewBox: `0 0 ${CANVAS.w} ${CANVAS.h}`, preserveAspectRatio: 'xMidYMid meet' });
    const defsEl = svgEl('defs', {});
    svg.appendChild(defsEl);
    buildMarkers({ el: defsEl, prefix });
    stageEl.appendChild(svg);

    const linkEls = {};
    LINKS.forEach((link) => {
      const a = byId(link.source), b = byId(link.target);
      const centerA = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      const centerB = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      const p1 = edgeAnchor(a, centerB), p2 = edgeAnchor(b, centerA);
      const g = svgEl('g', { class: 'conn conn-' + link.type, 'data-id': link.id });
      const titleEl = svgEl('title', {});
      titleEl.textContent = `${a.name} \u2192 ${b.name}: ${link.label}`;
      const line = svgEl('path', {
        class: 'conn-line conn-' + link.type,
        d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
        'marker-end': `url(#${prefix}-m-${link.type})`
      });
      const startDot = svgEl('circle', { class: 'conn-dot conn-' + link.type, cx: p1.x, cy: p1.y, r: 4.5 });
      const hit = svgEl('path', { class: 'conn-hit', d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}` });
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const label = svgEl('text', { class: 'conn-label', x: mx, y: my - 4, 'text-anchor': 'middle' });
      label.textContent = link.label;
      g.appendChild(titleEl); g.appendChild(line); g.appendChild(label); g.appendChild(startDot); g.appendChild(hit);
      g.addEventListener('click', (e) => { e.stopPropagation(); selectLink(link.id); });
      g.addEventListener('mouseenter', () => g.classList.add('hovered'));
      g.addEventListener('mouseleave', () => g.classList.remove('hovered'));
      svg.appendChild(g);
      linkEls[link.id] = g;
    });

    // --- component nodes ----------------------------------------------------
    const nodeEls = {};
    COMPONENTS.forEach((c) => {
      const node = document.createElement('div');
      node.className = 'node tier-' + c.tier + (c.existing ? ' existing-system' : '');
      node.style.left = pctX(c.x); node.style.top = pctY(c.y);
      node.style.width = pctX(c.w); node.style.height = pctY(c.h);
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', c.name);
      node.innerHTML = `<div class="node-tier-tag">${c.tier}${c.existing ? ' \u00b7 existing' : ''}</div><div class="node-name">${c.name}</div>`;
      node.addEventListener('click', (e) => { e.stopPropagation(); selectNode(c.id); });
      node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(c.id); } });
      stageEl.appendChild(node);
      nodeEls[c.id] = node;
    });

    function clearStates() {
      Object.values(nodeEls).forEach((n) => n.classList.remove('selected', 'dimmed', 'active-step'));
      Object.values(linkEls).forEach((l) => l.classList.remove('selected', 'dimmed', 'active-step'));
    }

    function applyDim(connectedNodeIds, connectedLinkIds) {
      Object.keys(nodeEls).forEach((id) => {
        if (!connectedNodeIds.has(id)) nodeEls[id].classList.add('dimmed');
      });
      Object.keys(linkEls).forEach((id) => {
        if (!connectedLinkIds.has(id)) linkEls[id].classList.add('dimmed');
      });
    }

    function renderInspectorComponent(c) {
      const scaleClass = 'insp-scale-' + c.scale.level;
      inspectorEl.innerHTML = `
        <div class="insp-title">${c.name}</div>
        <div class="insp-tag">${c.boundary}</div>
        <dl>
          <div class="insp-field"><dt>Purpose</dt><dd>${c.purpose}</dd></div>
          <div class="insp-field"><dt>Technology example</dt><dd>${c.tech}</dd></div>
          <div class="insp-field"><dt>Communication</dt><dd>${c.comm}</dd></div>
          <div class="insp-field"><dt>Can it scale independently?</dt><dd><span class="insp-scale ${scaleClass}">${SCALE_LABEL[c.scale.level]}</span> \u2014 ${c.scale.reason}</dd></div>
          <div class="insp-field"><dt>Failure consideration</dt><dd>${c.failure}</dd></div>
          <div class="insp-field"><dt>Architectural reason</dt><dd>${c.reason}</dd></div>
        </dl>`;
    }

    function renderInspectorLink(link) {
      const a = byId(link.source), b = byId(link.target);
      const typeLabel = { sync: 'Synchronous request/response', async: 'Asynchronous event', telemetry: 'Telemetry / control-plane' }[link.type];
      inspectorEl.innerHTML = `
        <div class="insp-title">${a.name} \u2192 ${b.name}</div>
        <div class="insp-tag">${typeLabel}</div>
        <dl>
          <div class="insp-field"><dt>Label</dt><dd>${link.label}</dd></div>
          <div class="insp-field"><dt>Why this interaction exists</dt><dd>${link.explain}</dd></div>
        </dl>`;
    }

    function selectNode(id) {
      selected = { kind: 'node', id };
      stepHighlight = null;
      clearStates();
      const connectedLinks = LINKS.filter((l) => l.source === id || l.target === id);
      const connectedNodeIds = new Set([id, ...connectedLinks.flatMap((l) => [l.source, l.target])]);
      const connectedLinkIds = new Set(connectedLinks.map((l) => l.id));
      applyDim(connectedNodeIds, connectedLinkIds);
      nodeEls[id].classList.add('selected');
      connectedLinks.forEach((l) => linkEls[l.id].classList.add('selected'));
      renderInspectorComponent(byId(id));
    }

    function selectLink(id) {
      selected = { kind: 'link', id };
      stepHighlight = null;
      clearStates();
      const link = linkById(id);
      applyDim(new Set([link.source, link.target]), new Set([id]));
      linkEls[id].classList.add('selected');
      nodeEls[link.source].classList.add('selected');
      nodeEls[link.target].classList.add('selected');
      renderInspectorLink(link);
    }

    function selectTier(tierKey) {
      selected = { kind: 'tier', id: tierKey };
      stepHighlight = null;
      clearStates();
      const tierNodeIds = new Set(COMPONENTS.filter((c) => c.tier === tierKey).map((c) => c.id));
      const tierLinkIds = new Set(LINKS.filter((l) => tierNodeIds.has(l.source) || tierNodeIds.has(l.target)).map((l) => l.id));
      applyDim(tierNodeIds, tierLinkIds);
      tierNodeIds.forEach((id) => nodeEls[id].classList.add('selected'));
      renderInspectorTier(tierKey);
    }

    function renderInspectorTier(tierKey) {
      const m = TIER_META[tierKey];
      inspectorEl.innerHTML = `
        <div class="insp-title">${m.label}</div>
        <div class="insp-tag">Tier overview</div>
        <p style="color:var(--text-dim);font-size:.9rem;margin-top:8px;">${m.description}</p>`;
    }

    function clearSelection() {
      selected = null; stepHighlight = null;
      clearStates();
      inspectorEl.innerHTML = '<div class="inspector-placeholder">' + (opts.placeholder || 'Click a component or a connecting line in the diagram to see its details here.') + '</div>';
    }

    function setStepHighlight(componentIds, linkIds, title) {
      selected = null;
      clearStates();
      const nodeSet = new Set(componentIds);
      const linkSet = new Set(linkIds);
      applyDim(nodeSet, linkSet);
      componentIds.forEach((id) => nodeEls[id] && nodeEls[id].classList.add('active-step'));
      linkIds.forEach((id) => linkEls[id] && linkEls[id].classList.add('active-step'));
      if (title) {
        inspectorEl.innerHTML = `<div class="insp-title">${title}</div><div class="insp-tag">Active in this step</div><p style="color:var(--text-dim);font-size:.82rem;margin-top:8px;">Click any highlighted component or line for its full detail.</p>`;
      }
    }

    function applyFilters() {
      LINKS.forEach((l) => {
        const show = activeFilters[l.type];
        linkEls[l.id].style.display = show ? '' : 'none';
      });
    }

    function setFilter(type, show) { activeFilters[type] = show; applyFilters(); }

    stageEl.addEventListener('click', () => clearSelection());

    return { clearSelection, selectNode, selectLink, setStepHighlight, setFilter, nodeEls, linkEls };
  }

  // =========================================================================
  // Boot
  // =========================================================================
  const mainDiagram = createDiagram(
    document.getElementById('diagramStage-main'),
    document.getElementById('inspector-main')
  );
  const journeyDiagram = createDiagram(
    document.getElementById('diagramStage-journey'),
    document.getElementById('inspector-journey'),
    { placeholder: 'The active journey step highlights components and connections here. Click any of them for full detail.' }
  );
  const failureDiagram = createDiagram(
    document.getElementById('diagramStage-failure'),
    document.getElementById('inspector-failure'),
    { placeholder: 'The selected failure scenario highlights components and connections here. Click any of them for full detail.' }
  );

  // --- filters (Overview toolbar controls the main diagram) ----------------
  document.querySelectorAll('[data-filter]').forEach((input) => {
    input.addEventListener('change', () => mainDiagram.setFilter(input.dataset.filter, input.checked));
  });
  document.getElementById('btnClearSelection').addEventListener('click', () => mainDiagram.clearSelection());

  // --- Payment journey -------------------------------------------------------
  let stepIndex = 0;
  function renderStep() {
    const step = FLOW_STEPS[stepIndex];
    document.getElementById('journeyIndicator').textContent = `Step ${step.id} of ${FLOW_STEPS.length}`;
    document.getElementById('journeyTitle').textContent = step.title;
    document.getElementById('journeyText').textContent = step.text;
    journeyDiagram.setStepHighlight(step.components, step.links, step.title);
    document.getElementById('btnPrevStep').disabled = stepIndex === 0;
    document.getElementById('btnNextStep').textContent = stepIndex === FLOW_STEPS.length - 1 ? 'Restart \u25B6' : 'Next \u25B6';
  }
  document.getElementById('btnNextStep').addEventListener('click', () => {
    stepIndex = (stepIndex + 1) % FLOW_STEPS.length;
    renderStep();
  });
  document.getElementById('btnPrevStep').addEventListener('click', () => {
    stepIndex = Math.max(0, stepIndex - 1);
    renderStep();
  });
  document.getElementById('btnResetJourney').addEventListener('click', () => { stepIndex = 0; renderStep(); });
  renderStep();

  // --- Failure scenarios -------------------------------------------------
  const failureSelectEl = document.getElementById('failureSelect');
  const failureDetailEl = document.getElementById('failureDetail');
  let activeFailure = null;
  FAILURE_SCENARIOS.forEach((fs) => {
    const btn = document.createElement('button');
    btn.className = 'failure-btn';
    btn.textContent = fs.title;
    btn.addEventListener('click', () => showFailure(fs.id));
    failureSelectEl.appendChild(btn);
  });
  function showFailure(id) {
    activeFailure = id;
    Array.from(failureSelectEl.children).forEach((btn, i) => btn.classList.toggle('active', FAILURE_SCENARIOS[i].id === id));
    const fs = FAILURE_SCENARIOS.find((f) => f.id === id);
    failureDiagram.setStepHighlight(fs.components, fs.links, fs.title);
    failureDetailEl.innerHTML = `
      <dl>
        <dt>Trigger</dt><dd>${fs.trigger}</dd>
        <dt>Safe behavior</dt><dd>${fs.safeBehavior}</dd>
      </dl>`;
  }
  showFailure(FAILURE_SCENARIOS[0].id);

  // --- Decisions -----------------------------------------------------------
  const decisionsGrid = document.getElementById('decisionsGrid');
  DECISIONS.forEach((d) => {
    const card = document.createElement('div');
    card.className = 'card decision-card';
    card.innerHTML = `
      <h3>${d.title}</h3>
      <div class="d-field"><div class="d-label">Chosen</div><p class="d-value">${d.choice}</p></div>
      <div class="d-field"><div class="d-label">Why</div><p class="d-value">${d.why}</p></div>
      <div class="d-field"><div class="d-label">Trade-off</div><p class="d-value">${d.tradeoff}</p></div>
      <div class="d-field"><div class="d-label">Alternative</div><p class="d-alt">${d.alternative}</p></div>`;
    decisionsGrid.appendChild(card);
  });

  const costDriversEl = document.getElementById('costDrivers');
  COST_DRIVERS.forEach((c) => {
    const li = document.createElement('li'); li.textContent = c; costDriversEl.appendChild(li);
  });

  const budgetPanel = document.getElementById('budgetPanel');
  budgetPanel.innerHTML = `
    <div class="budget-figures">
      <div class="budget-figure"><div class="num num-proposal">${BUDGET_SCENARIO.proposal}</div><div class="lbl">Ambitious proposal</div></div>
      <div class="budget-figure"><div class="num num-budget">${BUDGET_SCENARIO.budget}</div><div class="lbl">Available budget</div></div>
    </div>
    <p class="budget-note">${BUDGET_SCENARIO.note}</p>
    <div class="budget-cols">
      <div><h4>Options to revisit</h4><ul>${BUDGET_SCENARIO.options.map((o) => `<li>${o}</li>`).join('')}</ul></div>
      <div><h4>Non-negotiable</h4><ul>${BUDGET_SCENARIO.nonNegotiable.map((o) => `<li>${o}</li>`).join('')}</ul></div>
    </div>`;
  document.getElementById('btnBudget').addEventListener('click', () => {
    const hidden = budgetPanel.classList.toggle('hidden');
    document.getElementById('btnBudget').textContent = hidden ? 'Show budget pressure scenario' : 'Hide budget pressure scenario';
  });

  // --- Risks -----------------------------------------------------------------
  const risksGrid = document.getElementById('risksGrid');
  RISKS_MAIN.forEach((r) => {
    const card = document.createElement('div');
    card.className = 'card risk-card';
    card.innerHTML = `
      <h3>${r.title}</h3>
      <div class="r-field"><div class="r-label">Trigger</div><p class="r-value">${r.trigger}</p></div>
      <div class="r-field"><div class="r-label">Impact</div><p class="r-value">${r.impact}</p></div>
      <div class="r-field"><div class="r-label">Mitigation</div><p class="r-value">${r.mitigation}</p></div>`;
    risksGrid.appendChild(card);
  });
  const risksSecondaryEl = document.getElementById('risksSecondary');
  RISKS_SECONDARY.forEach((r) => { const li = document.createElement('li'); li.textContent = r; risksSecondaryEl.appendChild(li); });

  // --- Accepted trade-off / not built ----------------------------------------
  document.getElementById('acceptedCard').innerHTML = `
    <h3>What we accepted</h3>
    <p class="statement">${ACCEPTED_TRADEOFF.statement}</p>
    <p>${ACCEPTED_TRADEOFF.boundary}</p>
    <div class="gain-accept">
      <div class="gain"><h4>Gain</h4><ul>${ACCEPTED_TRADEOFF.gain.map((g) => `<li>${g}</li>`).join('')}</ul></div>
      <div class="accept"><h4>Accept</h4><ul>${ACCEPTED_TRADEOFF.accept.map((g) => `<li>${g}</li>`).join('')}</ul></div>
    </div>`;
  document.getElementById('notBuiltCard').innerHTML = `
    <h3>What we deliberately did not build</h3>
    <p class="statement">${NOT_BUILT.statement}</p>
    <ul>${NOT_BUILT.why.map((w) => `<li>${w}</li>`).join('')}</ul>
    <h4 style="margin-top:14px;font-size:.78rem;text-transform:uppercase;color:var(--text-dimmer);">Also out of scope</h4>
    <ul>${NOT_BUILT.secondary.map((w) => `<li>${w}</li>`).join('')}</ul>`;

  // --- Presenter summary -------------------------------------------------
  const summaryList = document.getElementById('summaryList');
  PRESENTER_SUMMARY.forEach((s) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${s.title}:</strong> ${s.text}`;
    summaryList.appendChild(li);
  });
  document.getElementById('coreLesson').textContent = CORE_LESSON;

  // --- Nav rail scrollspy + reset + presentation mode -----------------------
  const sections = Array.from(document.querySelectorAll('.panel'));
  const railLinks = Array.from(document.querySelectorAll('.rail-link'));
  function setActiveRail(id) {
    railLinks.forEach((a) => a.classList.toggle('active', a.dataset.sec === id));
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) setActiveRail(entry.target.id); });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach((s) => observer.observe(s));

  document.getElementById('btnReset').addEventListener('click', () => {
    mainDiagram.clearSelection();
    document.getElementById('sec-overview').scrollIntoView({ behavior: 'smooth' });
    document.body.classList.remove('presenting');
  });

  document.getElementById('btnPresent').addEventListener('click', () => {
    document.body.classList.toggle('presenting');
  });
})();
