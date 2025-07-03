"use client";
import React, { useState, useEffect } from "react";
import { Stage, Layer, Circle, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

interface Node {
  id: string;
  x: number;
  y: number;
  radius: number;
  fill: string;
}

interface Wire {
  id: string;
  from: string;
  to: string;
}

interface EditingWire {
  wireId: string;
  end: "from" | "to";
}

function App() {
  const NODE_RADIUS = 25;
  const [nodes, setNodes] = useState<Node[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [creatingWireStartNode, setCreatingWireStartNode] = useState<
    string | null
  >(null);
  const [editingWire, setEditingWire] = useState<EditingWire | null>(null);

  useEffect(() => {
    const generatedNodes: Node[] = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      generatedNodes.push({
        id: `node-${i}`,
        x: 150 + i * 120,
        y: window.innerHeight / 2,
        radius: NODE_RADIUS,
        fill: "#3498db",
      });
    }
    setNodes(generatedNodes);
  }, []);

  function getNodeById(id: string) {
    return nodes.find((n) => n.id === id);
  }

  function handleStageMouseMove(e: KonvaEventObject<PointerEvent>) {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) setMousePos(pos);
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    // If editing a wire and clicked not on a node, delete the wire
    if (editingWire) {
      setWires((prev) => prev.filter((w) => w.id !== editingWire.wireId));
      setEditingWire(null);
    }
  }

  function handleNodeClick(nodeId: string) {
    if (editingWire) {
      // Finish editing wire
      setWires((prev) =>
        prev.map((wire) =>
          wire.id === editingWire.wireId
            ? { ...wire, [editingWire.end]: nodeId }
            : wire
        )
      );
      setEditingWire(null);
    } else if (creatingWireStartNode === null) {
      // Start new wire
      setCreatingWireStartNode(nodeId);
    } else if (creatingWireStartNode === nodeId) {
      // Cancel new wire
      setCreatingWireStartNode(null);
    } else {
      // Complete new wire
      const newWire: Wire = {
        id: `wire-${wireCounter}`,
        from: creatingWireStartNode,
        to: nodeId,
      };
      setWires((prev) => [...prev, newWire]);
      setWireCounter((c) => c + 1);
      setCreatingWireStartNode(null);
    }
  }

  function handleNodeDragMove(e: KonvaEventObject<DragEvent>) {
    const id = e.target.id();
    const x = e.target.x();
    const y = e.target.y();

    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x, y } : node))
    );
  }

  function handleWireClick(
    e: KonvaEventObject<MouseEvent>,
    wireId: string,
    fromNode: { x: number; y: number },
    toNode: { x: number; y: number }
  ) {
    const clickPos = e.target.getStage()?.getPointerPosition();
    if (!clickPos) return;

    const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
      Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const clickedEnd =
      dist(clickPos, fromNode) < dist(clickPos, toNode) ? "from" : "to";

    setEditingWire({ wireId, end: clickedEnd });
    setCreatingWireStartNode(null); // cancel any wire creation
  }

  function getWirePoints(wire: Wire): [number, number, number, number] | null {
    const fromNode = getNodeById(wire.from);
    const toNode = getNodeById(wire.to);
    if (!fromNode || !toNode) return null;

    const isEditingFrom =
      editingWire?.wireId === wire.id && editingWire.end === "from";
    const isEditingTo =
      editingWire?.wireId === wire.id && editingWire.end === "to";

    const start = isEditingFrom ? mousePos : fromNode;
    const end = isEditingTo ? mousePos : toNode;

    return [start.x, start.y, end.x, end.y];
  }

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseMove={handleStageMouseMove}
      onClick={handleStageClick}
      style={{ backgroundColor: "#f0f0f0" }}
    >
      <Layer>
        {/* Render all wires */}
        {wires.map((wire) => {
          const points = getWirePoints(wire);
          if (!points) return null;

          return (
            <Line
              key={wire.id}
              points={points}
              stroke="#2c3e50"
              strokeWidth={3}
              hitStrokeWidth={15}
              onClick={(e) => {
                const from = getNodeById(wire.from)!;
                const to = getNodeById(wire.to)!;
                handleWireClick(e, wire.id, from, to);
              }}
            />
          );
        })}

        {/* Render wire currently being created */}
        {creatingWireStartNode &&
          (() => {
            const startNode = getNodeById(creatingWireStartNode);
            if (!startNode) return null;
            return (
              <Line
                points={[startNode.x, startNode.y, mousePos.x, mousePos.y]}
                stroke="#e74c3c"
                strokeWidth={3}
                dash={[10, 5]}
                pointerEvents="none"
              />
            );
          })()}

        {/* Render nodes */}
        {nodes.map((node) => (
          <Circle
            key={node.id}
            id={node.id}
            x={node.x}
            y={node.y}
            radius={node.radius}
            fill={node.fill}
            shadowBlur={5}
            draggable
            onDragMove={handleNodeDragMove}
            onClick={(e) => {
              e.cancelBubble = true;
              handleNodeClick(node.id);
            }}
            style={{ cursor: "pointer" }}
          />
        ))}
      </Layer>
    </Stage>
  );
}

export default App;
