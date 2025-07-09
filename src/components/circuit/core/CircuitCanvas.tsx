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
import solveCircuit from "./KirchoffSolver";
import { json } from "stream/consumers";
import PropertiesPanel from "./PropertiesPanel";
import CircuitPalette from "./CircuitPalette";
import GetCircuitOutput from "@/utils/GetCircuitOutput";

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
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [creatingWireJoints, setCreatingWireJoints] = useState<{ x: number; y: number }[]>([]);

  const [selectedElement, setSelectedElement] = useState<CircuitElement | null>(
    null
  );

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
      if (e.key === "Escape" && e.shiftKey) {
        e.preventDefault(); // Prevent default behavior (e.g. exiting fullscreen)
        resetState();
      }
      if (e.key === "Delete") {
        e.preventDefault(); // Prevent default delete behavior
        if (selectedElement) {
          const updatedElements = elements.filter(
            (el) => el.id !== selectedElement.id
          );
          setElements(updatedElements);

          // Remove any wires connected to this element
          const updatedWires = wires.filter(
            (wire) =>
              getNodeParent(wire.fromNodeId)?.id !== selectedElement.id &&
              getNodeParent(wire.toNodeId)?.id !== selectedElement.id
          );
          setWires(updatedWires);
          computeCircuit(updatedWires); // Recompute circuit after deletion

          setSelectedElement(null);
          setCreatingWireStartNode(null);
          setEditingWire(null);
        }
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

  // function handleStageClick(e: KonvaEventObject<MouseEvent>) {
  //   if (editingWire) {
  //     const updated = wires.filter((w) => w.id !== editingWire.wireId);
  //     setWires(updated);
  //     computeCircuit(updated); // 👈 Update light status after wire deletion
  //     setEditingWire(null);
  //   }

  //   if (creatingWireStartNode) {
  //     setCreatingWireStartNode(null);
  //   }
  // }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (editingWire) {
      const updated = wires.filter((w) => w.id !== editingWire.wireId);
      setWires(updated);
      computeCircuit(updated);
      setEditingWire(null);
      return;
    }

    // If wire drawing is active, add intermediate joint
    if (creatingWireStartNode) {
      setCreatingWireJoints((prev) => [...prev, pos]);
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

  // function handleWireClick(
  //   e: KonvaEventObject<MouseEvent>,
  //   wireId: string,
  //   fromNode: Node,
  //   toNode: Node
  // ) {
  //   const clickPos = e.target.getStage()?.getPointerPosition();
  //   if (!clickPos) return;

  //   const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  //     Math.hypot(p1.x - p2.x, p1.y - p2.y);

  //   const clickedEnd =
  //     dist(clickPos, { x: fromNode.x, y: fromNode.y }) <
  //       dist(clickPos, { x: toNode.x, y: toNode.y })
  //       ? "from"
  //       : "to";

  //   setEditingWire({ wireId, end: clickedEnd });
  //   setCreatingWireStartNode(null); // cancel any wire creation
  // }

  function handleWireClick(e: KonvaEventObject<MouseEvent>, wireId: string) {
    setSelectedWireId(wireId);
  }



  // function getWirePoints(wire: Wire): [number, number, number, number] | null {
  //   const fromNode = getNodeById(wire.fromNodeId);
  //   const toNode = getNodeById(wire.toNodeId);
  //   if (!fromNode || !toNode) return null;

  //   const getAbsolutePos = (node: Node) => {
  //     const parent = getNodeParent(node.id);
  //     return {
  //       x: node.x + (parent?.x ?? 0),
  //       y: node.y + (parent?.y ?? 0),
  //     };
  //   };

  //   const isEditingFrom =
  //     editingWire?.wireId === wire.id && editingWire.end === "from";
  //   const isEditingTo =
  //     editingWire?.wireId === wire.id && editingWire.end === "to";

  //   const start = isEditingFrom ? mousePos : getAbsolutePos(fromNode);
  //   const end = isEditingTo ? mousePos : getAbsolutePos(toNode);

  //   return [start.x, start.y, end.x, end.y];
  // }


  // function getWirePoints(wire: Wire): number[] | null {
  //   const fromNode = getNodeById(wire.fromNodeId);
  //   const toNode = getNodeById(wire.toNodeId);
  //   if (!fromNode || !toNode) return null;

  //   const getAbsolutePos = (node: Node) => {
  //     const parent = getNodeParent(node.id);
  //     return {
  //       x: node.x + (parent?.x ?? 0),
  //       y: node.y + (parent?.y ?? 0),
  //     };
  //   };

  //   const fromPos = getAbsolutePos(fromNode);
  //   const toPos = getAbsolutePos(toNode);
  //   const midPoints = wire.points || [];

  //   const points: number[] = [
  //     fromPos.x,
  //     fromPos.y,
  //     ...midPoints.flatMap((p) => [p.x, p.y]),
  //     toPos.x,
  //     toPos.y,
  //   ];

  //   return points;
  // }

  function getWirePoints(wire: Wire): number[] {
    const fromNode = getNodeById(wire.fromNodeId);
    const toNode = getNodeById(wire.toNodeId);
    if (!fromNode || !toNode) return [];

    const fromParent = getNodeParent(fromNode.id);
    const toParent = getNodeParent(toNode.id);

    const start = {
      x: fromNode.x + (fromParent?.x ?? 0),
      y: fromNode.y + (fromParent?.y ?? 0),
    };

    const end = {
      x: toNode.x + (toParent?.x ?? 0),
      y: toNode.y + (toParent?.y ?? 0),
    };

    // Include joints between start and end
    const jointPoints = wire.joints.flatMap((pt) => [pt.x, pt.y]);

    return [start.x, start.y, ...jointPoints, end.x, end.y];
  }





  // function handleNodeClick(nodeId: string) {
  //   if (editingWire) {
  //     // Finish editing wire
  //     setWires((prev) =>
  //       prev.map((wire) =>
  //         wire.id === editingWire.wireId
  //           ? { ...wire, [editingWire.end]: nodeId }
  //           : wire
  //       )
  //     );
  //     setEditingWire(null);
  //   } else if (creatingWireStartNode === null) {
  //     // Start new wire
  //     setCreatingWireStartNode(nodeId);
  //   } else if (creatingWireStartNode === nodeId) {
  //     // Cancel new wire
  //     setCreatingWireStartNode(null);
  //   } else {
  //     // Complete new wire
  //     const newWire: Wire = {
  //       id: `wire-${wireCounter}`,
  //       fromNodeId: creatingWireStartNode,
  //       toNodeId: nodeId,
  //       joints: [],
  //     };

  //     const updatedWires = [...wires, newWire];

  //     setWires(updatedWires);
  //     setWireCounter((c) => c + 1);
  //     computeCircuit(updatedWires);
  //     setCreatingWireStartNode(null);
  //   }
  // }

  function handleNodeClick(nodeId: string) {
    if (editingWire) {
      setWires((prev) =>
        prev.map((wire) =>
          wire.id === editingWire.wireId
            ? { ...wire, [editingWire.end]: nodeId }
            : wire
        )
      );
      setEditingWire(null);
      return;
    }

    if (!creatingWireStartNode) {
      setCreatingWireStartNode(nodeId);
      setCreatingWireJoints([]);
    } else if (creatingWireStartNode === nodeId) {
      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);
    } else {
      const newWire: Wire = {
        id: `wire-${wireCounter}`,
        fromNodeId: creatingWireStartNode,
        toNodeId: nodeId,
        joints: creatingWireJoints,
      };

      const updatedWires = [...wires, newWire];
      setWires(updatedWires);
      setWireCounter((c) => c + 1);
      computeCircuit(updatedWires);

      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);
    }
  }



  function computeCircuit(wiresSnapshot: Wire[]) {
    setElements((prevElements) => solveCircuit(prevElements, wiresSnapshot));
  }

  // handle resistance change for potentiometer
  function handleResistanceChange(elementId: string, resistance: number) {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? {
            ...el,
            properties: { ...el.properties, resistance },
          }
          : el
      )
    );
    computeCircuit(wires);
  }

  function handleModeChange(elementId: string, mode: "voltage" | "current") {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? {
            ...el,
            properties: { ...el.properties, mode },
          }
          : el
      )
    );
    computeCircuit(wires);
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

  const getWireColor = (wire: Wire): string => {
    const fromPolarity = getNodeById(wire.fromNodeId)?.polarity;
    const toPolarity = getNodeById(wire.toNodeId)?.polarity;

    if (fromPolarity === "negative" && toPolarity === "negative") return "red";
    if (fromPolarity === "positive" && toPolarity === "positive") return "green";
    return "black";
  };


  return (
    <div
      className="flex flex-row items-center justify-between h-screen w-screen relative"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Debug Box Panel */}
      <div
        className={`transition-all duration-300 h-full bg-white border-r border-gray-200 shadow-md overflow-auto ${showDebugBox ? "w-[25%]" : "w-10"
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
            data={{ mousePos, selectedElement, editingWire, elements, wires }}
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
                // <Line
                //   key={wire.id}
                //   points={points}
                //   stroke={
                //     getNodeById(wire.fromNodeId)?.polarity === "negative" &&
                //       getNodeById(wire.toNodeId)?.polarity === "negative"
                //       ? "red"
                //       : getNodeById(wire.fromNodeId)?.polarity === "positive" &&
                //         getNodeById(wire.toNodeId)?.polarity === "positive"
                //         ? "green"
                //         : "black"
                //   }
                //   strokeWidth={3}
                //   hitStrokeWidth={15}
                //   onClick={(e) => {
                //     const from = getNodeById(wire.fromNodeId)!;
                //     const to = getNodeById(wire.toNodeId)!;
                //     handleWireClick(e, wire.id, from, to);
                //   }}
                // />
                <React.Fragment key={wire.id}>
                  <Line
                    points={getWirePoints(wire)}
                    stroke={
                      selectedElement?.id === wire.id
                        ? "orange"
                        : getWireColor(wire)
                    }
                    strokeWidth={selectedElement?.id === wire.id ? 6 : 4}
                    hitStrokeWidth={12}
                    tension={2}
                    lineCap="round"
                    lineJoin="round"
                    bezier={true}
                    onClick={(e) => {
                      setSelectedElement({
                        id: wire.id,
                        type: "wire",
                        x: 0,
                        y: 0,
                        nodes: [],
                      });
                    }}
                  />



                  {/* 🔥 REMOVE the joint rendering after drawing */}
                  {/* (Do NOT render joints for existing wires anymore) */}
                </React.Fragment>



              );
            })}

            {/* Wire being created */}
            {creatingWireStartNode &&
              (() => {
                const startNode = getNodeById(creatingWireStartNode);
                if (!startNode) return null;

                const startPos = {
                  x: startNode.x + (getNodeParent(startNode.id)?.x ?? 0),
                  y: startNode.y + (getNodeParent(startNode.id)?.y ?? 0),
                };

                const inProgressPoints: number[] = [
                  startPos.x,
                  startPos.y,
                  ...creatingWireJoints.flatMap((p) => [p.x, p.y]),
                  mousePos.x,
                  mousePos.y,
                ];

                return (
                  <Line
                    points={inProgressPoints}
                    stroke="black"
                    strokeWidth={2}
                    dash={[10, 5]}
                    pointerEvents="none"
                    lineCap="round"
                    lineJoin="round"
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
                handleResistanceChange={handleResistanceChange}
                handleModeChange={handleModeChange}
                onSelect={(id) => {
                  // Only set selectedElement if it's not already selected
                  if (selectedElement?.id !== id) {
                    setSelectedElement(getElementById(id) ?? null);
                  }
                }}
                selectedElementId={selectedElement?.id || null}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Palette Panel */}
      <div
        className={`transition-all duration-300 h-full bg-white border-l border-black-200 shadow-md overflow-auto ${showPalette ? "w-[25%]" : "w-10"
          }`}
      >
        <button
          className="absolute right-2 top-2 z-10 bg-blue-100 text-sky-800 text-sm px-2 py-1 rounded hover:bg-yellow-200"
          onClick={() => setShowPalette((prev) => !prev)}
        >
          {showPalette ? "⇢" : "⇠"}
        </button>
        {showPalette && <CircuitPalette />}
        {showPalette && selectedElement && (
          <PropertiesPanel
            selectedElement={selectedElement}
            wires={wires}
            getNodeById={getNodeById}
            onElementEdit={(updatedElement, deleteElement) => {
              if (deleteElement) {
                const updatedWires = wires.filter(
                  (wire) =>
                    getNodeParent(wire.fromNodeId)?.id !== updatedElement.id &&
                    getNodeParent(wire.toNodeId)?.id !== updatedElement.id
                );

                setWires(updatedWires);
                setElements((prev) => prev.filter((el) => el.id !== updatedElement.id));
                setSelectedElement(null);
                setCreatingWireStartNode(null);
                setEditingWire(null);
                computeCircuit(updatedWires);
              } else {
                setElements((prev) =>
                  prev.map((el) =>
                    el.id === updatedElement.id
                      ? {
                        ...el,
                        ...updatedElement,
                        x: el.x,
                        y: el.y,
                      }
                      : el
                  )
                );

                computeCircuit(wires);
                setSelectedElement(updatedElement);
                setCreatingWireStartNode(null);
                setEditingWire(null);
              }
            }}
            onWireEdit={(updatedWire, deleteElement) => {
              if (deleteElement) {
                setWires((prev) => prev.filter((w) => w.id !== updatedWire.id));
                setSelectedElement(null);
                setCreatingWireStartNode(null);
                setEditingWire(null);
                computeCircuit(wires.filter((w) => w.id !== updatedWire.id));
              } else {
                setWires((prev) =>
                  prev.map((w) => (w.id === updatedWire.id ? { ...w, ...updatedWire } : w))
                );
                computeCircuit(wires);
              }
            }}
            onEditWireSelect={(wire) => {
              setSelectedElement({
                id: wire.id,
                type: "wire",
                x: 0,
                y: 0,
                nodes: [],
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
