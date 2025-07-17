import { CircuitElement, Wire } from "@/common/types/circuit";

type CircuitCanvasUtilConstructorProps = {
  getElements: () => CircuitElement[];
  setElements: (elements: CircuitElement[]) => void;
};

export class CircuitCanvasUtil {
  private getElements: () => CircuitElement[];
  private setElements: (elements: CircuitElement[]) => void;

  constructor(props: CircuitCanvasUtilConstructorProps) {
    this.getElements = props.getElements;
    this.setElements = props.setElements;
  }

  getWireColor(wire: Wire): string {
    const fromPolarity = this.getNodeById(wire.fromNodeId)?.polarity;
    const toPolarity = this.getNodeById(wire.toNodeId)?.polarity;

    if (fromPolarity === "negative" && toPolarity === "negative") return "red";
    if (fromPolarity === "positive" && toPolarity === "positive")
      return "green";
    return "black";
  }

  getNodeById(nodeId: string) {
    return this.getElements()
      .flatMap((e) => e.nodes)
      .find((n) => n.id === nodeId);
  }
}
