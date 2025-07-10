"use client";
import CircuitManager from "@/components/circuit/core/CircuitManager";

export default function PortalPage() {
  return (
    <div>
      <h1>This is a testing page for the portal</h1>
      <CircuitManager
        onCircuitSelect={function (circuitId: string): void {
          throw new Error("Function not implemented.");
        }}
      />
    </div>
  );
}
