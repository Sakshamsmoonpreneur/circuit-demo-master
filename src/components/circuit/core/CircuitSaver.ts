import { CircuitElement, Wire } from "@/common/types/circuit";

export function SaveCircuit(
  name: string,
  elements: CircuitElement[],
  wires: Wire[]
) {
  // save to local storage
  // give it a unique uuid
  const circuitData = {
    name,
    id: crypto.randomUUID(), // Generate a unique ID for the circuit
    elements,
    wires,
  };

  // add to local storage array of saved circuits
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  savedCircuits.push(circuitData);
  localStorage.setItem("savedCircuits", JSON.stringify(savedCircuits));
}

export function getSavedCircuitsList(): { id: string; name: string }[] {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  return savedCircuits.map((circuit: { id: string; name: string }) => ({
    id: circuit.id,
    name: circuit.name,
  }));
}

export function getCircuitById(
  id: string
):
  | { id: string; name: string; elements: CircuitElement[]; wires: Wire[] }
  | undefined {
  const savedCircuits = JSON.parse(
    localStorage.getItem("savedCircuits") || "[]"
  );
  return savedCircuits.find((circuit: { id: string }) => circuit.id === id);
}
