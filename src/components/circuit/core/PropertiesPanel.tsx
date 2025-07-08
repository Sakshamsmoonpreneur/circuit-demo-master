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
    <div className="bg-white h-1/2 border-l border-black-200 shadow-md p-4 overflow-y-auto flex flex-col gap-4">
      <h2 className="text-xl font-medium">Properties</h2>
      {/* Render properties form here */}
      {/* edit resistance */}
      <div className="flex flex-col gap-2">
        {/* element type */}
        <div className="flex gap-2 items-center">
          <label className="font-semibold">Element Type:</label>
          <span className="ml-2">{selectedElement.type}</span>
        </div>

        <div className="flex gap-2 items-center">
          <label className="font-semibold">Element ID:</label>
          <span className="ml-2">{selectedElement.id}</span>
        </div>
      </div>

      {resistance != null && (
        <div className="flex flex-row gap-4 items-center">
          <label>Resistance:</label>
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1 w-24"
            value={resistance}
            onChange={(e) => setResistance(Number(e.target.value))}
          />
        </div>
      )}

      {voltage != null && (
        <div className="flex flex-row gap-4 items-center">
          <label>Voltage:</label>
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1 w-24"
            value={voltage}
            onChange={(e) => setVoltage(Number(e.target.value))}
          />
        </div>
      )}

      {minResistance !== null && (
        <div className="flex flex-row gap-4 items-center">
          <label>Min Resistance:</label>
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1 w-24"
            value={minResistance}
            onChange={(e) => setMinResistance(Number(e.target.value))}
          />
        </div>
      )}

      {maxResistance !== null && (
        <div className="flex flex-row gap-4 items-center">
          <label>Max Resistance:</label>
          <input
            type="number"
            className="border border-gray-300 rounded px-2 py-1 w-24"
            value={maxResistance}
            onChange={(e) => setMaxResistance(Number(e.target.value))}
          />
        </div>
      )}

      <button
        className="rounded-md bg-blue-400 text-black cursor-pointer hover:bg-blue-500 transition-all duration-200 px-4 py-2"
        onClick={handleUpdate}
      >
        Update
      </button>
      <button
        className="rounded-md bg-red-400 text-black cursor-pointer hover:bg-red-500 transition-all duration-200 px-4 py-2"
        onClick={handleDelete}
      >
        Delete
      </button>
    </div>
  );
}
