import { CircuitElement } from "@/common/types/circuit";
import { Circle, Group, Rect } from "react-konva";
import Lightbulb from "../elements/Lightbulb";
import { KonvaEventObject } from "konva/lib/Node";
import Battery from "../elements/Battery";
import Led from "../elements/Led";
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
  handleModeChange: (elementId: string, mode: "voltage" | "current") => void;
  onSelect?: (elementId: string) => void;
  selectedElementId?: string | null;
}) {
  return (
    <Group
      x={element.x}
      y={element.y}
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
          power={element.computed?.power ?? 0}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "led" && (
        <Led
          id={element.id}
          x={0}
          y={0}
          children={undefined}
          power={element.computed?.power ?? 0}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "battery" && (
        <Battery
          id={element.id}
          x={0}
          y={0}
          children={undefined}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "resistor" && (
        <Resistor
          id={element.id}
          x={1}
          y={22}
          children={undefined}
          selected={props.selectedElementId === element.id}
        />
      )}
      {element.type === "multimeter" && (
        <Multimeter
          id={element.id}
          x={1}
          y={22}
          children={undefined}
          measurement={element.computed?.measurement}
          initialMode={"voltage"}
          onModeChange={props.handleModeChange}
          selected={props.selectedElementId === element.id}
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
          selected={props.selectedElementId === element.id}
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
