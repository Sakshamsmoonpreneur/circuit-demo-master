"use client";
import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  CircuitElement,
  EditingWire,
  Wire
} from "@/common/types/circuit";
import RenderElement from "./RenderElement";
import { DebugBox } from "@/components/debug/DebugBox";
import createElement from "./createElement";
import solveCircuit from "./KirchoffSolver";
import PropertiesPanel from "./PropertiesPanel";
import CircuitPalette from "./CircuitPalette";
import { getCircuitById } from "./CircuitSaver";
import CircuitManager from "./CircuitManager";
import Konva from "konva";

export default function CircuitCanvas() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const stageRef = useRef<Konva.Stage | null>(null);
  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(true);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [creatingWireJoints, setCreatingWireJoints] = useState<
    { x: number; y: number }[]
  >([]);

  const [simulationRunning, setSimulationRunning] = useState(false);

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
      if (e.key === "Escape") {
        e.preventDefault(); // Prevent default behavior (e.g. exiting fullscreen)
        setCreatingWireStartNode(null);
        setEditingWire(null);
      }
      // if ctrl + L is pressed
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault(); // Prevent default behavior
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
          //computeCircuit(updatedWires); // Recompute circuit after deletion
          stopSimulation();

          setSelectedElement(null);
          setCreatingWireStartNode(null);
          setEditingWire(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mousePos, elements]);

  function stopSimulation() {
    setSimulationRunning(false);
    setElements((prev) =>
      prev.map((el) => ({
        ...el,
        // set computed values to undefined when simulation stops
        computed: {
          current: undefined,
          voltage: undefined,
          power: undefined,
          measurement: el.computed?.measurement ?? undefined,
        },
      }))
    );
  }

  function startSimulation() {
    setSimulationRunning(true);
    computeCircuit(wires);
  }

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
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    if (editingWire) {
      const updated = wires.filter((w) => w.id !== editingWire.wireId);
      setWires(updated);
      //computeCircuit(updated);
      stopSimulation();
      setEditingWire(null);
      return;
    }

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
      //computeCircuit(updatedWires);
      stopSimulation();

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
    if (simulationRunning) {
      computeCircuit(wires);
    }
    // stopSimulation();
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
    if (simulationRunning) computeCircuit(wires);
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
    if (fromPolarity === "positive" && toPolarity === "positive")
      return "green";
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
        {/* absolutely position start/stop simulation button at the top center of the screen with padding */}
        <div className="bg-blue-50 px-2 py-2 rounded-md shadow-md absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex flex-row gap-4 items-center justify-center">
          <button
            className={`px-4 py-2 rounded cursor-pointer ${simulationRunning
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
              } text-white`}
            onClick={() => {
              if (simulationRunning) {
                stopSimulation();
              } else {
                startSimulation();
              }
            }}
          >
            {simulationRunning ? "Stop Simulation" : "Start Simulation"}
          </button>
          <CircuitManager
            onCircuitSelect={function (circuitId: string): void {
              const data = getCircuitById(circuitId);
              if (!data) return;

              resetState();
              setElements(data.elements);
              setWires(data.wires);
            }}
            currentElements={elements}
            currentWires={wires}
            snapshot={stageRef.current?.toDataURL() || ""}
          />
        </div>
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
              console.log(points);
              console.log("length" + points.length);
              if (points.length == 4) {
                const [x1, y1, x2, y2] = points;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                points.splice(2, 0, midX, midY);
              }

              return (
                <React.Fragment key={wire.id}>
                  <Line
                    points={points}
                    stroke={
                      selectedElement?.id === wire.id
                        ? "orange"
                        : getWireColor(wire)
                    }
                    strokeWidth={selectedElement?.id === wire.id ? 6 : 4}
                    hitStrokeWidth={12}
                    tension={0.5}
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
                    // dash={[10, 5]}
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
                setElements((prev) =>
                  prev.filter((el) => el.id !== updatedElement.id)
                );
                setSelectedElement(null);
                setCreatingWireStartNode(null);
                setEditingWire(null);
                //computeCircuit(updatedWires);
                stopSimulation();
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

                //computeCircuit(wires);
                stopSimulation();
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
                //computeCircuit(wires.filter((w) => w.id !== updatedWire.id));
                stopSimulation();
              } else {
                setWires((prev) =>
                  prev.map((w) =>
                    w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                  )
                );
                //computeCircuit(wires);
                stopSimulation();
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
