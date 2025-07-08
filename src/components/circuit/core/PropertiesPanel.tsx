import { CircuitElement } from "@/common/types/circuit";
import { useEffect, useState } from "react";

type PropertiesPanelProps = {
  selectedElement: CircuitElement;
  onEdit: (updatedElement: CircuitElement, deleteElement: boolean) => void;
};

export default function PropertiesPanel({
  selectedElement,
  onEdit,
}: PropertiesPanelProps) {
  if (!selectedElement) return null;

  const [resistance, setResistance] = useState<number | null>(
    selectedElement.properties?.resistance ?? null
  );
  const [voltage, setVoltage] = useState<number | null>(
    selectedElement.properties?.voltage ?? null
  );
  const [minResistance, setMinResistance] = useState<number | null>(
    selectedElement.properties?.minResistance ?? null
  );
  const [maxResistance, setMaxResistance] = useState<number | null>(
    selectedElement.properties?.maxResistance ?? null
  );

  useEffect(() => {
    setResistance(selectedElement.properties?.resistance ?? null);
    setVoltage(selectedElement.properties?.voltage ?? null);
    setMinResistance(selectedElement.properties?.minResistance ?? null);
    setMaxResistance(selectedElement.properties?.maxResistance ?? null);
  }, [selectedElement]);

  const handleUpdate = () => {
    // check resistance if max and min resistance are set, otherwise clamp
    let tempResistance = resistance;
    if (
      minResistance !== null &&
      maxResistance !== null &&
      tempResistance !== null
    ) {
      tempResistance = Math.max(
        minResistance,
        Math.min(maxResistance, tempResistance)
      );
    }

    const updatedElement = {
      ...selectedElement,
      properties: {
        ...selectedElement.properties,
        resistance: tempResistance ?? undefined,
        voltage: voltage ?? undefined,
        minResistance: minResistance ?? undefined,
        maxResistance: maxResistance ?? undefined,
      },
    };
    onEdit(updatedElement, false);
  };

  const handleDelete = () => {
    onEdit(selectedElement, true);
  };

  return (
    <div className="bg-blue-100 h-1/2 border-l border-gray-300 shadow-md flex flex-col">
      {/* Top Header */}
      <div className="bg-blue-200 px-4 py-2 border-b border-gray-300 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center gap-2">
          Properties
        </h2>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
        {/* Info Section */}
        <div className="text-sm text-gray-800 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">Element Type:</span>
            <span>{selectedElement.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Element ID:</span>
            <span>{selectedElement.id}</span>
          </div>
        </div>

        {/* Resistance Field */}
        {resistance != null && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Resistance (Ω):</label>
            <input
              type="number"
              value={resistance}
              onChange={(e) => setResistance(Number(e.target.value))}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-300 focus:ring-1 outline-none"
            />
          </div>
        )}

        {/* Voltage Field */}
        {voltage != null && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Voltage (V):</label>
            <input
              type="number"
              value={voltage}
              onChange={(e) => setVoltage(Number(e.target.value))}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-300 focus:ring-1 outline-none"
            />
          </div>
        )}

        {/* Min Resistance */}
        {minResistance !== null && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Min Resistance (Ω):</label>
            <input
              type="number"
              value={minResistance}
              onChange={(e) => setMinResistance(Number(e.target.value))}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-300 focus:ring-1 outline-none"
            />
          </div>
        )}

        {/* Max Resistance */}
        {maxResistance !== null && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700">Max Resistance (Ω):</label>
            <input
              type="number"
              value={maxResistance}
              onChange={(e) => setMaxResistance(Number(e.target.value))}
              className="mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-300 focus:ring-1 outline-none"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="mt-4 flex gap-4">
          <button
            className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            onClick={handleUpdate}
          >
            Update
          </button>
          <button
            className="flex-1 bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
