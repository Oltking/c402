"use client";
import { ReactFlow, Background, BackgroundVariant, Handle, Position, type Node, type Edge } from "@xyflow/react";

type NodeData = { title: string; sub: string; accent: string };

function FlowNode({ data }: { data: NodeData }) {
  return (
    <div className="border border-line bg-panel px-3 py-2" style={{ boxShadow: "0 1px 2px rgba(10,11,13,0.06)", borderTop: `2px solid ${data.accent}` }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0, width: 1, height: 1 }} />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: data.accent }} />
        <span className="text-[12px] font-semibold text-text">{data.title}</span>
      </div>
      <div className="mt-0.5 text-[10.5px] text-faint">{data.sub}</div>
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}

const nodeTypes = { xcat: FlowNode };

const nodes: Node[] = [
  { id: "market", type: "xcat", position: { x: 0, y: 60 }, data: { title: "Market Agent", sub: "reads Uniswap price", accent: "#5b8cff" } },
  { id: "cde", type: "xcat", position: { x: 210, y: 0 }, data: { title: "CDE API · x402", sub: "pay-per-decision", accent: "#7c5cff" } },
  { id: "bus", type: "xcat", position: { x: 210, y: 120 }, data: { title: "EventBus", sub: "encrypted handle", accent: "#22d3ee" } },
  { id: "treasury", type: "xcat", position: { x: 430, y: 60 }, data: { title: "Treasury Agent", sub: "ACL-gated decrypt", accent: "#7c5cff" } },
  { id: "exec", type: "xcat", position: { x: 650, y: 60 }, data: { title: "Safe + Uniswap", sub: "execute swap", accent: "#34d399" } },
];

function edges(active: boolean): Edge[] {
  const base = { animated: active, style: { stroke: "#c3c7cf", strokeWidth: 1.5 } };
  return [
    { id: "e1", source: "market", target: "cde", label: "USDC", ...base },
    { id: "e2", source: "cde", target: "bus", label: "decision", ...base },
    { id: "e3", source: "bus", target: "treasury", label: "🔒 event", ...base },
    { id: "e4", source: "treasury", target: "exec", label: "swap", ...base },
  ].map((e) => ({ ...e, labelStyle: { fill: "#4b5058", fontSize: 10 }, labelBgStyle: { fill: "#ffffff" } }));
}

export function EventFlow({ active }: { active: boolean }) {
  return (
    <div style={{ height: 230 }} className="mt-1 overflow-hidden border border-line-soft bg-panel-2">
      <ReactFlow
        nodes={nodes}
        edges={edges(active)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d7dae0" />
      </ReactFlow>
    </div>
  );
}
