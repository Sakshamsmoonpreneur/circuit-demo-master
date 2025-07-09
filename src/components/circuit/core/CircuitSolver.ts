import { CircuitElement, Wire, Node } from "@/common/types/circuit";
import { json } from "stream/consumers";

export default function solveCircuit(
  elements: CircuitElement[],
  wiresSnapshot: Wire[]
): CircuitElement[] {
  const nodeMap = new Map<string, Node>();
  const elementMap = new Map<string, CircuitElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
    for (const node of el.nodes) {
      nodeMap.set(node.id, node);
    }
  }

  console.log("Circuit Elements", JSON.stringify(elements, null, 2));
  console.log("Wire Connection", JSON.stringify(wiresSnapshot, null, 2));

  const adjacency = new Map<string, string[]>();
  for (const wire of wiresSnapshot) {
    if (!adjacency.has(wire.fromNodeId)) adjacency.set(wire.fromNodeId, []);
    if (!adjacency.has(wire.toNodeId)) adjacency.set(wire.toNodeId, []);
    adjacency.get(wire.fromNodeId)!.push(wire.toNodeId);
    adjacency.get(wire.toNodeId)!.push(wire.fromNodeId);
  }

  // ✅ Add internal battery node connection
  for (const el of elements) {
    if (el.type === "battery" && el.nodes.length === 2) {
      const [a, b] = el.nodes;
      if (!adjacency.has(a.id)) adjacency.set(a.id, []);
      if (!adjacency.has(b.id)) adjacency.set(b.id, []);
      adjacency.get(a.id)!.push(b.id);
      adjacency.get(b.id)!.push(a.id);
    }
  }

  function findConnectedComponent(start: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adjacency.get(current) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return visited;
  }

  const batteryLoops: {
    battery: CircuitElement;
    nodeIds: Set<string>;
    positiveId: string;
    negativeId: string;
  }[] = [];

  for (const battery of elements.filter((e) => e.type === "battery")) {
    if (battery.nodes.length < 2) continue;
    const [pos, neg] = battery.nodes;
    const reachableFromPos = findConnectedComponent(pos.id);
    if (reachableFromPos.has(neg.id)) {
      batteryLoops.push({
        battery,
        nodeIds: reachableFromPos,
        positiveId: pos.id,
        negativeId: neg.id,
      });
    }
  }

  return elements.map((el) => {
    if (el.nodes.length !== 2) {
      return { ...el, computed: { current: 0, voltage: 0 } };
    }

    const [n1, n2] = el.nodes;

    for (const loop of batteryLoops) {
      const { battery, nodeIds, positiveId, negativeId } = loop;

      if (nodeIds.has(n1.id) && nodeIds.has(n2.id)) {
        const n1ConnectedToPositive = findConnectedComponent(positiveId).has(
          n1.id
        );
        const n1ConnectedToNegative = findConnectedComponent(negativeId).has(
          n1.id
        );
        const n2ConnectedToPositive = findConnectedComponent(positiveId).has(
          n2.id
        );
        const n2ConnectedToNegative = findConnectedComponent(negativeId).has(
          n2.id
        );

        const validConnection =
          (n1ConnectedToPositive && n2ConnectedToNegative) ||
          (n2ConnectedToPositive && n1ConnectedToNegative);

        if (!validConnection) continue;

        const connectedElements = elements.filter((e) =>
          e.nodes.every((n) => nodeIds.has(n.id))
        );

        const totalResistance = connectedElements.reduce((sum, e) => {
          if (
            e.type === "resistor" ||
            e.type === "lightbulb" ||
            e.type === "potentiometer"
          ) {
            return sum + (e.properties?.resistance ?? 1);
          }
          return sum;
        }, 0);

        const voltage = battery.properties?.voltage ?? 0;
        const current = voltage / (totalResistance || 1); // avoid divide-by-zero

        return {
          ...el,
          computed: {
            current,
            voltage,
            power: voltage * current,
          },
        };
      }
    }

    // Not part of any valid loop
    return {
      ...el,
      computed: { current: 0, voltage: 0 },
    };
  });
}
