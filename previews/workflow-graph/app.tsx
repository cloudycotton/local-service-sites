import React, { useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

type NodeKind = "material" | "process" | "inspection";

type WorkflowNode = {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  locked: boolean;
  method: string;
  duration: number;
  tool: string;
};

type WorkflowEdge = {
  id: string;
  source: string;
  target: string;
};

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "mat-001",
    kind: "material",
    label: "Aluminum substrate",
    x: 25,
    y: 190,
    locked: true,
    method: "AL-6061",
    duration: 0,
    tool: "material-catalog",
  },
  {
    id: "proc-001",
    kind: "process",
    label: "Laser ablation",
    x: 235,
    y: 95,
    locked: false,
    method: "ABLATE-V3",
    duration: 42,
    tool: "laser-cell-02",
  },
  {
    id: "insp-001",
    kind: "inspection",
    label: "Optical inspection",
    x: 105,
    y: 365,
    locked: false,
    method: "OPT-QA-12",
    duration: 16,
    tool: "vision-rig-04",
  },
  {
    id: "proc-002",
    kind: "process",
    label: "Precision bonding",
    x: 360,
    y: 275,
    locked: false,
    method: "BOND-08",
    duration: 65,
    tool: "",
  },
];

const INITIAL_EDGES: WorkflowEdge[] = [
  { id: "edge-001", source: "mat-001", target: "proc-001" },
  { id: "edge-002", source: "proc-001", target: "insp-001" },
  { id: "edge-003", source: "insp-001", target: "proc-002" },
];

const KIND_LABELS: Record<NodeKind, string> = {
  material: "Material",
  process: "Process",
  inspection: "Inspection",
};

const TOOLS: Array<{ kind: NodeKind; code: string; title: string; note: string }> = [
  { kind: "material", code: "MT", title: "Material", note: "Catalog-backed input" },
  { kind: "process", code: "PR", title: "Process", note: "Transform or assembly" },
  { kind: "inspection", code: "QA", title: "Inspection", note: "Validation checkpoint" },
];

function nextId(nodes: WorkflowNode[], kind: NodeKind): string {
  const prefix = kind === "material" ? "mat" : kind === "process" ? "proc" : "insp";
  const used = nodes
    .filter((node) => node.id.startsWith(`${prefix}-`))
    .map((node) => Number(node.id.split("-")[1]))
    .filter(Number.isFinite);
  return `${prefix}-${String(Math.max(0, ...used) + 1).padStart(3, "0")}`;
}

function stableWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  return {
    schemaVersion: "workflow.v1.4.0",
    workflowId: "wf-laser-bond-001",
    exportedAt: "deterministic-at-commit",
    nodes: [...nodes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ x: _x, y: _y, ...node }) => node),
    edges: [...edges].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function initialNodes(compact: boolean): WorkflowNode[] {
  if (!compact) return INITIAL_NODES.map((node) => ({ ...node }));
  const positions = [
    { x: 15, y: 125 },
    { x: 190, y: 85 },
    { x: 15, y: 340 },
    { x: 190, y: 295 },
  ];
  return INITIAL_NODES.map((node, index) => ({ ...node, ...positions[index] }));
}

function App() {
  const [compact] = useState(() => window.innerWidth <= 680);
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => initialNodes(compact));
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [selectedId, setSelectedId] = useState("proc-002");
  const [showJson, setShowJson] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const issues = useMemo(() => {
    const next: string[] = [];
    for (const node of nodes) {
      if (node.kind !== "material" && !node.tool.trim()) {
        next.push(`${node.id}: tool assignment is required before export.`);
      }
      if (!node.label.trim()) {
        next.push(`${node.id}: display label cannot be empty.`);
      }
    }
    for (const edge of edges) {
      if (!nodes.some((node) => node.id === edge.source)) {
        next.push(`${edge.id}: missing source node ${edge.source}.`);
      }
      if (!nodes.some((node) => node.id === edge.target)) {
        next.push(`${edge.id}: missing target node ${edge.target}.`);
      }
    }
    return next;
  }, [edges, nodes]);

  const updateNode = (id: string, patch: Partial<WorkflowNode>) => {
    setNodes((current) =>
      current.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    );
  };

  const addNode = (kind: NodeKind) => {
    const id = nextId(nodes, kind);
    const offset = nodes.length * 24;
    const node: WorkflowNode = {
      id,
      kind,
      label: `New ${KIND_LABELS[kind].toLowerCase()}`,
      x: 180 + (offset % 420),
      y: 330 + (offset % 130),
      locked: false,
      method: kind === "material" ? "CATALOG-ID" : "METHOD-ID",
      duration: kind === "material" ? 0 : 10,
      tool: kind === "material" ? "material-catalog" : "",
    };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  };

  const resetGraph = () => {
    setNodes(initialNodes(compact));
    setEdges(INITIAL_EDGES);
    setSelectedId("proc-002");
  };

  const deleteSelected = () => {
    if (!selected || selected.locked) return;
    setNodes((current) => current.filter((node) => node.id !== selected.id));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selected.id && edge.target !== selected.id),
    );
    setSelectedId("");
  };

  const onPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    node: WorkflowNode,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: node.id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(node.id);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const nodeWidth = compact ? 150 : 178;
    const x = Math.max(
      8,
      Math.min(bounds.width - nodeWidth - 10, event.clientX - bounds.left - drag.offsetX),
    );
    const y = Math.max(78, Math.min(bounds.height - 160, event.clientY - bounds.top - drag.offsetY));
    updateNode(drag.id, { x, y });
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const nodeById = (id: string) => nodes.find((node) => node.id === id);
  const json = JSON.stringify(stableWorkflow(nodes, edges), null, 2);

  const nodeWidth = compact ? 150 : 178;

  return (
    <div className={`app ${compact ? "compact" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">FL</span>
          <div>
            <strong>FLOWLINE</strong>
            <small>Manufacturing orchestration</small>
          </div>
        </div>
        <div className="project-name">Workflow / Laser Bonding / Rev 18</div>
        <div className="top-status">
          <span className="status-dot"></span>
          Autosaved locally
        </div>
      </header>

      <div className="demo-note">
        <span>
          Independent coded concept. No Atomic Machines product, code, or confidential material was used.
        </span>
        <a href="../../proposal/atomic-trial/">View $300 trial scope &rarr;</a>
      </div>

      <main className="workspace">
        <aside className="sidebar">
          <div className="panel-heading">
            <span>Node library</span>
            <span>03</span>
          </div>
          <div className="tool-list">
            {TOOLS.map((tool) => (
              <button
                className="tool"
                data-kind={tool.kind}
                key={tool.kind}
                onClick={() => addNode(tool.kind)}
                type="button"
              >
                <span className="tool-icon">{tool.code}</span>
                <span>
                  <strong>{tool.title}</strong>
                  <small>{tool.note}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-section">
            <h3>Active schema</h3>
            <div className="schema-card">
              <strong>workflow.v1.4.0</strong>
              <span>Strict export contract</span>
            </div>
          </div>
          <div className="sidebar-section">
            <h3>Interaction notes</h3>
            <div className="schema-card">
              <strong>Drag + inspect</strong>
              <span>Add nodes, edit properties, fix validation, export JSON.</span>
            </div>
          </div>
        </aside>

        <section
          className="canvas-shell"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          ref={canvasRef}
        >
          <div className="canvas-toolbar">
            <button className="primary" onClick={() => addNode("process")} type="button">
              + Process
            </button>
            <button onClick={() => setShowJson(true)} type="button">
              Export JSON
            </button>
            <button onClick={resetGraph} type="button">
              Reset
            </button>
          </div>

          <div className="canvas-metrics">
            <div className="metric">
              <strong>{nodes.length}</strong>
              <span>Nodes</span>
            </div>
            <div className="metric">
              <strong>{edges.length}</strong>
              <span>Edges</span>
            </div>
            <div className="metric">
              <strong>{issues.length === 0 ? "PASS" : issues.length}</strong>
              <span>Validation</span>
            </div>
          </div>

          <svg className="graph-layer" aria-hidden="true">
            <defs>
              <marker
                id="arrow"
                markerHeight="7"
                markerWidth="7"
                orient="auto-start-reverse"
                refX="6"
                refY="3.5"
                viewBox="0 0 7 7"
              >
                <path className="edge-arrow" d="M0 0 L7 3.5 L0 7 z"></path>
              </marker>
            </defs>
            {edges.map((edge) => {
              const source = nodeById(edge.source);
              const target = nodeById(edge.target);
              if (!source || !target) return null;
              const x1 = source.x + nodeWidth;
              const y1 = source.y + 71;
              const x2 = target.x;
              const y2 = target.y + 71;
              const curve = Math.max(70, (x2 - x1) * 0.55);
              return (
                <path
                  className="edge"
                  d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
                  key={edge.id}
                  markerEnd="url(#arrow)"
                />
              );
            })}
          </svg>

          {nodes.map((node) => (
            <div
              className={`node ${node.id === selectedId ? "selected" : ""} ${
                node.locked ? "locked" : ""
              }`}
              data-kind={node.kind}
              key={node.id}
              onPointerDown={(event) => onPointerDown(event, node)}
              style={{ left: node.x, top: node.y }}
            >
              <span className="port port-in"></span>
              <span className="port port-out"></span>
              <div className="node-head">
                <span>{KIND_LABELS[node.kind]}</span>
                <span>{node.id}</span>
              </div>
              <div className="node-body">
                <strong>{node.label}</strong>
                <div className="node-meta">
                  <span>
                    <b>Method</b>
                    {node.method}
                  </span>
                  <span>
                    <b>Duration</b>
                    {node.duration ? `${node.duration} sec` : "input"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="canvas-footer">
            <span>Drag nodes to update layout &middot; select to inspect</span>
            <span>Viewport 100% &middot; snap 24 px</span>
          </div>
        </section>

        <aside className="inspector">
          <div className="panel-heading">
            <span>Properties</span>
            <span>{selected?.id ?? "none"}</span>
          </div>
          <div className="inspector-content">
            {selected ? (
              <>
                <div className="field">
                  <label htmlFor="node-id">Stable ID</label>
                  <input disabled id="node-id" value={selected.id} />
                </div>
                <div className="field">
                  <label htmlFor="node-label">Display label</label>
                  <input
                    id="node-label"
                    onChange={(event) => updateNode(selected.id, { label: event.target.value })}
                    value={selected.label}
                  />
                </div>
                <div className="field">
                  <label htmlFor="node-kind">Node type</label>
                  <select
                    id="node-kind"
                    onChange={(event) =>
                      updateNode(selected.id, { kind: event.target.value as NodeKind })
                    }
                    value={selected.kind}
                  >
                    <option value="material">Material</option>
                    <option value="process">Process</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="node-method">Method / catalog ID</label>
                  <input
                    id="node-method"
                    onChange={(event) => updateNode(selected.id, { method: event.target.value })}
                    value={selected.method}
                  />
                </div>
                <div className="field">
                  <label htmlFor="node-tool">Tool assignment</label>
                  <input
                    id="node-tool"
                    onChange={(event) => updateNode(selected.id, { tool: event.target.value })}
                    placeholder="Required for export"
                    value={selected.tool}
                  />
                </div>
                <div className="field">
                  <label htmlFor="node-duration">Duration in seconds</label>
                  <input
                    id="node-duration"
                    min="0"
                    onChange={(event) =>
                      updateNode(selected.id, { duration: Number(event.target.value) || 0 })
                    }
                    type="number"
                    value={selected.duration}
                  />
                </div>
                <div className="inspector-actions">
                  <button
                    onClick={() => updateNode(selected.id, { locked: !selected.locked })}
                    type="button"
                  >
                    {selected.locked ? "Unlock" : "Lock ID"}
                  </button>
                  <button disabled={selected.locked} onClick={deleteSelected} type="button">
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                Select a node on the canvas to inspect its stable identity and schema-bound properties.
              </div>
            )}

            <section className="validation">
              <div className="validation-title">
                <span>Schema validation</span>
                <span className={`validation-count ${issues.length === 0 ? "valid" : ""}`}>
                  {issues.length === 0 ? "PASS" : `${issues.length} ISSUE`}
                </span>
              </div>
              <div className="validation-list">
                {issues.length === 0 ? (
                  <div className="validation-item valid">
                    Export matches workflow.v1.4.0 and all referenced nodes resolve.
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div className="validation-item" key={issue}>
                      {issue}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </aside>
      </main>

      {showJson ? (
        <div className="json-modal" onClick={() => setShowJson(false)} role="presentation">
          <div
            aria-label="Deterministic JSON export"
            aria-modal="true"
            className="json-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="json-head">
              <strong>Deterministic JSON export</strong>
              <button onClick={() => setShowJson(false)} type="button">
                Close
              </button>
            </div>
            <pre>{json}</pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
