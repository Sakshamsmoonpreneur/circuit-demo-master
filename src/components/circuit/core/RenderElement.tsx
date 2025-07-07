import { CircuitElement } from "@/common/types/circuit";
import { Circle, Group, Rect } from "react-konva";
import Lightbulb from "../elements/Lightbulb";
import { KonvaEventObject } from "konva/lib/Node";
import Battery from "../elements/Battery";
import Resistor from "../elements/Resistor";
import Multimeter from "../elements/Multimeter";
import Potentiometer from "../elements/Potentiometer";

export default function RenderElement({
  element,
  ...props
}: {
  element: CircuitElement;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  handleNodeClick: (nodeId: string) => void;
  handleResistanceChange?: (elementId: string, resistance: number) => void;
  onSelect?: (elementId: string) => void;
  selectedElementId?: string | null;
}) {
  return (
    <Group
      x={element.x}
      y={element.y}
      draggable
      onDragMove={props.onDragMove}
      onClick={() => {
        props.onSelect?.(element.id);
      }}
      id={element.id}
      draggable={true}
    >
      {element.type === "lightbulb" && (
        <Lightbulb
          id={element.id}
          x={0}
          y={0}
          children={undefined}
          current={element.computed?.current ?? 0}
        />
      )}
      {element.type === "battery" && (
        <Battery id={element.id} x={0} y={0} children={undefined} />
      )}
      {element.type === "resistor" && (
        <Resistor id={element.id} x={1} y={22} children={undefined} />
      )}
      {element.type === "multimeter" && (
        <Multimeter
          id={element.id}
          x={1}
          y={22}
          children={undefined}
          current={element.computed?.current ?? 0}
          voltage={element.computed?.voltage ?? 0}
          resistance={
            (element.computed?.voltage ?? 0) / (element.computed?.current ?? 1)
          }
        />
      )}
      {element.type === "potentiometer" && (
        <Potentiometer
          id={element.id}
          x={1}
          y={22}
          children={undefined}
          onResistanceChange={(resistance) => {
            props.handleResistanceChange?.(element.id, resistance);
          }}
          minResistance={element.properties?.minResistance ?? 0}
          maxResistance={element.properties?.maxResistance ?? 20}
          resistance={element.properties?.resistance}
        />
      )}

      {/* render the nodes for the element */}
      {element.nodes.map((node) => (
        <Circle
          key={node.id}
          x={node.x}
          y={node.y}
          radius={5}
          fill={
            node.polarity === "positive"
              ? "green"
              : node.polarity === "negative"
              ? "red"
              : "black"
          }
          onClick={() => props.handleNodeClick(node.id)}
          hitStrokeWidth={10}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = "pointer";
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = "default";
            }
          }}

        // TODO: Add interaction handlers here
        />
      ))}
    </Group>
  );
}
