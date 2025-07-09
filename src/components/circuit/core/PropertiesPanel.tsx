import { CircuitElement, Wire, Node, PropertiesPanelProps } from "@/common/types/circuit";
import { useEffect, useState } from "react";


export default function PropertiesPanel({
  selectedElement,
  onElementEdit,
  onWireEdit,
  wires,
  getNodeById,
  onEditWireSelect,
}: PropertiesPanelProps) {
  const [resistance, setResistance] = useState<number | null>(null);
  const [voltage, setVoltage] = useState<number | null>(null);
  const [minResistance, setMinResistance] = useState<number | null>(null);
  const [maxResistance, setMaxResistance] = useState<number | null>(null);

  useEffect(() => {
    setResistance(selectedElement?.properties?.resistance ?? null);
    setVoltage(selectedElement?.properties?.voltage ?? null);
    setMinResistance(selectedElement?.properties?.minResistance ?? null);
    setMaxResistance(selectedElement?.properties?.maxResistance ?? null);
  }, [selectedElement]);

  if (!selectedElement) return null;

  const handleUpdate = () => {
    if (selectedElement.type === "wire") {
      const wireToUpdate = wires.find((w) => w.id === selectedElement.id);
      if (wireToUpdate) {
        onWireEdit(wireToUpdate, false);
      }
      return;
    }

    let tempResistance = resistance;
    if (minResistance !== null && maxResistance !== null && tempResistance !== null) {
      tempResistance = Math.max(minResistance, Math.min(maxResistance, tempResistance));
    }

    const updatedElement: CircuitElement = {
      ...selectedElement,
      properties: {
        ...selectedElement.properties,
        resistance: tempResistance ?? undefined,
        voltage: voltage ?? undefined,
        minResistance: minResistance ?? undefined,
        maxResistance: maxResistance ?? undefined,
      },
    };

    onElementEdit(updatedElement, false);
  };

  const handleDelete = () => {
    if (selectedElement.type === "wire") {
      const wireToDelete = wires.find((w) => w.id === selectedElement.id);
      if (wireToDelete) {
        onWireEdit(wireToDelete, true);
      }
    } else {
      onElementEdit(selectedElement, true);
    }
  };


  const getWireColor = (wire: Wire): string => {
    const fromPolarity = getNodeById(wire.fromNodeId)?.polarity;
    const toPolarity = getNodeById(wire.toNodeId)?.polarity;

    if (fromPolarity === "negative" && toPolarity === "negative") return "red";
    if (fromPolarity === "positive" && toPolarity === "positive") return "green";
    return "black";
  };

  const connectedWires = wires.filter(
    (w) =>
      w.fromNodeId.startsWith(selectedElement.id) || w.toNodeId.startsWith(selectedElement.id)
  );

  return (
    <div className="bg-blue-50 h-full border-l border-gray-300 shadow-md flex flex-col">
      <div className="bg-blue-200 px-4 py-2 border-b">
        <h2 className="text-2xl font-semibold text-gray-700">Properties</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
        <div className="text-sm text-gray-800 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">Element Type:</span>
            <span>{selectedElement.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Element ID:</span>
            <span className="text-blue-600 font-mono">{selectedElement.id}</span>
          </div>
        </div>

        {resistance != null && (
          <div className="flex flex-col">
            <label>Resistance (Ω):</label>
            <input
              type="number"
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
              className="border px-3 py-2 rounded focus:ring focus:ring-blue-300"
            />
          </div>
        )}

        {voltage != null && (
          <div className="flex flex-col">
            <label>Voltage (V):</label>
            <input
              type="number"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="border px-3 py-2 rounded focus:ring focus:ring-blue-300"
            />
          </div>
        )}

        {minResistance !== null && (
          <div className="flex flex-col">
            <label>Min Resistance (Ω):</label>
            <input
              type="number"
              value={minResistance}
              onChange={(e) => setMinResistance(Number(e.target.value))}
              className="border px-3 py-2 rounded focus:ring focus:ring-blue-300"
            />
          </div>
        )}

        {maxResistance !== null && (
          <div className="flex flex-col">
            <label>Max Resistance (Ω):</label>
            <input
              type="number"
              value={maxResistance}
              onChange={(e) => setMaxResistance(Number(e.target.value))}
              className="border px-3 py-2 rounded focus:ring focus:ring-blue-300"
            />
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {selectedElement.type !== "wire" && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleUpdate}
            >
              Update
            </button>
          )}
          <button
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>

        {/* 🧩 Connected Wire Info */}
        {connectedWires.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <h3 className="text-sm font-bold text-gray-600 mb-2">Connected Wires</h3>
            <ul className="space-y-1">
              {connectedWires.map((wire) => (
                <li
                  key={wire.id}
                  className="flex items-center justify-between text-xs border px-2 py-1 rounded bg-white hover:bg-blue-100"
                >
                  <span className="font-mono text-gray-800">
                    {wire.id} <span className="text-gray-400">({getWireColor(wire)})</span>
                  </span>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => onEditWireSelect?.(wire)}
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
