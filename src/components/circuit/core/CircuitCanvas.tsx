"use client";
import React, { useState, useEffect, useRef, JSX } from "react";
import { Stage, Layer, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { CircuitElement, EditingWire, Wire } from "@/common/types/circuit";
import RenderElement from "./RenderElement";
import { DebugBox } from "@/components/debug/DebugBox";
import createElement from "@/utils/core/createElement";
import solveCircuit from "@/utils/core/kirchoffSolver";
import PropertiesPanel from "./PropertiesPanel";
import { getCircuitById } from "../../../utils/core/circuitStorage";
import Konva from "konva";
import styles from "./CircuitCanvas.module.css";
import CircuitStorage from "./CircuitStorage";
import useCircuitShortcuts from "@/utils/hooks/useCircuitShortcuts";
import {
  getCircuitShortcuts,
  getShortcutMetadata,
} from "@/utils/core/circuitShortcuts";
// import { Simulator } from "@/lib/code/Simulator";
import { SimulatorProxy as Simulator } from "@/lib/code/SimulatorProxy";
import CircuitSelector from "../toolbar/panels/Palette";
import { FaArrowRight, FaCode, FaPlay, FaStop } from "react-icons/fa6";
import { VscDebug } from "react-icons/vsc";
import CodeEditor from "@/components/code/CodeEditor";
import Loader from "@/utils/core/loader";
import useDimensions from "@/utils/hooks/useDimentions";
import {
  ColorPaletteDropdown,
  defaultColors,
} from "../toolbar/customization/ColorPallete";

export default function CircuitCanvas() {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [activeControllerId, setActiveControllerId] = useState<string | null>(
    null
  );
  const [openCodeEditor, setOpenCodeEditor] = useState(false);
  const [controllerCodeMap, setControllerCodeMap] = useState<
    Record<string, string>
  >({});

  const [controllerMap, setControllerMap] = useState<Record<string, Simulator>>(
    {}
  );

  const [selectedWireColor, setSelectedWireColor] = useState<string>("#000000");

  const stageRef = useRef<Konva.Stage | null>(null);
  const [elements, setElements] = useState<CircuitElement[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [wireCounter, setWireCounter] = useState(0);
  const [showPalette, setShowPalette] = useState(true);
  const [showDebugBox, setShowDebugBox] = useState(false);
  const elementsRef = useRef<CircuitElement[]>(elements);
  const [creatingWireJoints, setCreatingWireJoints] = useState<
    { x: number; y: number }[]
  >([]);
  // @ts-ignore
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
  const tempDragPositions = useRef<{ [id: string]: { x: number; y: number } }>(
    {}
  );
  // @ts-ignore
  const [wireDragVersion, setWireDragVersion] = useState(0);
  const [loadingSavedCircuit, setLoadingSavedCircuit] = useState(false);

  const { width, height } = useDimensions();

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    resetState();
  }, []);
  function resetState() {
    pushToHistory();
    setElements([]);
    setWires([]);
    setWireCounter(0);
    setCreatingWireStartNode(null);
    setEditingWire(null);
  }

  //changing the element state on element position change
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);
  //end

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
    setControllerMap((prev) => {
      Object.values(prev).forEach((sim) => sim.disposeAndReload());
      return prev; // Keep the map intact!
    });
  }

  function startSimulation() {
    setSimulationRunning(true);
    computeCircuit(wires);

    // Run user code for all controllers
    elements.forEach((el) => {
      if (el.type === "microbit") {
        const sim = controllerMap[el.id];
        const code = controllerCodeMap[el.id] ?? "";
        if (sim && code) {
          sim.run(code);
        }
      }
    });
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
    (elementId: string): CircuitElement | null => {
      const base = elementsRef.current.find((e) => e.id === elementId);
      if (!base) return null;

      const tempPos = tempDragPositions.current[elementId];
      return tempPos ? { ...base, x: tempPos.x, y: tempPos.y } : base;
    },
    []
  );

  const getNodeParent = React.useCallback(
    (nodeId: string): CircuitElement | null => {
      const node = elementsRef.current
        .flatMap((e) => e.nodes)
        .find((n) => n.id === nodeId);
      if (!node) return null;

      return getElementById(node.parentId);
    },
    [getElementById]
  );

  useCircuitShortcuts({
    getShortcuts: () =>
      getCircuitShortcuts({
        elements,
        wires,
        selectedElement,
        setElements,
        setWires,
        setSelectedElement,
        setCreatingWireStartNode,
        setEditingWire,
        pushToHistory,
        stopSimulation,
        resetState,
        getNodeParent,
        toggleSimulation: () => {
          if (simulationRunning) {
            stopSimulation();
          } else {
            startSimulation();
          }
        },
        undo: () => {
          setHistory((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            setElements(last.elements);
            setWires(last.wires);
            stopSimulation();
            return prev.slice(0, -1);
          });
        },
      }),
  });

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
      const stage = stageRef.current;
      if (!stage || !pos) return;

      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const adjusted = transform.point(pos);

      setCreatingWireJoints((prev) => [
        ...prev,
        { x: adjusted.x, y: adjusted.y },
      ]);
    }
  }

  function handleElementDragMove(e: KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const id = e.target.id();
    const x = e.target.x();
    const y = e.target.y();

    tempDragPositions.current[id] = { x, y };

    // Trigger a light render to update wires
    setWireDragVersion((v) => v + 1); // 👈 create this state
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
      color: selectedWireColor,
    };

    setWires([...wires, newWire]);
    setWireCounter((c) => c + 1);
    stopSimulation();

    setCreatingWireStartNode(null);
    setCreatingWireJoints([]);
  }

  function computeCircuit(wiresSnapshot: Wire[]) {
    setElements((prevElements) => {
      const solved = solveCircuit(prevElements, wiresSnapshot);

      return prevElements.map((oldEl) => {
        const updated = solved.find((e) => e.id === oldEl.id);
        if (!updated) return oldEl; // If it's missing from the solved list, preserve it

        return {
          ...oldEl, // keep everything (e.g., controller state, UI stuff)
          ...updated, // overwrite any simulated data (like computed values)
          controller: oldEl.controller, // explicitly preserve controller just in case
        };
      });
    });
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

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    pushToHistory();

    const elementData = e.dataTransfer.getData("application/element-type");
    if (!elementData) return;

    const element = JSON.parse(elementData);

    const stage = stageRef.current;
    if (!stage) return;

    // DOM coordinates
    const pointerX = e.clientX;
    const pointerY = e.clientY;

    // Get bounding box of canvas DOM
    const containerRect = stage.container().getBoundingClientRect();

    // Convert screen coords to stage coords
    const xOnStage = pointerX - containerRect.left;
    const yOnStage = pointerY - containerRect.top;

    // Convert to actual canvas position (account for pan & zoom)
    const scale = stage.scaleX();
    const position = stage.position();

    const canvasX = (xOnStage - position.x) / scale;
    const canvasY = (yOnStage - position.y) / scale;

    const newElement = createElement({
      type: element.type,
      idNumber: elements.length + 1,
      pos: { x: canvasX, y: canvasY },
      properties: element.defaultProps,
    });

    if (!newElement) return;

    // Immediately add to canvas
    setElements((prev) => [...prev, newElement]);

    if (newElement.type === "microbit") {
      // Init simulator in the background (non-blocking)
      void (async () => {
        const simulator = new Simulator({
          language: "python",
          controller: "microbit",
          onOutput: (line) => console.log(`[${newElement.id}]`, line),
          onEvent: async (event) => {
            if (event.type === "reset") {
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id
                    ? {
                        ...el,
                        controller: {
                          leds: Array(5).fill(Array(5).fill(false)),
                        },
                      }
                    : el
                )
              );
            }
            if (event.type === "led-change") {
              const state = await simulator.getStates();
              const leds = state.leds;
              setElements((prev) =>
                prev.map((el) =>
                  el.id === newElement.id ? { ...el, controller: { leds } } : el
                )
              );
            }
          },
        });

        await simulator.initialize();
        const states = await simulator.getStates();

        // Update map and controller LED state
        setControllerMap((prev) => ({ ...prev, [newElement.id]: simulator }));
        setElements((prev) =>
          prev.map((el) =>
            el.id === newElement.id
              ? { ...el, controller: { leds: states.leds } }
              : el
          )
        );
      })();
    }
  }

  const getWireColor = (wire: Wire): string => {
    return wire.color || "#000000"; // Default to black if no color is set
  };

  // for canvas zoom in and zoom out
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    if (newScale < 0.5 || newScale > 2.5) return;

    // Get the position of the pointer relative to the stage's current transform
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Apply the new scale
    stage.scale({ x: newScale, y: newScale });

    // Calculate new position to keep pointer under cursor
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.position(newPos);
    stage.batchDraw();

    setCanvasScale(newScale);
    setCanvasOffset({ x: newPos.x, y: newPos.y });
  };

  // end

  return (
    <div
      className={styles.canvasContainer}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* ==================== Debug Panel ==================== */}
      {showDebugBox && (
        <DebugBox
          data={{
            mousePos,
            canvasOffset,
            draggingElement,
            selectedElement,
            editingWire,
            elements,
            wires,
          }}
          onClose={() => setShowDebugBox(false)}
        />
      )}

      {/* ==================== Left Side: Main Canvas ==================== */}
      <div className="flex-grow h-full flex flex-col">
        {/* Toolbar with center controls */}
        <div className="w-full h-12 bg-[#F4F5F6] flex items-center px-4  space-x-4 py-2 justify-between">
          {/* controls */}

          <div>
            {/* wire color selector dropdown; grayed out if no wire is selected otherwise can pick between 4 colors */}
            <ColorPaletteDropdown
              colors={defaultColors}
              selectedColor={selectedWireColor}
              onColorSelect={(color) => {
                setSelectedWireColor(color);
              }}
            />
          </div>
          <div className="flex flex-row items-center gap-2">
            <button
              className={`rounded-sm border-2 border-gray-300 shadow-sm text-black px-1 py-1 text-sm cursor-pointer ${
                simulationRunning ? "bg-red-300" : "bg-emerald-300"
              } flex items-center space-x-2`}
              onClick={() => {
                simulationRunning ? stopSimulation() : startSimulation();
              }}
            >
              {simulationRunning ? (
                <>
                  <FaStop />
                  <span>Stop Simulation</span>
                </>
              ) : (
                <>
                  <FaPlay />
                  <span>Start Simulation</span>
                </>
              )}
            </button>

            <button
              onClick={() => setOpenCodeEditor((prev) => !prev)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-sm text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center"
            >
              <FaCode />

              <span>Code</span>
            </button>

            <button
              onClick={() => setShowDebugBox((showDebugBox) => !showDebugBox)}
              className="px-1 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-sm text-black text-sm cursor-pointer flex flex-row gap-2 items-center justify-center"
            >
              <VscDebug />
              <span>Debugger</span>
            </button>

            <CircuitStorage
              onCircuitSelect={(circuitId) => {
                const data = getCircuitById(circuitId);
                if (!data) return;
                pushToHistory();
                resetState();
                setLoadingSavedCircuit(true);
                setElements(data.elements);
                setWires(data.wires);

                setTimeout(() => {
                  const stage = stageRef.current;
                  if (stage) {
                    const pos = stage.getPointerPosition();
                    if (pos) setMousePos(pos); // This triggers wire refresh
                  }
                }, 0);

                setLoadingSavedCircuit(true);
                setTimeout(() => {
                  setLoadingSavedCircuit(false);
                }, 500);
              }}
              currentElements={elements}
              currentWires={wires}
              getSnapshot={() => stageRef.current?.toDataURL() || ""}
            />

            {/* Keyboard Shortcut Tooltip */}
            <div className={styles.tooltipWrapper}>
              <div className={styles.tooltipIcon}>?</div>
              <div className={styles.tooltipContent}>
                <div className={styles.tooltipTitle}>Keyboard Shortcuts</div>
                <table className="w-full text-sm border-separate border-spacing-y-1">
                  <thead>
                    <tr>
                      <th className="text-left w-32 font-medium text-gray-700">
                        Keybind
                      </th>
                      <th className="text-left font-medium text-gray-700">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getShortcutMetadata().map((s) => (
                      <tr key={s.name}>
                        <td className="py-1 pr-4 align-top">
                          {s.keys.map((k, i) => (
                            <React.Fragment key={`${s.name}-key-${k}`}>
                              <kbd className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-300 text-xs font-mono">
                                {k}
                              </kbd>
                              {i < s.keys.length - 1 && (
                                <span className="mx-1">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </td>
                        <td className="py-1 align-middle">{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas Stage */}
        <div className="relative w-full flex-1 h-full p-1 overflow-hidden">
          {loadingSavedCircuit ? (
            <Loader />
          ) : (
            <Stage
              id="canvas-stage"
              width={window.innerWidth}
              height={window.innerHeight - 48} // Adjust height to account for toolbar
              onMouseMove={handleStageMouseMove}
              onClick={handleStageClick}
              ref={stageRef}
              x={canvasOffset.x}
              y={canvasOffset.y}
              onDragMove={(e) => {
                if (draggingElement !== null) return;
                const stage = e.target;
                setCanvasOffset({ x: stage.x(), y: stage.y() });
              }}
              draggable={draggingElement == null}
              onWheel={handleWheel}
            >
              {/* for canvas grid */}
              <Layer listening={false}>
                {/* Grid lines that adapt to zoom and pan */}
                {(() => {
                  const scale = canvasScale;
                  const position = canvasOffset;
                  const gridSize = 20;

                  const startX = -position.x / scale;
                  const startY = -position.y / scale;

                  const endX = startX + window.innerWidth / scale;
                  const endY = startY + window.innerHeight / scale;

                  const lines: JSX.Element[] = [];

                  for (
                    let x = Math.floor(startX / gridSize) * gridSize;
                    x < endX;
                    x += gridSize
                  ) {
                    lines.push(
                      <Line
                        key={`v-${x}`}
                        points={[
                          x * scale + position.x,
                          0,
                          x * scale + position.x,
                          window.innerHeight,
                        ]}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                        strokeDash={[2, 2]}
                      />
                    );
                  }

                  for (
                    let y = Math.floor(startY / gridSize) * gridSize;
                    y < endY;
                    y += gridSize
                  ) {
                    lines.push(
                      <Line
                        key={`h-${y}`}
                        points={[
                          0,
                          y * scale + position.y,
                          window.innerWidth,
                          y * scale + position.y,
                        ]}
                        stroke="#e5e7eb"
                        strokeWidth={1}
                        strokeDash={[2, 2]}
                      />
                    );
                  }

                  return lines;
                })()}
              </Layer>
              {/* // End of grid */}
              <Layer>
                {/* Render Wires */}
                {wires.map((wire) => {
                  const points = getWirePoints(wire);
                  if (points.length === 4) {
                    const [x1, y1, x2, y2] = points;
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    points.splice(2, 0, midX, midY);
                  }

                  return (
                    <Line
                      key={wire.id}
                      points={points}
                      stroke={
                        selectedElement?.id === wire.id
                          ? "orange"
                          : getWireColor(wire)
                      }
                      strokeWidth={selectedElement?.id === wire.id ? 6 : 4}
                      hitStrokeWidth={10}
                      tension={0.1}
                      lineCap="round"
                      lineJoin="round"
                      bezier
                      onClick={() =>
                        setSelectedElement({
                          id: wire.id,
                          type: "wire",
                          x: 0,
                          y: 0,
                          nodes: [],
                        })
                      }
                    />
                  );
                })}

                {/* In-Progress Wire Drawing */}
                {creatingWireStartNode &&
                  (() => {
                    const startNode = getNodeById(creatingWireStartNode);
                    if (!startNode) return null;
                    const startPos = {
                      x: startNode.x + (getNodeParent(startNode.id)?.x ?? 0),
                      y: startNode.y + (getNodeParent(startNode.id)?.y ?? 0),
                    };
                    const stage = stageRef.current;
                    if (!stage) return null;
                    const transform = stage.getAbsoluteTransform().copy();
                    transform.invert();
                    const adjustedMouse = transform.point(mousePos);
                    const inProgressPoints = [
                      startPos.x,
                      startPos.y,
                      ...creatingWireJoints.flatMap((p) => [p.x, p.y]),
                      adjustedMouse.x,
                      adjustedMouse.y,
                    ];
                    return (
                      <Line
                        points={inProgressPoints}
                        stroke="black"
                        strokeWidth={2}
                        pointerEvents="none"
                        lineCap="round"
                        lineJoin="round"
                      />
                    );
                  })()}

                {/* Render Elements */}
                {elements.map((element) => (
                  <RenderElement
                    key={element.id}
                    isSimulationOn={simulationRunning}
                    element={element}
                    onDragMove={handleElementDragMove}
                    handleNodeClick={handleNodeClick}
                    handleRatioChange={handleRatioChange}
                    handleModeChange={handleModeChange}
                    onDragStart={() => {
                      pushToHistory();
                      setDraggingElement(element.id);
                      stageRef.current?.draggable(false);
                    }}
                    onDragEnd={(e) => {
                      setDraggingElement(null);
                      stageRef.current?.draggable(true);
                      const id = e.target.id();
                      const x = e.target.x();
                      const y = e.target.y();
                      setElements((prev) =>
                        prev.map((el) => (el.id === id ? { ...el, x, y } : el))
                      );
                    }}
                    onSelect={(id) => {
                      const element = getElementById(id);
                      setSelectedElement(element ?? null);
                      setActiveControllerId(null);
                      setOpenCodeEditor(false);
                      if (element?.type === "microbit") {
                        setActiveControllerId(element.id);
                      }
                    }}
                    selectedElementId={selectedElement?.id || null}
                    // @ts-ignore
                    onControllerInput={(elementId, input) => {
                      const sim = controllerMap[elementId];
                      if (sim && (input === "A" || input === "B")) {
                        sim.simulateInput(input);
                      }
                    }}
                  />
                ))}
              </Layer>
            </Stage>
          )}
        </div>
      </div>

      {/* ==================== Right Side: Palette ==================== */}
      <div
        className={`transition-all duration-300 h-screen mt-12 bg-[#F4F5F6] overflow-visible absolute top-0 right-0 z-30 ${
          showPalette ? "w-72" : "w-10"
        }`}
        style={{ pointerEvents: "auto" }}
      >
        <button
          className={styles.toggleButton}
          style={{ left: "-0.5rem" }}
          onClick={() => setShowPalette((prev) => !prev)}
        >
          <span
            style={{
              display: "inline-block",
              transition: "transform 0.5s",
              transform: showPalette ? "rotate(0deg)" : "rotate(180deg)",
            }}
            className="flex items-center justify-center w-full h-full text-center "
          >
            <FaArrowRight />
          </span>
        </button>

        {showPalette && (
          <>
            <CircuitSelector />
            {selectedElement && (
              <PropertiesPanel
                selectedElement={selectedElement}
                wires={wires}
                getNodeById={getNodeById}
                onElementEdit={(updatedElement, deleteElement) => {
                  pushToHistory();
                  if (deleteElement) {
                    const updatedWires = wires.filter(
                      (w) =>
                        getNodeParent(w.fromNodeId)?.id !== updatedElement.id &&
                        getNodeParent(w.toNodeId)?.id !== updatedElement.id
                    );
                    setWires(updatedWires);
                    setElements((prev) =>
                      prev.filter((el) => el.id !== updatedElement.id)
                    );
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                    stopSimulation();
                  } else {
                    setElements((prev) =>
                      prev.map((el) =>
                        el.id === updatedElement.id
                          ? { ...el, ...updatedElement, x: el.x, y: el.y }
                          : el
                      )
                    );
                    stopSimulation();
                    setSelectedElement(updatedElement);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                  }
                }}
                onWireEdit={(updatedWire, deleteElement) => {
                  pushToHistory();
                  if (deleteElement) {
                    setWires((prev) =>
                      prev.filter((w) => w.id !== updatedWire.id)
                    );
                    setSelectedElement(null);
                    setCreatingWireStartNode(null);
                    setEditingWire(null);
                    stopSimulation();
                  } else {
                    setWires((prev) =>
                      prev.map((w) =>
                        w.id === updatedWire.id ? { ...w, ...updatedWire } : w
                      )
                    );
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
                setOpenCodeEditor={setOpenCodeEditor}
              />
            )}
          </>
        )}

        {/* =============== Code Editor Overlay =============== */}
        {openCodeEditor && (
          <div
            className="absolute right-0 top-0 h-full w-[500px] bg-white border-l border-gray-300 shadow-xl z-50 transition-transform duration-300"
            style={{
              transform: openCodeEditor ? "translateX(0)" : "translateX(100%)",
            }}
          >
            <div className="flex justify-between items-center p-2 border-b border-gray-300 bg-gray-100">
              <span className="font-semibold">Code Editor</span>
              <button
                className="text-sm text-gray-600 hover:text-black"
                onClick={() => setOpenCodeEditor(false)}
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto h-full">
              <CodeEditor
                code={controllerCodeMap[activeControllerId ?? ""] ?? ""}
                onChange={(newCode) => {
                  if (!activeControllerId) return;
                  setControllerCodeMap((prev) => ({
                    ...prev,
                    [activeControllerId]: newCode,
                  }));
                  stopSimulation();
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
