import { CircuitElement, Wire, Node } from "@/common/types/circuit";

export default function GetCircuitOutput(
    elements: CircuitElement[],
    wires: Wire[]
): CircuitElement[] {
    const nodeMap: Record<string, Node> = {};
    elements.forEach((el) =>
        el.nodes.forEach((node) => (nodeMap[node.id] = node))
    );

    // Map nodeId to connected wires
    const connectionMap: Record<string, string[]> = {};
    wires.forEach((wire) => {
        if (!connectionMap[wire.fromNodeId]) connectionMap[wire.fromNodeId] = [];
        if (!connectionMap[wire.toNodeId]) connectionMap[wire.toNodeId] = [];
        connectionMap[wire.fromNodeId].push(wire.toNodeId);
        connectionMap[wire.toNodeId].push(wire.fromNodeId);
    });

    const battery = elements.find((el) => el.type === "battery");
    if (!battery || !battery.properties?.voltage) {
        return elements.map((el) => ({
            ...el,
            computed: {
                ...el.computed,
                current: 0,
                voltage: 0,
                power: 0,
            },
        }));
    }

    const visited = new Set<string>();
    const path: CircuitElement[] = [];

    function dfs(nodeId: string): boolean {
        const node = nodeMap[nodeId];
        if (!node || visited.has(nodeId)) return false;
        visited.add(nodeId);

        const parent = elements.find((el) => el.id === node.parentId);
        if (parent && !path.includes(parent)) path.push(parent);

        const neighbors = connectionMap[nodeId] || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) dfs(neighborId);
        }

        return true;
    }

    const batteryPos = battery.nodes.find((n) => n.polarity === "positive");
    const batteryNeg = battery.nodes.find((n) => n.polarity === "negative");

    if (!batteryPos || !batteryNeg) return elements;

    dfs(batteryPos.id);

    if (!visited.has(batteryNeg.id)) {
        return elements.map((el) => ({
            ...el,
            computed: {
                ...el.computed,
                current: 0,
                voltage: 0,
                power: 0,
                measurement: el.type === "multimeter" ? 0 : undefined,
            },
        }));
    }

    let totalResistance = 0;

    path.forEach((el) => {
        if (el.properties?.resistance) {
            totalResistance += el.properties.resistance;
        }
    });

    if (totalResistance === 0) totalResistance = 0.001;

    const current = battery.properties.voltage / totalResistance;

    return elements.map((el) => {
        const isConnected = path.includes(el);

        if (!isConnected) {
            return {
                ...el,
                computed: {
                    current: 0,
                    voltage: 0,
                    power: 0,
                    measurement: el.type === "multimeter" ? 0 : undefined,
                },
            };
        }

        const voltageDrop =
            el.properties?.resistance && current
                ? el.properties.resistance * current
                : 0;

        const power = current * voltageDrop;

        if (el.type === "led") {
            const ledNodes = el.nodes;
            const from = wires.find(
                (w) => w.toNodeId === ledNodes[0].id || w.fromNodeId === ledNodes[0].id
            );
            const to = wires.find(
                (w) => w.toNodeId === ledNodes[1].id || w.fromNodeId === ledNodes[1].id
            );
            const polarityMismatch =
                ledNodes[0].polarity === ledNodes[1].polarity ||
                !from ||
                !to;

            if (polarityMismatch) {
                return {
                    ...el,
                    computed: {
                        current: 0,
                        voltage: 0,
                        power: 0,
                    },
                };
            }
        }

        return {
            ...el,
            computed: {
                current,
                voltage: voltageDrop,
                power,
                measurement:
                    el.type === "multimeter"
                        ? el.properties?.mode === "current"
                            ? current
                            : voltageDrop
                        : undefined,
            },
        };
    });
}
