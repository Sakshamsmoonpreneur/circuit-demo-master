"use client";
import { CircuitElement, Wire } from "@/common/types/circuit";
import { SaveCircuit } from "./CircuitSaver";
import { useState } from "react";

export default function CircuitCreate({
  elements,
  wires,
}: {
  elements: CircuitElement[];
  wires: Wire[];
}) {
  // input field for circuit name and then a save button that calls saveCircuit(name, elements, wires)
  const [name, setName] = useState("");
  return (
    <div className="px-2 rounded-md bg-blue-50 shadow-md flex flex-row gap-2 py-2">
      <input
        type="text"
        placeholder="Circuit Name"
        onChange={(e) => setName(e.target.value)}
        className="border px-3 py-1 rounded focus:ring focus:ring-blue-300"
      />
      <button
        onClick={() => SaveCircuit(name, elements, wires)}
        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm cursor-pointer"
      >
        Save Circuit
      </button>
    </div>
  );
}
