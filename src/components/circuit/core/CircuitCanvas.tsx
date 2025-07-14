"use client";
import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, EditingWire, Wire } from "@/common/types/circuit";
import RenderElement from "./RenderElement";
import { DebugBox } from "@/components/debug/DebugBox";
import createElement from "@/utils/core/createElement";
import solveCircuit from "@/utils/core/kirchoffSolver";
import PropertiesPanel from "./PropertiesPanel";
import CircuitPalette from "./CircuitPalette";
import { getCircuitById } from "../../../utils/core/circuitStorage";
import Konva from "konva";
import styles from './CircuitCanvas.module.css';
import CircuitStorage from "./CircuitStorage";

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
  const [creatingWireJoints, setCreatingWireJoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [history, setHistory] = useState<
    { elements: CircuitElement[]; wires: Wire[] }[]
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
    pushToHistory();
    setElements([]);
    setWires([]);
    setWireCounter(0);
    setCreatingWireStartNode(null);
    setEditingWire(null);
  }

  useEffect(() => {
    resetState();
  }, []);

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

  function pushToHistory() {
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          elements: JSON.parse(JSON.stringify(elements)),
          wires: JSON.parse(JSON.stringify(wires)),
        },
      ];

      return next.length > 50 ? next.slice(1) : next;
    });
  }

  function getNodeById(nodeId: string) {
    return elements.flatMap((e) => e.nodes).find((n) => n.id === nodeId);
  }

  const getElementById = React.useCallback(
    (elementId: string) => {
      return elements.find((e) => e.id === elementId);
    },
    [elements]
  );

  const getNodeParent = React.useCallback(
    (nodeId: string) => {
      const node = elements
        .flatMap((e) => e.nodes)
        .find((n) => n.id === nodeId);
      return node ? getElementById(node.parentId) : null;
    },
    [elements, getElementById]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault(); // Prevent default behavior (e.g. exiting fullscreen)
        setCreatingWireStartNode(null);
        setEditingWire(null);
      }
      // if ctrl + L is pressed
      if ((e.ctrlKey && e.key.toLowerCase() === "l")) {
        e.preventDefault(); // Prevent default behavior
        resetState();
      }
      if (e.key === "Delete") {
        e.preventDefault(); // Prevent default delete behavior
        if (selectedElement) {
          pushToHistory();
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
      // to remove delete all the wires
      if ((e.shiftKey && e.key.toLowerCase() === "w")) {
        e.preventDefault();
        pushToHistory();
        setWires([]);
        stopSimulation();
      }
      // to revert to history
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((prev) => {
          if (prev.length === 0) return prev;

          const last = prev[prev.length - 1];
          setElements(last.elements);
          setWires(last.wires);
          stopSimulation();

          return prev.slice(0, -1); // remove the last snapshot
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mousePos, elements, getNodeParent, wires, selectedElement]);

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
    pushToHistory();
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

  // function handleNodeClick(nodeId: string) {
  //   if (editingWire) {
  //     setWires((prev) =>
  //       prev.map((wire) =>
  //         wire.id === editingWire.wireId
  //           ? { ...wire, [editingWire.end]: nodeId }
  //           : wire
  //       )
  //     );
  //     setEditingWire(null);
  //     return;
  //   }

  //   if (!creatingWireStartNode) {
  //     setCreatingWireStartNode(nodeId);
  //     setCreatingWireJoints([]);
  //   } else if (creatingWireStartNode === nodeId) {
  //     setCreatingWireStartNode(null);
  //     setCreatingWireJoints([]);
  //   } else {
  //     const newWire: Wire = {
  //       id: `wire-${wireCounter}`,
  //       fromNodeId: creatingWireStartNode,
  //       toNodeId: nodeId,
  //       joints: creatingWireJoints,
  //     };

  //     const updatedWires = [...wires, newWire];
  //     setWires(updatedWires);
  //     setWireCounter((c) => c + 1);
  //     //computeCircuit(updatedWires);
  //     stopSimulation();

  //     setCreatingWireStartNode(null);
  //     setCreatingWireJoints([]);
  //   }
  // }
  function handleNodeClick(nodeId: string) {
    if (editingWire) {
      // complete wire editing logic
      pushToHistory();
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

    // First click: set start node
    if (!creatingWireStartNode) {
      setCreatingWireStartNode(nodeId);
      setCreatingWireJoints([]);
      return;
    }

    // Clicked same node again: cancel
    if (creatingWireStartNode === nodeId) {
      setCreatingWireStartNode(null);
      setCreatingWireJoints([]);
      return;
    }

    // Second click: create wire
    pushToHistory();

    const newWire: Wire = {
      id: `wire-${wireCounter}`,
      fromNodeId: creatingWireStartNode,
      toNodeId: nodeId,
      joints: creatingWireJoints,
    };

    setWires([...wires, newWire]);
    setWireCounter((c) => c + 1);
    stopSimulation();

    setCreatingWireStartNode(null);
    setCreatingWireJoints([]);
  }

  function computeCircuit(wiresSnapshot: Wire[]) {
    setElements((prevElements) => solveCircuit(prevElements, wiresSnapshot));
  }

  // handle resistance change for potentiometer
  function handleRatioChange(elementId: string, ratio: number) {
    setElements((prev) =>
      prev.map((el) =>
        el.id === elementId
          ? {
            ...el,
            properties: { ...el.properties, ratio },
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
    pushToHistory();
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
      // className="flex flex-row items-center justify-between h-screen w-screen relative"
      className={styles.canvasContainer}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Debug Box Panel */}
      <div
        className={`${styles.panelLeft} ${showDebugBox ? styles.panelExpanded : styles.panelCollapsed
          }`}
      >
        <button
          className={styles.toggleButton}
          style={{ left: '0.5rem' }}
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
        <div className={styles.centerControls}>
          <button
            className={`${styles.simulationButton} ${simulationRunning ? styles.simulationStop : styles.simulationStart
              }`}
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
          <CircuitStorage
            onCircuitSelect={function (circuitId: string): void {
              const data = getCircuitById(circuitId);
              if (!data) return;
              pushToHistory();
              resetState();
              setElements(data.elements);
              setWires(data.wires);
            }}
            currentElements={elements}
            currentWires={wires}
            getSnapshot={() => stageRef.current?.toDataURL() || ""}
          />
          <div className={styles.tooltipWrapper}>
            <div className={styles.tooltipIcon}>?</div>
            <div className={styles.tooltipContent}>
              <div className={styles.tooltipTitle}>Keyboard Shortcuts</div>
              <ul className={styles.tooltipList}>
                <li>
                  <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>Z</kbd> – Undo last action
                </li>
                <li>
                  <kbd className={styles.kbd}>Delete</kbd> – Delete selected element
                </li>
                <li>
                  <kbd className={styles.kbd}>Shift</kbd> + <kbd className={styles.kbd}>W</kbd> – Delete all wires
                </li>
                <li>
                  <kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>L</kbd> – Clear/reset circuit
                </li>
                <li>
                  <kbd className={styles.kbd}>Esc</kbd> – Cancel wire creation/editing
                </li>
              </ul>
            </div>
          </div>

        </div>
        <Stage
          id="canvas-stage"
          width={window.innerWidth * 0.5}
          height={window.innerHeight}
          onMouseMove={handleStageMouseMove}
          onClick={handleStageClick}
          ref={stageRef}
        >
          <Layer>
            {/* Render wires */}
            {wires.map((wire) => {
              const points = getWirePoints(wire);
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
                    onClick={() => {
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
                handleRatioChange={handleRatioChange}
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
        className={`${styles.panelRight} ${showPalette ? styles.panelExpanded : styles.panelCollapsed
          }`}
      >
        <button
          className={styles.toggleButton}
          style={{ right: '0.5rem' }}
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
              pushToHistory();
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
              pushToHistory();
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
