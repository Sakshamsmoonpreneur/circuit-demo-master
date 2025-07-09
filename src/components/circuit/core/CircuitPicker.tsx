import { get } from "http";
import { getSavedCircuitsList } from "./CircuitSaver";

type CircuitManagerProps = {
  onCircuitSelect: (circuitId: string) => void;
};

export default function CircuitPicker({
  onCircuitSelect,
}: CircuitManagerProps) {
  // Example list of circuits
  const circuits = getSavedCircuitsList();

  return (
    <select
      onChange={(e) => onCircuitSelect(e.target.value)}
      className="p-2 border rounded bg-blue-50"
    >
      <option value="">Select a circuit</option>
      {circuits.map((circuit) => (
        <option key={circuit.id} value={circuit.id}>
          {circuit.name}
        </option>
      ))}
    </select>
  );
}
