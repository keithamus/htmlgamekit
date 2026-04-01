import { initAttrs } from "./component.js";
import { matchesConditions, resolve } from "./conditions.js";
import { camelCase } from "./component.js";
import { effect as signalEffect, Signal } from "./signals.js";

const PANEL_WIDTH = 420;
const NODE_W = 180;
const NODE_H = 56;
const NODE_PAD_X = 40;
const NODE_PAD_Y = 24;
const GRID_X = NODE_W + NODE_PAD_X;
const GRID_Y = NODE_H + NODE_PAD_Y;

function elLabel(el) {
  const tag = el.localName;
  const id = el.id ? `#${el.id}` : "";
  const name = el.getAttribute("name") || "";
  const cls = el.classList.length
    ? `.${[...el.classList].slice(0, 2).join(".")}`
    : "";
  let label = `<${tag}${id}>`;
  if (name) label += ` "${name}"`;
  else if (cls) label += ` ${cls}`;
  if (label.length > 28) label = label.slice(0, 27) + "\u2026";
  return label;
}

function parseConditions(el) {
  const conditions = [];
  for (const attr of el.attributes) {
    if (!attr.name.startsWith("when-")) continue;
    const rest = attr.name.slice(5);
    const val = attr.value;
    if (rest === "prob") {
      conditions.push({ op: "prob", key: null, value: val, raw: attr.name });
      continue;
    }
    let op, key;
    for (const prefix of ["min-", "max-", "eq-", "no-", "some-", "all-"]) {
      if (rest.startsWith(prefix)) {
        op = prefix.slice(0, -1);
        key = camelCase(rest.slice(prefix.length));
        break;
      }
    }
    if (!op) continue;
    conditions.push({ op, key, value: val, raw: attr.name });
  }
  return conditions;
}

function walkTree(root) {
  const nodes = [];
  const seen = new Set();
  const walk = (el, depth) => {
    if (seen.has(el)) return;
    seen.add(el);
    const conditions = parseConditions(el);
    if (conditions.length > 0) {
      nodes.push({ el, conditions, depth, children: [] });
    }
    for (const child of el.children) {
      walk(child, depth + 1);
    }
  };
  for (const child of root.children) {
    walk(child, 0);
  }
  return nodes;
}

function buildGraph(nodes, shell) {
  const graph = { nodes: [], edges: [] };
  const keyToProducers = new Map();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const passing = matchesConditions(n.el, shell);
    graph.nodes.push({
      id: i,
      label: elLabel(n.el),
      conditions: n.conditions,
      passing,
      depth: n.depth,
      el: n.el,
    });
  }

  // Discover edges: look for elements that SET stats/collections
  // which other elements depend on via when-* conditions.
  // For now, edges are condition-key groupings.
  const keyToConsumers = new Map();
  for (const node of graph.nodes) {
    for (const c of node.conditions) {
      if (!c.key) continue;
      if (!keyToConsumers.has(c.key)) keyToConsumers.set(c.key, []);
      keyToConsumers.get(c.key).push(node);
    }
  }

  // Group nodes by the keys they depend on for clustering
  graph.keyGroups = keyToConsumers;
  return graph;
}

function layoutNodes(graphNodes) {
  // Group by depth, assign grid positions
  const byDepth = new Map();
  for (const node of graphNodes) {
    if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
    byDepth.get(node.depth).push(node);
  }
  const depths = [...byDepth.keys()].sort((a, b) => a - b);
  let maxCol = 0;
  for (const d of depths) {
    const group = byDepth.get(d);
    for (let i = 0; i < group.length; i++) {
      group[i].col = i;
      group[i].row = depths.indexOf(d);
      maxCol = Math.max(maxCol, i);
    }
  }
  return { rows: depths.length, cols: maxCol + 1 };
}

/**
 * Debug panel that visualises the condition tree of a game-shell's
 * descendants. Shows all elements with `when-*` attributes as nodes
 * in a graph, colour-coded by pass/fail state. Updates live as
 * signals change.
 *
 * Toggle with Ctrl+Shift+D or by setting the `open` attribute.
 * Place as a child of `<game-shell>`.
 *
 * @summary Visual condition-tree debugger
 */
export default class GameDebug extends HTMLElement {
  static attrs = {
    open: { type: "boolean" },
  };

  #shadow = this.attachShadow({ mode: "open" });
  #shell = null;
  #graphNodes = [];
  #effectDisposers = [];
  #panel = null;
  #canvas = null;
  #stateList = null;
  #resizeObs = null;

  static define(tag = "game-debug", registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }

  connectedCallback() {
    this.#shell = this.closest("game-shell");
    this.#buildDOM();
    this.#bindKeys();
    if (this.open) this.#refresh();
  }

  disconnectedCallback() {
    for (const d of this.#effectDisposers) d();
    this.#effectDisposers = [];
    this.#resizeObs?.disconnect();
  }

  #buildDOM() {
    this.#shadow.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = STYLES;
    this.#shadow.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    backdrop.addEventListener("click", () => this.#close());
    this.#shadow.appendChild(backdrop);

    const panel = document.createElement("div");
    panel.className = "panel";
    this.#panel = panel;

    const header = document.createElement("div");
    header.className = "header";
    header.innerHTML =
      '<span class="title">Condition Tree</span>' +
      '<kbd>F2</kbd>' +
      '<button class="close" aria-label="Close">\u00d7</button>';
    header.querySelector(".close").addEventListener("click", () =>
      this.#close(),
    );
    panel.appendChild(header);

    const stateSection = document.createElement("div");
    stateSection.className = "state-section";
    stateSection.innerHTML = '<div class="section-title">Live State</div>';
    this.#stateList = document.createElement("div");
    this.#stateList.className = "state-list";
    stateSection.appendChild(this.#stateList);
    panel.appendChild(stateSection);

    const graphSection = document.createElement("div");
    graphSection.className = "graph-section";
    graphSection.innerHTML = '<div class="section-title">Condition Nodes</div>';
    this.#canvas = document.createElement("div");
    this.#canvas.className = "canvas";
    graphSection.appendChild(this.#canvas);
    panel.appendChild(graphSection);

    this.#shadow.appendChild(panel);
  }

  #bindKeys() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        if (this.open) this.#close();
        else this.#open();
      }
    });
  }

  #open() {
    this.open = true;
    this.setAttribute("open", "");
    this.#refresh();
  }

  #close() {
    this.open = false;
    this.removeAttribute("open");
  }

  #refresh() {
    if (!this.#shell) return;
    // Clean up old effects
    for (const d of this.#effectDisposers) d();
    this.#effectDisposers = [];

    const treeNodes = walkTree(this.#shell);
    const graph = buildGraph(treeNodes, this.#shell);
    const dims = layoutNodes(graph.nodes);

    this.#renderState();
    this.#renderGraph(graph, dims);

    // Live-update via effect
    const disposer = signalEffect(() => {
      if (!this.open) return;
      // Touch signals to subscribe
      this.#shell.scene?.get();
      this.#shell.round?.get();
      this.#shell.score?.get();
      this.#shell.stats?.get();
      this.#shell.difficulty?.get();
      this.#shell.passStreak?.get();
      this.#shell.failStreak?.get();

      // Re-evaluate conditions
      for (const node of graph.nodes) {
        const passing = matchesConditions(node.el, this.#shell);
        const domNode = this.#canvas.querySelector(
          `[data-node-id="${node.id}"]`,
        );
        if (domNode) {
          domNode.classList.toggle("passing", passing);
          domNode.classList.toggle("failing", !passing);
          node.passing = passing;
        }
      }
      this.#renderState();
    });
    this.#effectDisposers.push(disposer);
  }

  #renderState() {
    if (!this.#stateList || !this.#shell) return;
    const shell = this.#shell;
    const entries = [];

    const scene = shell.scene?.get();
    if (scene) entries.push(["scene", scene]);
    const round = shell.round?.get();
    entries.push(["round", round]);
    const score = shell.score?.get();
    if (score) entries.push(["score", score]);
    const streak = shell.passStreak?.get();
    if (streak) entries.push(["passStreak", streak]);

    const stats = shell.stats?.get();
    if (stats && typeof stats === "object") {
      for (const [k, v] of Object.entries(stats)) {
        entries.push([`stat.${k}`, v]);
      }
    }

    // Collections
    if (shell.collectionEntries) {
      const collections = shell._collections || new Map();
      // We can only iterate known collections via the graph's key groups
      const knownCollections = new Set();
      const treeNodes = walkTree(shell);
      for (const n of treeNodes) {
        for (const c of n.conditions) {
          if (c.key && shell.isCollection?.(c.key)) {
            knownCollections.add(c.key);
          }
        }
      }
      for (const name of knownCollections) {
        const items = shell.collectionEntries(name);
        entries.push([
          `collection.${name}`,
          items.length ? items.join(", ") : "(empty)",
        ]);
      }
    }

    this.#stateList.innerHTML = entries
      .map(
        ([k, v]) =>
          `<div class="state-row"><span class="state-key">${k}</span><span class="state-val">${v}</span></div>`,
      )
      .join("");
  }

  #renderGraph(graph, dims) {
    if (!this.#canvas) return;
    this.#canvas.innerHTML = "";

    if (graph.nodes.length === 0) {
      this.#canvas.innerHTML =
        '<div class="empty">No when-* conditions found</div>';
      return;
    }

    const svgW = (dims.cols || 1) * GRID_X + NODE_PAD_X;
    const svgH = (dims.rows || 1) * GRID_Y + NODE_PAD_Y;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", svgW);
    svg.setAttribute("height", svgH);
    svg.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);
    svg.style.minWidth = `${svgW}px`;

    // Draw edges between same-depth-adjacent nodes that share condition keys
    // (simplified: connect parent-depth nodes to child-depth nodes with shared keys)
    const nodePositions = new Map();
    for (const node of graph.nodes) {
      const x = NODE_PAD_X / 2 + node.col * GRID_X;
      const y = NODE_PAD_Y / 2 + node.row * GRID_Y;
      nodePositions.set(node.id, { x: x + NODE_W / 2, y: y + NODE_H / 2 });
    }

    // Draw edges for nodes that share condition keys across depth levels
    const drawn = new Set();
    for (const [key, consumers] of graph.keyGroups) {
      for (let i = 0; i < consumers.length - 1; i++) {
        for (let j = i + 1; j < consumers.length; j++) {
          const a = consumers[i];
          const b = consumers[j];
          if (a.depth === b.depth) continue;
          const edgeKey = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
          if (drawn.has(edgeKey)) continue;
          drawn.add(edgeKey);
          const pa = nodePositions.get(a.id);
          const pb = nodePositions.get(b.id);
          if (pa && pb) {
            const line = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "line",
            );
            line.setAttribute("x1", pa.x);
            line.setAttribute("y1", pa.y);
            line.setAttribute("x2", pb.x);
            line.setAttribute("y2", pb.y);
            line.setAttribute("class", "edge");
            svg.appendChild(line);

            // Label on edge midpoint
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const text = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "text",
            );
            text.setAttribute("x", mx);
            text.setAttribute("y", my - 4);
            text.setAttribute("class", "edge-label");
            text.textContent = key;
            svg.appendChild(text);
          }
        }
      }
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const x = NODE_PAD_X / 2 + node.col * GRID_X;
      const y = NODE_PAD_Y / 2 + node.row * GRID_Y;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-node-id", node.id);
      g.setAttribute(
        "class",
        `node ${node.passing ? "passing" : "failing"}`,
      );

      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", NODE_W);
      rect.setAttribute("height", NODE_H);
      rect.setAttribute("rx", 6);
      g.appendChild(rect);

      const title = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      title.setAttribute("x", x + 8);
      title.setAttribute("y", y + 18);
      title.setAttribute("class", "node-label");
      title.textContent = node.label;
      g.appendChild(title);

      const condText = node.conditions
        .map((c) => {
          if (c.op === "prob") return `prob ${c.value}`;
          return `${c.op} ${c.key}${c.value ? "=" + c.value : ""}`;
        })
        .join(", ");

      const cond = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      cond.setAttribute("x", x + 8);
      cond.setAttribute("y", y + 36);
      cond.setAttribute("class", "node-cond");
      cond.textContent =
        condText.length > 30 ? condText.slice(0, 29) + "\u2026" : condText;
      g.appendChild(cond);

      // Status indicator dot
      const dot = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      dot.setAttribute("cx", x + NODE_W - 12);
      dot.setAttribute("cy", y + 14);
      dot.setAttribute("r", 5);
      dot.setAttribute("class", "status-dot");
      g.appendChild(dot);

      // Click to inspect
      g.style.cursor = "pointer";
      g.addEventListener("click", () => this.#inspectNode(node));

      // Title tooltip
      const svgTitle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "title",
      );
      svgTitle.textContent = `${node.label}\n${node.conditions.map((c) => c.raw + (c.value ? `="${c.value}"` : "")).join("\n")}`;
      g.appendChild(svgTitle);

      svg.appendChild(g);
    }

    this.#canvas.appendChild(svg);
  }

  #inspectNode(node) {
    // Highlight the element in the real DOM
    const el = node.el;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.outline = "2px solid #f59e0b";
    el.style.outlineOffset = "2px";
    setTimeout(() => {
      el.style.outline = "";
      el.style.outlineOffset = "";
    }, 2000);

    // Log details to console
    console.group(`[game-debug] ${node.label}`);
    console.log("Element:", el);
    console.log("Conditions:", node.conditions);
    console.log("Passing:", node.passing);
    if (this.#shell) {
      for (const c of node.conditions) {
        if (c.key) {
          const val = resolve(c.key, this.#shell);
          console.log(`  ${c.key} = ${val}`);
        }
      }
    }
    console.groupEnd();
  }
}

const STYLES = `
  :host {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
    pointer-events: none;
  }
  :host([open]) {
    display: block;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    pointer-events: auto;
  }

  .panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${PANEL_WIDTH}px;
    max-width: 90vw;
    background: #1a1a2e;
    border-left: 1px solid #333;
    color: #e0e0e0;
    font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }

  .title {
    font-weight: 700;
    font-size: 13px;
    flex: 1;
  }

  kbd {
    background: #2a2a3e;
    border: 1px solid #444;
    border-radius: 3px;
    padding: 1px 6px;
    font-size: 10px;
    color: #888;
  }

  .close {
    background: none;
    border: none;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  .close:hover { color: #fff; }

  .section-title {
    padding: 8px 12px 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #666;
  }

  .state-section {
    border-bottom: 1px solid #333;
    flex-shrink: 0;
    max-height: 200px;
    overflow-y: auto;
  }

  .state-list {
    padding: 0 12px 8px;
  }

  .state-row {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    gap: 8px;
  }

  .state-key {
    color: #7c8fa8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .state-val {
    color: #e0e0e0;
    font-weight: 600;
    white-space: nowrap;
    text-align: right;
  }

  .graph-section {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .canvas {
    padding: 8px;
    overflow: auto;
  }

  .empty {
    padding: 24px;
    text-align: center;
    color: #666;
  }

  svg {
    display: block;
  }

  .edge {
    stroke: #444;
    stroke-width: 1;
    stroke-dasharray: 4 3;
  }

  .edge-label {
    fill: #666;
    font-size: 9px;
    text-anchor: middle;
    font-family: inherit;
  }

  .node rect {
    fill: #2a2a3e;
    stroke: #444;
    stroke-width: 1.5;
    transition: fill 0.2s, stroke 0.2s;
  }

  .node.passing rect {
    stroke: #22c55e;
    fill: #1a2e1a;
  }

  .node.failing rect {
    stroke: #ef4444;
    fill: #2e1a1a;
  }

  .node-label {
    fill: #e0e0e0;
    font-size: 11px;
    font-weight: 700;
    font-family: inherit;
  }

  .node-cond {
    fill: #888;
    font-size: 9px;
    font-family: inherit;
  }

  .status-dot {
    transition: fill 0.2s;
  }

  .node.passing .status-dot {
    fill: #22c55e;
  }

  .node.failing .status-dot {
    fill: #ef4444;
  }

  .node:hover rect {
    stroke-width: 2;
    filter: brightness(1.2);
  }
`;
