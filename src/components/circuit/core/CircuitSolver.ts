import { CircuitElement, Wire, Node } from "@/common/types/circuit";

export default function solveCircuit(
  elements: CircuitElement[],
  wiresSnapshot: Wire[]
): CircuitElement[] {
  const nodeMap = new Map<string, Node>();
  for (const el of elements) {
    for (const node of el.nodes) {
      nodeMap.set(node.id, node);
    }
  }

  const adjacency = new Map<string, string[]>();
  for (const wire of wiresSnapshot) {
    if (!adjacency.has(wire.fromNodeId)) adjacency.set(wire.fromNodeId, []);
    if (!adjacency.has(wire.toNodeId)) adjacency.set(wire.toNodeId, []);
    adjacency.get(wire.fromNodeId)!.push(wire.toNodeId);
    adjacency.get(wire.toNodeId)!.push(wire.fromNodeId);
  }

  // ✅ Connect battery terminals internally
  for (const el of elements) {
    if (el.type === "battery" && el.nodes.length === 2) {
      const [a, b] = el.nodes;
      if (!adjacency.has(a.id)) adjacency.set(a.id, []);
      if (!adjacency.has(b.id)) adjacency.set(b.id, []);
      adjacency.get(a.id)!.push(b.id);
      adjacency.get(b.id)!.push(a.id);
    }
  }

  function findReachable(start: string): Set<string> {
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

  // Find active nodes by checking all batteries
  const activeNodes = new Set<string>();
  const batteries = elements.filter((e) => e.type === "battery");

  for (const battery of batteries) {
    if (battery.nodes.length < 2) continue;
    const [posNode, negNode] = battery.nodes;

    const reachableFromPos = findReachable(posNode.id);

    if (reachableFromPos.has(negNode.id)) {
      for (const nodeId of reachableFromPos) {
        activeNodes.add(nodeId);
      }
    }
  }

  return elements.map((el) => {
    if (
      (el.type === "lightbulb" || el.type === "resistor") &&
      el.nodes.length === 2
    ) {
      const [a, b] = el.nodes;

      if (activeNodes.has(a.id) && activeNodes.has(b.id)) {
        const resistance = el.properties?.resistance ?? 10;
        const voltage = batteries[0]?.properties?.voltage ?? 5;
        const current = voltage / resistance;

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

    return {
      ...el,
      computed: { current: 0 },
    };
  });
}
