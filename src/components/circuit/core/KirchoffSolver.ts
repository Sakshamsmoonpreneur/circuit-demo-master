// common/types/circuit.ts (Example - integrate this into your actual type definitions)
// Kirchhoff-style circuit solver using Modified Nodal Analysis

import { CircuitElement, Wire, Node } from "@/common/types/circuit";

// Helper to find connected components (groups of nodes at the same potential due to wires)
function findEquivalenceClasses(
  elements: CircuitElement[],
  wires: Wire[]
): Map<string, string> {
  const parent = new Map<string, string>(); // Maps node ID to its representative (parent)
  const allNodeIds = new Set<string>();

  // Initialize each node as its own parent
  elements.forEach((e) =>
    e.nodes.forEach((n) => {
      parent.set(n.id, n.id);
      allNodeIds.add(n.id);
    })
  );
  wires.forEach((w) => {
    parent.set(w.fromNodeId, w.fromNodeId);
    parent.set(w.toNodeId, w.toNodeId);
    allNodeIds.add(w.fromNodeId);
    allNodeIds.add(w.toNodeId);
  });

  // Union-Find find operation with path compression
  function find(i: string): string {
    if (!parent.has(i)) return i; // Should not happen if allNodeIds is correctly populated
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  }

  // Union-Find union operation
  function union(i: string, j: string) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent.set(rootI, rootJ); // Make rootJ the parent of rootI
    }
  }

  // Union nodes connected by wires
  for (const wire of wires) {
    union(wire.fromNodeId, wire.toNodeId);
  }

  // Create the final mapping from original node ID to its representative (super-node ID)
  const equivalenceMap = new Map<string, string>();
  for (const nodeId of allNodeIds) {
    equivalenceMap.set(nodeId, find(nodeId));
  }
  return equivalenceMap;
}

export default function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  // Step 1: Identify super-nodes (nodes connected by ideal wires)
  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  console.log("Node Equivalence Map:", nodeEquivalenceMap);

  // Step 2: Create a unique list of effective node IDs (super-node IDs)
  const effectiveNodeIds = new Set<string>();
  for (const nodeId of nodeEquivalenceMap.values()) {
    effectiveNodeIds.add(nodeId);
  }

  // If the circuit is completely empty or just isolated elements, handle gracefully
  if (effectiveNodeIds.size === 0) {
    return elements.map((el) => ({
      ...el,
      computed: { current: 0, voltage: 0, power: 0, measurement: 0 }, // Ensure all computed properties are initialized
    }));
  }

  // Step 3: Choose ground and non-ground effective nodes
  const effectiveNodeList = Array.from(effectiveNodeIds);
  // Using the first element as ground is fine if the order from `Array.from` is stable.
  const groundId = effectiveNodeList[0];
  const nonGroundIds = effectiveNodeList.filter((id) => id !== groundId);

  // Step 4: Map effective node IDs to their matrix indices
  const nodeIndex = new Map<string, number>();
  nonGroundIds.forEach((id, i) => nodeIndex.set(id, i));
  console.log("Ground effective Node ID:", groundId);
  console.log("Non-Ground effective Node IDs:", nonGroundIds);
  console.log("Effective Node Index Map:", nodeIndex);

  const n = nonGroundIds.length;

  // Identify elements that introduce a new unknown current (voltage sources, current-mode multimeters)
  const elementsIntroducingCurrent = elements.filter(
    (e) =>
      (e.type === "battery" && e.nodes.length === 2) ||
      (e.type === "multimeter" &&
        e.properties?.mode === "current" &&
        e.nodes.length === 2)
  );
  const m = elementsIntroducingCurrent.length; // Number of additional unknowns (currents through V-sources/ammeters)

  // A map to quickly find the index of a voltage source or ammeter current in the solution vector 'x'
  const currentSourceIndexMap = new Map<string, number>();
  elementsIntroducingCurrent.forEach((el, i) => {
    currentSourceIndexMap.set(el.id, i);
  });

  console.log("Calculated n (non-ground effective nodes):", n);
  console.log("Calculated m (voltage sources + ammeters):", m);

  // Initialize MNA matrices
  const G = Array.from({ length: n }, () => Array(n).fill(0)); // Conductance matrix
  const B = Array.from({ length: n }, () => Array(m).fill(0)); // Voltage source contribution to KCL
  const C = Array.from({ length: m }, () => Array(n).fill(0)); // KVL constraints for voltage sources
  const D = Array.from({ length: m }, () => Array(m).fill(0)); // Internal resistance of voltage sources
  const I = Array(n).fill(0); // Independent current sources (RHS of KCL) - currently all zeros
  const E = Array(m).fill(0); // Voltage source values (RHS of KVL)

  for (const el of elements) {
    if (el.nodes.length < 2) continue; // Skip elements if they don't have at least two nodes

    const effectiveNodeAId = nodeEquivalenceMap.get(el.nodes[0].id);
    const effectiveNodeBId = nodeEquivalenceMap.get(el.nodes[1].id);

    // If either node is not part of the solved circuit (e.g., disconnected component), skip
    if (!effectiveNodeAId || !effectiveNodeBId) continue;

    const ai = nodeIndex.get(effectiveNodeAId); // Index for super-node A, or undefined if ground
    const bi = nodeIndex.get(effectiveNodeBId); // Index for super-node B, or undefined if ground

    // Handle standard components (resistors, lightbulbs, potentiometers)
    if (
      el.type === "resistor" ||
      el.type === "lightbulb" ||
      el.type === "potentiometer"
    ) {
      const R = el.properties?.resistance ?? 1;
      const Gval = 1 / R;
      // KCL equations (G matrix)
      if (ai !== undefined) G[ai][ai] += Gval;
      if (bi !== undefined) G[bi][bi] += Gval;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= Gval;
        G[bi][ai] -= Gval;
      }
    }
    // Handle Battery (Voltage Source with Internal Resistance)
    else if (el.type === "battery") {
      const internalResistance = el.properties?.resistance ?? 0;

      const positiveNodeId = el.nodes.find(
        (n) => (n as any).polarity === "positive"
      )?.id;
      const negativeNodeId = el.nodes.find(
        (n) => (n as any).polarity === "negative"
      )?.id;

      // Use consistent polarity for MNA. Fallback to node[0] negative, node[1] positive if polarity isn't explicit
      const effectivePositiveNode = nodeEquivalenceMap.get(
        positiveNodeId || el.nodes[1].id
      )!;
      const effectiveNegativeNode = nodeEquivalenceMap.get(
        negativeNodeId || el.nodes[0].id
      )!;

      const pi = nodeIndex.get(effectivePositiveNode); // Index for positive node
      const ni = nodeIndex.get(effectiveNegativeNode); // Index for negative node

      const batteryVIdx = currentSourceIndexMap.get(el.id);
      if (batteryVIdx === undefined) {
        // Should not happen given how elementsIntroducingCurrent is built
        console.error(`Battery ${el.id} not assigned a voltage source index.`);
        continue;
      }

      // KCL contributions (currents flowing into/out of nodes due to the ideal voltage source current I_v)
      // I_v is defined as current leaving the positive terminal (pi) and entering the negative terminal (ni).
      // If pi is not ground: KCL at pi includes -I_v
      if (pi !== undefined) B[pi][batteryVIdx] -= 1;
      // If ni is not ground: KCL at ni includes +I_v
      if (ni !== undefined) B[ni][batteryVIdx] += 1;

      // KVL constraint: V_positive_terminal - V_negative_terminal - I_source * InternalResistance = EMF
      // V_positive_terminal coefficient
      if (pi !== undefined) C[batteryVIdx][pi] += 1;
      // V_negative_terminal coefficient
      if (ni !== undefined) C[batteryVIdx][ni] -= 1;

      // I_source coefficient (internal resistance) in D matrix
      D[batteryVIdx][batteryVIdx] += internalResistance;

      E[batteryVIdx] = el.properties?.voltage ?? 0; // EMF of the battery
    }
    // NEW: Handle Multimeter
    else if (el.type === "multimeter") {
      if (el.properties?.mode === "voltage") {
        // Voltmeter: Ideally infinite resistance, so no direct contribution to MNA matrices.
        // Its reading will be computed post-solution from node potentials.
      } else if (el.properties?.mode === "current") {
        // Ammeter: Ideally zero resistance, acts as an ideal 0V voltage source.
        // It introduces an unknown current variable.

        // Get the current source index assigned to this ammeter
        const ammeterVIdx = currentSourceIndexMap.get(el.id);
        if (ammeterVIdx === undefined) {
          // Should not happen
          console.error(
            `Multimeter ${el.id} (current mode) not assigned a voltage source index.`
          );
          continue;
        }

        // KCL contributions (currents flowing into/out of nodes due to the ammeter's current)
        // Convention: current 'I_ammeter' leaves node[0] (ai) and enters node[1] (bi) of the multimeter.
        if (ai !== undefined) B[ai][ammeterVIdx] -= 1; // Current I_ammeter leaves node ai
        if (bi !== undefined) B[bi][ammeterVIdx] += 1; // Current I_ammeter enters node bi

        // KVL constraint for the ideal 0V voltage source: V_node0 - V_node1 = 0
        if (ai !== undefined) C[ammeterVIdx][ai] += 1;
        if (bi !== undefined) C[ammeterVIdx][bi] -= 1;

        // D matrix for ammeter (0 resistance - this line is effectively D[idx][idx] -= 0)
        D[ammeterVIdx][ammeterVIdx] -= 0;

        // E vector for ammeter (0V source)
        E[ammeterVIdx] = 0;
      } else {
        console.warn(
          `Multimeter ${el.id} has invalid or no mode specified. Skipping.`
        );
      }
    }
  }

  // Combine matrices into the full MNA matrix A and RHS vector z
  const A: number[][] = Array(n + m)
    .fill(null)
    .map(() => Array(n + m).fill(0));
  const z: number[] = Array(n + m).fill(0);

  // Populate A matrix:
  // Top-left (n x n): G matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = G[i][j];
  }
  // Top-right (n x m): B matrix
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) A[i][n + j] = B[i][j];
  }
  // Bottom-left (m x n): C matrix
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) A[n + i][j] = C[i][j];
  }
  // Bottom-right (m x m): D matrix (includes internal resistance for batteries, 0 for ideal ammeters)
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) A[n + i][n + j] = D[i][j];
  }

  // Populate z vector:
  // Top (n): I vector (independent current sources, currently all zeros)
  for (let i = 0; i < n; i++) z[i] = I[i];
  // Bottom (m): E vector (voltage sources' EMFs / ammeters' 0V)
  for (let i = 0; i < m; i++) z[n + i] = E[i];

  console.log("Final A matrix before solving:", A);
  console.log("Final z vector before solving:", z);

  const x = solveLinearSystem(A, z);
  if (!x) {
    console.error(
      "solveLinearSystem returned null. Check matrix or circuit topology (e.g., short circuit across voltage source)."
    );
    return elements.map((el) => ({
      ...el,
      computed: { current: 0, voltage: 0, power: 0, measurement: 0 }, // Ensure multimeter gets 0 too
    }));
  }

  // Extract node voltages from solution vector x
  const nodeVoltages: Record<string, number> = { [groundId]: 0 };
  nonGroundIds.forEach((id, i) => {
    nodeVoltages[id] = x[i];
  });
  console.log("Computed effective Node Voltages:", nodeVoltages);

  // Final computation of element voltages, currents, and multimeter readings
  return elements.map((el) => {
    // Initialize computed values
    let computedVoltage: number | undefined = 0;
    let computedCurrent: number | undefined = 0;
    let computedPower: number | undefined = 0;
    let computedMeasurement: number | undefined = undefined; // Specific for multimeter

    if (el.nodes.length !== 2) {
      // Handle single-node or malformed elements
      return {
        ...el,
        computed: { voltage: 0, current: 0, power: 0, measurement: 0 },
      };
    }

    // Get effective node IDs for calculation
    const effectiveNodeAId = nodeEquivalenceMap.get(el.nodes[0].id);
    const effectiveNodeBId = nodeEquivalenceMap.get(el.nodes[1].id);

    // If elements are disconnected or nodes not found in solution, return 0
    if (!effectiveNodeAId || !effectiveNodeBId) {
      console.warn(`Element ${el.id} has disconnected nodes. Computed 0.`);
      return {
        ...el,
        computed: { voltage: 0, current: 0, power: 0, measurement: 0 },
      };
    }

    const Va = nodeVoltages[effectiveNodeAId] ?? 0;
    const Vb = nodeVoltages[effectiveNodeBId] ?? 0;

    // Default voltage calculation (from node[0] to node[1])
    computedVoltage = Va - Vb;

    // Specific calculations based on element type
    if (
      el.type === "resistor" ||
      el.type === "lightbulb" ||
      el.type === "potentiometer" ||
      el.type === "led"
    ) {
      const R = el.properties?.resistance ?? 1;
      computedCurrent = computedVoltage / R; // Current from A to B
      computedPower = computedVoltage * computedCurrent;
    } else if (el.type === "battery") {
      const batteryIndex = currentSourceIndexMap.get(el.id);
      if (batteryIndex !== undefined) {
        computedCurrent = x[n + batteryIndex]; // Current through battery (from solution vector)
        // Power for battery: negative if supplying (power out), positive if absorbing (power in)
        // computedPower is V_terminal * I_through_battery
        computedPower = computedVoltage * computedCurrent; // Power absorbed by the battery
      } else {
        computedCurrent = 0; // Fallback if somehow not in map
        computedPower = 0;
      }
    } else if (el.type === "multimeter") {
      if (el.properties?.mode === "voltage") {
        computedMeasurement = computedVoltage; // Direct voltage reading
        // Current and power for an ideal voltmeter are 0.
        computedCurrent = 0;
        computedPower = 0;
      } else if (el.properties?.mode === "current") {
        const ammeterIndex = currentSourceIndexMap.get(el.id);
        if (ammeterIndex !== undefined) {
          computedMeasurement = x[n + ammeterIndex]; // Current reading (from solution vector)
          computedCurrent = computedMeasurement; // The current flowing through it
          // Voltage for ideal ammeter is 0, power is 0.
          computedVoltage = 0;
          computedPower = 0;
        } else {
          computedMeasurement = 0;
          computedCurrent = 0;
          computedVoltage = 0;
          computedPower = 0;
        }
      }
    }

    console.log(
      `Element ${el.id} (${el.type}): Voltage=${computedVoltage?.toFixed(
        3
      )}, Current=${computedCurrent?.toFixed(
        3
      )}, Power=${computedPower?.toFixed(3)}`
    );
    if (el.type === "multimeter") {
      console.log(
        `Multimeter ${el.id} measurement: ${computedMeasurement?.toFixed(3)}`
      );
    }

    return {
      ...el,
      computed: {
        voltage: computedVoltage,
        current: computedCurrent,
        power: computedPower,
        measurement: computedMeasurement, // Add multimeter specific measurement
      },
    };
  });
}

function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  console.log("entering solveLinearSystem");
  const n = A.length;
  // Deep copy A and z into a single augmented matrix M
  const M = A.map((row, i) => [...row, z[i]]);
  console.log("Matrix M (augmented):", M);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find row with maximum absolute value in current column (for pivoting)
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap max row with current row
    [M[i], M[maxRow]] = [M[maxRow], M[i]];

    // Check for singularity (pivot element is too small)
    if (Math.abs(M[i][i]) < 1e-12) {
      // Use a small tolerance for floating point comparisons
      console.error(
        `Matrix is singular or nearly singular at pivot ${i}. Value: ${M[i][i]}`
      );
      return null; // Matrix is singular, cannot solve uniquely
    }

    // Eliminate other rows
    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) {
        // Iterate up to n (including the augmented column)
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sumKnowns = 0;
    for (let j = i + 1; j < n; j++) {
      sumKnowns += M[i][j] * x[j];
    }
    x[i] = (M[i][n] - sumKnowns) / M[i][i];
  }
  console.log("Solution vector x:", x);
  return x;
}
