import { CircuitElement } from "@/common/types/circuit";

type Props = {
  type: string;
  idNumber: number;
  pos: { x: number; y: number };
  properties?: { resistance?: number; voltage?: number };
};

export default function createElement(props: Props): CircuitElement | null {
  const id = props.type + "-" + props.idNumber;

  const batteryElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10,
        y: -2,
        parentId: id,
        fill: "red",
      },
      {
        id: id + "-node-2",
        x: 30,
        y: -2,
        parentId: id,
        fill: "green",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 9,
        resistance: props.properties?.resistance ?? 0,
      },
      ...props.properties,
    },
  };

  const lightbulbElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10,
        y: 40,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 40,
        parentId: id,
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 0,
        resistance: props.properties?.resistance ?? 10,
      },
      ...props.properties,
    },
  };

  const resistorElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10,
        y: 40,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 40,
        parentId: id,
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage ?? 0,
        resistance: props.properties?.resistance ?? 10,
      },
      ...props.properties,
    },
  };

  // switch based on type
  let element;
  switch (props.type) {
    case "battery":
      element = batteryElement;
      break;
    case "lightbulb":
      element = lightbulbElement;
      break;
    case "resistor":
      element = resistorElement;
      break;
    default:
      element = null;
  }

  return element;
}
