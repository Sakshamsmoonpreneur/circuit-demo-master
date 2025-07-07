"use client";
import React, { useState, useEffect } from "react";
import { Stage, Layer, Circle, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  CircuitElement,
  EditingWire,
  Wire,
  Node,
} from "@/common/types/circuit";
import RenderElement from "./RenderElement";
import { DebugBox } from "@/components/debug/DebugBox";
import createElement from "./createElement"; // Adjust the import path as necessary
import solveCircuit from "./CircuitSolver";
import { json } from "stream/consumers";
import Palette from "../elements/Palette";

export default function CircuitCanvas() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(true);

  const [creatingWireStartNode, setCreatingWireStartNode] = useState<
    string | null
  >(null);
  const [editingWire, setEditingWire] = useState<EditingWire | null>(null);

  function resetState() {
    setElements([]);
    setWires([]);
    setWireCounter(0);
    setCreatingWireStartNode(null);
    setEditingWire(null);
  }

  useEffect(() => {
    resetState();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // reset the circuit
      if (e.key === "Escape") {
        resetState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mousePos, elements]);

  function getNodeById(nodeId: string) {
    return elements.flatMap((e) => e.nodes).find((n) => n.id === nodeId);
  }

  function getElementById(elementId: string) {
    return elements.find((e) => e.id === elementId);
  }

  function getNodeParent(nodeId: string) {
    const node = elements.flatMap((e) => e.nodes).find((n) => n.id === nodeId);
    return node ? getElementById(node.parentId) : null;
  }

  function handleStageMouseMove(e: KonvaEventObject<PointerEvent>) {
    const pos = e.target.getStage()?.getPointerPosition();
    if (pos) setMousePos(pos);
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    if (editingWire) {
      const updated = wires.filter((w) => w.id !== editingWire.wireId);
      setWires(updated);
      computeCircuit(updated); // 👈 Update light status after wire deletion
      setEditingWire(null);
    }

    if (creatingWireStartNode) {
      setCreatingWireStartNode(null);
    }
  }

  function handleElementDragMove(e: KonvaEventObject<DragEvent>) {
    const id = e.target.id();
    const x = e.target.x();
    const y = e.target.y();

    setElements((prev) =>
      prev.map((element) =>
        element.id === id ? { ...element, x, y } : element
      )
    );
  }

  function handleWireClick(
    e: KonvaEventObject<MouseEvent>,
    wireId: string,
    fromNode: Node,
    toNode: Node
  ) {
    const clickPos = e.target.getStage()?.getPointerPosition();
    if (!clickPos) return;

    const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
      Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const clickedEnd =
      dist(clickPos, { x: fromNode.x, y: fromNode.y }) <
      dist(clickPos, { x: toNode.x, y: toNode.y })
        ? "from"
        : "to";

    setEditingWire({ wireId, end: clickedEnd });
    setCreatingWireStartNode(null); // cancel any wire creation
  }

  function getWirePoints(wire: Wire): [number, number, number, number] | null {
    const fromNode = getNodeById(wire.fromNodeId);
    const toNode = getNodeById(wire.toNodeId);
    if (!fromNode || !toNode) return null;

    const getAbsolutePos = (node: Node) => {
      const parent = getNodeParent(node.id);
      return {
        x: node.x + (parent?.x ?? 0),
        y: node.y + (parent?.y ?? 0),
      };
    };

    const isEditingFrom =
      editingWire?.wireId === wire.id && editingWire.end === "from";
    const isEditingTo =
      editingWire?.wireId === wire.id && editingWire.end === "to";

    const start = isEditingFrom ? mousePos : getAbsolutePos(fromNode);
    const end = isEditingTo ? mousePos : getAbsolutePos(toNode);

    return [start.x, start.y, end.x, end.y];
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
        fromNodeId: creatingWireStartNode,
        toNodeId: nodeId,
      };

      const updatedWires = [...wires, newWire];

      setWires(updatedWires);
      setWireCounter((c) => c + 1);
      computeCircuit(updatedWires);
      setCreatingWireStartNode(null);
    }
  }

  function computeCircuit(wiresSnapshot: Wire[]) {
    setElements((prevElements) => solveCircuit(prevElements, wiresSnapshot));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();

    const elementData = e.dataTransfer.getData("application/element-type");
    if (!elementData) return;

    const element = JSON.parse(elementData);

    const stageX = e.clientX;
    const stageY = e.clientY;

    const canvasOffset = document
      .getElementById("canvas-stage") // optional: give your Stage a container ID
      ?.getBoundingClientRect();

    const canvasX = stageX - (canvasOffset?.left ?? 0);
    const canvasY = stageY - (canvasOffset?.top ?? 0);

    const newElement = createElement({
      type: element.type,
      idNumber: elements.length + 1,
      pos: { x: canvasX, y: canvasY },
      properties: element.defaultProps,
    });

    if (!newElement) return;
    setElements((prev) => [...prev, newElement]);
  }

  return (
    <div
      className="flex flex-row items-center justify-between h-screen w-screen relative"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Debug Box Panel */}
      <div
        className={`transition-all duration-300 h-full bg-white border-r border-gray-200 shadow-md overflow-auto ${
          showDebugBox ? "w-[25%]" : "w-10"
        }`}
      >
        <button
          className="absolute left-2 top-2 z-10 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded hover:bg-yellow-200"
          onClick={() => setShowDebugBox((prev) => !prev)}
        >
          {showDebugBox ? "⇠" : "⇢"}
        </button>
        {showDebugBox && (
          <DebugBox
            data={{ mousePos, elements, wires }}
            className="w-full h-full p-4"
          />
        )}
      </div>

      {/* Canvas */}
      <div className="flex-grow h-full">
        <Stage
          id="canvas-stage"
          width={window.innerWidth * 0.5}
          height={window.innerHeight}
          onMouseMove={handleStageMouseMove}
          onClick={handleStageClick}
        >
          <Layer>
            {/* Render wires */}
            {wires.map((wire) => {
              const points = getWirePoints(wire);
              if (!points) return null;

              return (
                <Line
                  key={wire.id}
                  points={points}
                  stroke={
                    getNodeById(wire.fromNodeId)?.fill === "red" &&
                    getNodeById(wire.toNodeId)?.fill === "red"
                      ? "red"
                      : getNodeById(wire.fromNodeId)?.fill === "green" &&
                        getNodeById(wire.toNodeId)?.fill === "green"
                      ? "green"
                      : "black"
                  }
                  strokeWidth={3}
                  hitStrokeWidth={15}
                  onClick={(e) => {
                    const from = getNodeById(wire.fromNodeId)!;
                    const to = getNodeById(wire.toNodeId)!;
                    handleWireClick(e, wire.id, from, to);
                  }}
                />
              );
            })}

            {/* Wire being created */}
            {creatingWireStartNode &&
              (() => {
                const startNode = getNodeById(creatingWireStartNode);
                if (!startNode) return null;
                const startNodeX =
                  startNode.x + (getNodeParent(startNode.id)?.x ?? 0);
                const startNodeY =
                  startNode.y + (getNodeParent(startNode.id)?.y ?? 0);

                return (
                  <Line
                    points={[startNodeX, startNodeY, mousePos.x, mousePos.y]}
                    stroke="black"
                    strokeWidth={2}
                    dash={[10, 5]}
                    pointerEvents="none"
                  />
                );
              })()}

            {/* Circuit Elements */}
            {elements.map((element) => (
              <RenderElement
                key={element.id}
                element={element}
                onDragMove={handleElementDragMove}
                handleNodeClick={handleNodeClick}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Palette Panel */}
      <div
        className={`transition-all duration-300 h-full bg-black border-l border-black-200 shadow-md overflow-auto ${
          showPalette ? "w-[25%]" : "w-10"
        }`}
      >
        <button
          className="absolute right-2 top-2 z-10 bg-blue-100 text-sky-800 text-sm px-2 py-1 rounded hover:bg-yellow-200"
          onClick={() => setShowPalette((prev) => !prev)}
        >
          {showPalette ? "⇢" : "⇠"}
        </button>
        {showPalette && <Palette />}
      </div>
    </div>
  );
}
