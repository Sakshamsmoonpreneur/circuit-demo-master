import { CircuitElement, Wire } from "../types/circuit";

export default function solveCircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  console.log("🔧 CIRCUIT SOLVER START");
  console.log(
    "Elements:",
    elements.map((e) => ({
      type: e.type,
      id: e.id,
      nodes: e.nodes.length,
      properties: e.properties,
    }))
  );
  console.log(
    "Wires:",
    wires.map((w) => ({ from: w.fromNodeId, to: w.toNodeId }))
  );

  const subcircuits = getConnectedSubcircuits(elements, wires);
  console.log(`Found ${subcircuits.length} subcircuits`);

  const allResults: CircuitElement[] = [];

  for (let i = 0; i < subcircuits.length; i++) {
    const { elements: subEls, wires: subWires } = subcircuits[i];
    console.log(`\n--- Solving subcircuit ${i + 1} ---`);
    console.log(
      "Subcircuit elements:",
      subEls.map((e) => e.type)
    );
    console.log("Subcircuit wires:", subWires.length);

    const results = solveSingleSubcircuit(subEls, subWires);
    allResults.push(...results);
  }

  console.log("🔧 CIRCUIT SOLVER END\n");
  return allResults;
}

function solveSingleSubcircuit(
  elements: CircuitElement[],
  wires: Wire[]
): CircuitElement[] {
  console.log("  📊 Solving single subcircuit");

  const nodeEquivalenceMap = findEquivalenceClasses(elements, wires);
  console.log(
    "  Node equivalence map:",
    Object.fromEntries(nodeEquivalenceMap)
  );

  const effectiveNodeIds = getEffectiveNodeIds(nodeEquivalenceMap);
  console.log("  Effective node IDs:", Array.from(effectiveNodeIds));

  if (effectiveNodeIds.size === 0) {
    console.log("  ⚠️ No effective nodes, zeroing out");
    return zeroOutComputed(elements);
  }

  const { groundId, nonGroundIds, nodeIndex } =
    getNodeMappings(effectiveNodeIds);
  console.log("  Ground node:", groundId);
  console.log("  Non-ground nodes:", nonGroundIds);
  console.log("  Node index mapping:", Object.fromEntries(nodeIndex));

  const n = nonGroundIds.length;

  const elementsWithCurrent = getElementsWithCurrent(
    elements,
    nodeEquivalenceMap
  );
  console.log(
    "  Elements with current sources:",
    elementsWithCurrent.map((e) => ({ type: e.type, id: e.id }))
  );

  const currentSourceIndexMap = mapCurrentSourceIndices(elementsWithCurrent);
  console.log(
    "  Current source index map:",
    Object.fromEntries(currentSourceIndexMap)
  );

  const { G, B, C, D, I, E } = buildMNAMatrices(
    elements,
    nodeEquivalenceMap,
    nodeIndex,
    currentSourceIndexMap
  );

  console.log("  📈 MNA Matrices:");
  console.log("  G (conductance):", G);
  console.log("  B (current-voltage):", B);
  console.log("  C (voltage-current):", C);
  console.log("  D (current-current):", D);
  console.log("  I (current sources):", I);
  console.log("  E (voltage sources):", E);

  const { A, z } = buildFullSystem(G, B, C, D, I, E);
  console.log("  📐 Full system matrix A:", A);
  console.log("  📐 Full system vector z:", z);

  const x = solveLinearSystem(A, z);
  if (!x) {
    console.log("  ❌ Linear system solution failed");
    return zeroOutComputed(elements);
  }

  console.log("  ✅ Solution vector x:", x);

  const nodeVoltages = getNodeVoltages(x, nonGroundIds, groundId);
  console.log("  🔋 Node voltages:", nodeVoltages);

  const results = computeElementResults(
    elements,
    nodeVoltages,
    x,
    nodeEquivalenceMap,
    currentSourceIndexMap,
    n
  );

  console.log("  📊 Final element results:");
  results.forEach((el) => {
    console.log(`    ${el.type} (${el.id}):`, el.computed);
  });

  return results;
}

function getConnectedSubcircuits(
  elements: CircuitElement[],
  wires: Wire[]
): { elements: CircuitElement[]; wires: Wire[] }[] {
  // Build graph: each node is a circuit node ID, edges are wires and element connections
  const graph = new Map<string, Set<string>>();

  const addEdge = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, new Set());
    graph.get(a)!.add(b);
    if (!graph.has(b)) graph.set(b, new Set());
    graph.get(b)!.add(a);
  };

  // Add wires as edges
  for (const wire of wires) {
    addEdge(wire.fromNodeId, wire.toNodeId);
  }

  // For microbit, don't add internal edges between 3.3V and GND
  // They should remain separate nodes for the voltage source to work
  // For other elements, add edges between all nodes
  for (const el of elements) {
    if (el.type === "microbit") {
      // Don't add any internal edges for microbit - let wires connect the nodes
      // The microbit acts as a voltage source between 3.3V and GND
      continue;
    } else if (el.nodes.length >= 2) {
      // For all other elements, connect all nodes
      for (let i = 0; i < el.nodes.length; i++) {
        for (let j = i + 1; j < el.nodes.length; j++) {
          addEdge(el.nodes[i].id, el.nodes[j].id);
        }
      }
    }
  }

  // Find connected node groups using BFS
  const visited = new Set<string>();
  const nodeGroups: string[][] = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const queue = [nodeId];
    const group: string[] = [];
    visited.add(nodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      group.push(current);
      for (const neighbor of graph.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    nodeGroups.push(group);
  }

  // Map node groups to element/wire subcircuits
  return nodeGroups.map((group) => {
    const groupSet = new Set(group);
    const subElements = elements.filter((el) => {
      if (el.type === "microbit") {
        // Include microbit if ANY of its nodes are in the group (including P0, P1, P2, etc.)
        return el.nodes.some((n) => groupSet.has(n.id));
      } else {
        // For other elements, include if any node is in the group
        return el.nodes.some((n) => groupSet.has(n.id));
      }
    });
    const subWires = wires.filter(
      (w) => groupSet.has(w.fromNodeId) && groupSet.has(w.toNodeId)
    );
    return { elements: subElements, wires: subWires };
  });
}

function findEquivalenceClasses(elements: CircuitElement[], wires: Wire[]) {
  const parent = new Map<string, string>();
  const allNodeIds = new Set<string>();

  // Add all wire nodes
  wires.forEach((w) => {
    parent.set(w.fromNodeId, w.fromNodeId);
    parent.set(w.toNodeId, w.toNodeId);
    allNodeIds.add(w.fromNodeId);
    allNodeIds.add(w.toNodeId);
  });

  // Add only connected nodes from elements, or all nodes for non-microbit elements
  elements.forEach((e) => {
    if (e.type === "microbit") {
      // For microbit, add all nodes that are actually connected via wires
      // AND also add 3.3V and GND if any pin is connected (since they're needed for voltage sources)
      const pos = e.nodes.find((n) => n.placeholder === "3.3V")?.id;
      const neg = e.nodes.find((n) => n.placeholder === "GND")?.id;

      // Check if any microbit pin is connected
      const anyPinConnected = e.nodes.some((n) => allNodeIds.has(n.id));

      e.nodes.forEach((n) => {
        const isConnected = allNodeIds.has(n.id);
        const is33V = n.id === pos;
        const isGND = n.id === neg;

        // Add node if:
        // 1. It's directly connected via wire, OR
        // 2. It's 3.3V or GND and any pin is connected (needed for voltage sources)
        if (isConnected || ((is33V || isGND) && anyPinConnected)) {
          parent.set(n.id, n.id);
          allNodeIds.add(n.id);
        }
      });
    } else {
      // For all other elements, add all nodes
      e.nodes.forEach((n) => {
        parent.set(n.id, n.id);
        allNodeIds.add(n.id);
      });
    }
  });

  function find(i: string): string {
    if (!parent.has(i)) return i;
    if (parent.get(i) === i) return i;
    const root = find(parent.get(i)!);
    parent.set(i, root);
    return root;
  }

  function union(i: string, j: string) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) parent.set(rootI, rootJ);
  }

  // Union wire connections
  for (const wire of wires) union(wire.fromNodeId, wire.toNodeId);

  // For microbit, DON'T union 3.3V and GND - let them be separate nodes
  // The microbit acts as a voltage source between these two nodes
  // Unioning them would short-circuit the voltage source

  const equivalenceMap = new Map<string, string>();
  for (const id of allNodeIds) equivalenceMap.set(id, find(id));
  return equivalenceMap;
}

function getEffectiveNodeIds(map: Map<string, string>) {
  return new Set(map.values());
}

function zeroOutComputed(elements: CircuitElement[]) {
  return elements.map((el) => ({
    ...el,
    computed: { current: 0, voltage: 0, power: 0, measurement: 0 },
  }));
}

function getNodeMappings(effectiveNodeIds: Set<string>) {
  const list = Array.from(effectiveNodeIds);

  // Try to find GND node as ground reference first
  let groundId = list.find((id) => id.includes("GND")) || list[0];
  const nonGroundIds = list.filter((id) => id !== groundId);

  const nodeIndex = new Map<string, number>();
  nonGroundIds.forEach((id, i) => nodeIndex.set(id, i));
  return { groundId, nonGroundIds, nodeIndex };
}

function getElementsWithCurrent(
  elements: CircuitElement[],
  nodeMap?: Map<string, string>
) {
  const result = elements.filter(
    (e) =>
      (e.type === "battery" && e.nodes.length === 2) ||
      e.type === "microbit" ||
      (e.type === "multimeter" && e.properties?.mode === "current")
  );

  // Add extra entries for microbit pins that are powered on (digital: 1) AND connected
  for (const e of elements) {
    if (e.type === "microbit") {
      const pins =
        (e.controller?.pins as Record<string, { digital?: number }>) ?? {};
      for (const node of e.nodes) {
        const pinName = node.placeholder;
        if (pinName && pinName.startsWith("P")) {
          const pinState = pins[pinName];
          // Only add if the pin is powered on (digital: 1) AND the pin is connected to the circuit
          if (pinState?.digital === 1 && nodeMap && nodeMap.has(node.id)) {
            result.push({ ...e, id: e.id + `-${pinName}` });
          }
        }
      }
    }
  }

  return result;
}

function mapCurrentSourceIndices(elements: CircuitElement[]) {
  const map = new Map<string, number>();
  elements.forEach((el, i) => map.set(el.id, i));
  return map;
}

function buildMNAMatrices(
  elements: CircuitElement[],
  nodeMap: Map<string, string>,
  nodeIndex: Map<string, number>,
  currentMap: Map<string, number>
) {
  console.log("  🏗️ Building MNA matrices");
  console.log("    Node count (n):", nodeIndex.size);
  console.log("    Current source count (m):", currentMap.size);

  const n = nodeIndex.size;
  const m = currentMap.size;
  const G = Array.from({ length: n }, () => Array(n).fill(0));
  const B = Array.from({ length: n }, () => Array(m).fill(0));
  const C = Array.from({ length: m }, () => Array(n).fill(0));
  const D = Array.from({ length: m }, () => Array(m).fill(0));
  const I = Array(n).fill(0);
  const E = Array(m).fill(0);

  for (const el of elements) {
    console.log(`    Processing element: ${el.type} (${el.id})`);
    if (el.nodes.length < 2) {
      console.log(`      ⚠️ Skipping element with < 2 nodes`);
      continue;
    }
    const a = nodeMap.get(el.nodes[0].id);
    const b = nodeMap.get(el.nodes[1].id);
    const ai = nodeIndex.get(a!);
    const bi = nodeIndex.get(b!);
    console.log(
      `      Node mapping: ${el.nodes[0].id} -> ${a} (index ${ai}), ${el.nodes[1].id} -> ${b} (index ${bi})`
    );

    if (
      el.type === "resistor" ||
      el.type === "lightbulb" ||
      el.type === "led"
    ) {
      console.log(`    ⚡ Processing resistive element ${el.type}`);
      const R = el.properties?.resistance ?? 1;
      const g = 1 / R;
      console.log(`      Resistance: ${R}Ω, Conductance: ${g}S`);

      if (ai !== undefined) G[ai][ai] += g;
      if (bi !== undefined) G[bi][bi] += g;
      if (ai !== undefined && bi !== undefined) {
        G[ai][bi] -= g;
        G[bi][ai] -= g;
      }
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5; // how far the wiper is between A and B

      const Ra = R * (1 - t); // A–W
      const Rb = R * t; // W–B

      const a = nodeMap.get(nodeA.id);
      const w = nodeMap.get(nodeW.id);
      const b = nodeMap.get(nodeB.id);

      const ai = nodeIndex.get(a!);
      const wi = nodeIndex.get(w!);
      const bi = nodeIndex.get(b!);

      const ga = 1 / Ra;
      const gb = 1 / Rb;

      if (ai !== undefined) G[ai][ai] += ga;
      if (wi !== undefined) G[wi][wi] += ga;
      if (ai !== undefined && wi !== undefined) {
        G[ai][wi] -= ga;
        G[wi][ai] -= ga;
      }

      if (bi !== undefined) G[bi][bi] += gb;
      if (wi !== undefined) G[wi][wi] += gb;
      if (bi !== undefined && wi !== undefined) {
        G[bi][wi] -= gb;
        G[wi][bi] -= gb;
      }
    } else if (el.type === "battery") {
      console.log(`    🔋 Processing battery ${el.id}`);
      const pos =
        el.nodes.find((n) => n.polarity === "positive")?.id ?? el.nodes[1].id;
      const neg =
        el.nodes.find((n) => n.polarity === "negative")?.id ?? el.nodes[0].id;
      console.log(`      Positive node: ${pos}, Negative node: ${neg}`);
      console.log(`      Battery voltage: ${el.properties?.voltage ?? 0}V`);
      console.log(
        `      Battery resistance: ${el.properties?.resistance ?? 0}Ω`
      );

      const pIdx = nodeIndex.get(nodeMap.get(pos)!);
      const nIdx = nodeIndex.get(nodeMap.get(neg)!);
      const idx = currentMap.get(el.id)!;
      console.log(
        `      Positive index: ${pIdx}, Negative index: ${nIdx}, Current index: ${idx}`
      );

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      D[idx][idx] += el.properties?.resistance ?? 0;
      E[idx] = el.properties?.voltage ?? 0;
    } else if (el.type === "microbit") {
      console.log(`    📱 Processing microbit ${el.id}`);
      console.log(
        `      All nodes:`,
        el.nodes.map((n) => ({ id: n.id, placeholder: n.placeholder }))
      );

      // get ground and 3.3v pins (nodes)
      const pos = el.nodes.find((n) => n.placeholder === "3.3V")?.id;
      const neg = el.nodes.find((n) => n.placeholder === "GND")?.id;
      console.log(`      3.3V node: ${pos}, GND node: ${neg}`);
      console.log(`      Microbit voltage: ${el.properties?.voltage ?? 0}V`);
      console.log(
        `      Microbit resistance: ${el.properties?.resistance ?? 0}Ω`
      );

      if (!pos || !neg) {
        console.log(`      ❌ ERROR: Missing 3.3V or GND node on microbit!`);
        console.log(
          `      Available nodes:`,
          el.nodes.map((n) => `${n.id} (${n.placeholder})`)
        );
        continue; // Skip this element instead of returning early
      }

      const pIdx = nodeIndex.get(nodeMap.get(pos!)!);
      const nIdx = nodeIndex.get(nodeMap.get(neg!)!);
      const idx = currentMap.get(el.id)!;
      console.log(
        `      Positive index: ${pIdx}, Negative index: ${nIdx}, Current index: ${idx}`
      );

      if (pIdx !== undefined) B[pIdx][idx] -= 1;
      if (nIdx !== undefined) B[nIdx][idx] += 1;
      if (pIdx !== undefined) C[idx][pIdx] += 1;
      if (nIdx !== undefined) C[idx][nIdx] -= 1;
      D[idx][idx] += el.properties?.resistance ?? 0;
      E[idx] = el.properties?.voltage ?? 3.3;

      // Handle programmable pins (P0, P1, P2, etc.)
      console.log("Controller data:", el.controller);
      const pins =
        (el.controller?.pins as Record<string, { digital?: number }>) ?? {};
      console.log("Pins data:", pins);
      for (const node of el.nodes) {
        const pinName = node.placeholder;
        console.log(`      Processing pin: ${pinName}`);
        if (pinName && pinName.startsWith("P") && nodeMap.has(node.id)) {
          const pinState = pins[pinName];
          console.log(`      Pin ${pinName} state:`, pinState);
          // test P0
          // if (pinName == "P0") {
          //   pinState.digital = 1; // Simulate pin P0 being active
          // }
          if (pinState?.digital === 1) {
            // When pin is active, connect it directly to the 3.3V rail
            // This creates a 0V voltage source (short circuit) between pin and 3.3V
            const pinIdx = nodeIndex.get(nodeMap.get(node.id)!);
            const pin33VIdx = nodeIndex.get(nodeMap.get(pos!)!);
            const pinCurrentIdx = currentMap.get(el.id + `-${pinName}`);

            console.log(`      Pin ${pinName} voltage source setup:`);
            console.log(`        - Pin node ID: ${node.id}`);
            console.log(
              `        - Pin node mapped to: ${nodeMap.get(node.id)}`
            );
            console.log(`        - Pin index: ${pinIdx}`);
            console.log(`        - 3.3V index: ${pin33VIdx}`);
            console.log(`        - Pin current ID: ${el.id + `-${pinName}`}`);
            console.log(`        - Pin current index: ${pinCurrentIdx}`);

            if (
              pinIdx !== undefined &&
              pin33VIdx !== undefined &&
              pinCurrentIdx !== undefined
            ) {
              console.log(
                `      Active pin ${pinName}: connecting to 3.3V rail (pin index: ${pinIdx}, 3.3V index: ${pin33VIdx}, current index: ${pinCurrentIdx})`
              );
              // Create 0V voltage source between pin and 3.3V (short circuit)
              B[pinIdx][pinCurrentIdx] -= 1;
              B[pin33VIdx][pinCurrentIdx] += 1;
              C[pinCurrentIdx][pinIdx] += 1;
              C[pinCurrentIdx][pin33VIdx] -= 1;
              D[pinCurrentIdx][pinCurrentIdx] += el.properties?.resistance ?? 0;
              E[pinCurrentIdx] = 0; // 0V difference between pin and 3.3V
            } else {
              console.log(
                `      ❌ Pin ${pinName}: voltage source creation failed - missing indices`
              );
            }
          } else {
            console.log(
              `      Pin ${pinName}: inactive (digital: ${pinState?.digital})`
            );
          }
        }
      }
    } else if (el.type === "multimeter" && el.properties?.mode === "current") {
      const idx = currentMap.get(el.id)!;
      if (ai !== undefined) B[ai][idx] -= 1;
      if (bi !== undefined) B[bi][idx] += 1;
      if (ai !== undefined) C[idx][ai] += 1;
      if (bi !== undefined) C[idx][bi] -= 1;
      D[idx][idx] -= 0;
      E[idx] = 0;
    }
  }

  return { G, B, C, D, I, E };
}

function buildFullSystem(
  G: number[][],
  B: number[][],
  C: number[][],
  D: number[][],
  I: number[],
  E: number[]
) {
  const n = G.length;
  const m = D.length;
  const A = Array.from({ length: n + m }, () => Array(n + m).fill(0));
  const z = Array(n + m).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = G[i][j];
    for (let j = 0; j < m; j++) A[i][n + j] = B[i][j];
    z[i] = I[i];
  }
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) A[n + i][j] = C[i][j];
    for (let j = 0; j < m; j++) A[n + i][n + j] = D[i][j];
    z[n + i] = E[i];
  }
  return { A, z };
}

function getNodeVoltages(x: number[], ids: string[], groundId: string) {
  const result: Record<string, number> = { [groundId]: 0 };
  ids.forEach((id, i) => (result[id] = x[i]));
  return result;
}

function computeElementResults(
  elements: CircuitElement[],
  nodeVoltages: Record<string, number>,
  x: number[],
  nodeMap: Map<string, string>,
  currentMap: Map<string, number>,
  n: number
): CircuitElement[] {
  return elements.map((el) => {
    const a = nodeMap.get(el.nodes[0].id);
    const b = nodeMap.get(el.nodes[1].id);
    const Va = nodeVoltages[a!] ?? 0;
    const Vb = nodeVoltages[b!] ?? 0;
    let voltage = Va - Vb;
    let current = 0,
      power = 0,
      measurement = 0;

    if (["resistor", "lightbulb", "led"].includes(el.type)) {
      const R = el.properties?.resistance ?? 1;
      current = voltage / R;
      power = voltage * current;
    } else if (el.type === "potentiometer") {
      const [nodeA, nodeW, nodeB] = el.nodes;
      const Va = nodeVoltages[nodeMap.get(nodeA.id)!] ?? 0;
      const Vw = nodeVoltages[nodeMap.get(nodeW.id)!] ?? 0;
      const Vb = nodeVoltages[nodeMap.get(nodeB.id)!] ?? 0;

      const R = el.properties?.resistance ?? 1;
      const t = el.properties?.ratio ?? 0.5;
      const Ra = R * (1 - t); // A–W
      //const Rb = R * t; // W–B

      const Ia = (Va - Vw) / Ra;
      //const Ib = (Vw - Vb) / Rb;

      // voltage across entire potentiometer
      const totalVoltage = Va - Vb;
      const totalCurrent = Ia; // = Ib if everything is correct
      const totalPower = totalVoltage * totalCurrent;

      current = totalCurrent;
      voltage = totalVoltage;
      power = totalPower;
    } else if (el.type === "battery") {
      const idx = currentMap.get(el.id);
      if (idx !== undefined) current = x[n + idx];
      power = voltage * current;
    } else if (el.type === "microbit") {
      const idx = currentMap.get(el.id);
      if (idx !== undefined) current = x[n + idx];
      power = voltage * current;
    } else if (el.type === "multimeter") {
      if (el.properties?.mode === "voltage") {
        measurement = voltage;
      } else if (el.properties?.mode === "current") {
        const idx = currentMap.get(el.id);
        if (idx !== undefined) measurement = x[n + idx];
        current = measurement;
        power = 0;
      }
    }

    return {
      ...el,
      computed: { voltage, current, power, measurement },
    };
  });
}

function solveLinearSystem(A: number[][], z: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, z[i]]);
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    }
    [M[i], M[maxRow]] = [M[maxRow], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let k = i + 1; k < n; k++) {
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= f * M[i][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) M[k][n] -= M[k][i] * x[i];
  }
  return x;
}
