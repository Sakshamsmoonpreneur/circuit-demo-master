import { CircuitElement } from "@/common/types/circuit";
import { Circle, Group } from "react-konva";
import Lightbulb from "../elements/Lightbulb";
import { KonvaEventObject } from "konva/lib/Node";
import Battery from "../elements/Battery";

export default function RenderElement({
  element,
  ...props
}: {
  element: CircuitElement;
  onDragMove: (e: KonvaEventObject<DragEvent>) => void;
  handleNodeClick: (nodeId: string) => void;
}) {
  return (
    <Group
      x={element.x}
      y={element.y}
      draggable
      onDragMove={props.onDragMove}
      id={element.id}
    >
      {element.type === "lightbulb" && (
        <Lightbulb
          id={element.id}
          x={0}
          y={0}
          children={undefined}
          current={element.properties?.current ?? 0}
        />
      )}
      {element.type === "battery" && (
        <Battery id={element.id} x={0} y={0} children={undefined} />
      )}

      {/* render the nodes for the element */}
      {element.nodes.map((node) => (
        <Circle
          key={node.id}
          x={node.x}
          y={node.y}
          radius={5}
          fill={node.fill || "black"}
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
