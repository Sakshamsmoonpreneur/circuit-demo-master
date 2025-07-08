import { CircuitElement } from "@/common/types/circuit";
import { CircuitElementProps } from "@/common/types/circuit";

export default function createElement(
  props: CircuitElementProps
): CircuitElement | null {
  const id = props.type + "-" + props.idNumber;

  const batteryElement: CircuitElement = {
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
        polarity: "negative",
      },
      {
        id: id + "-node-2",
        x: 30,
        y: -2,
        parentId: id,
        polarity: "positive",
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
        voltage: props.properties?.voltage,
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
        x: 2,
        y: 40,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 40,
        y: 40,
        parentId: id,
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 10,
      },
      ...props.properties,
    },
  };

  const multimeterElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10,
        y: 20,
        parentId: id,
        polarity: "negative",
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 20,
        parentId: id,
        polarity: "positive",
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 10,
      },
      ...props.properties,
    },
  };

  const potentiometerElement = {
    id,
    type: props.type,
    x: props.pos.x,
    y: props.pos.y,
    nodes: [
      {
        id: id + "-node-1",
        x: 10,
        y: 20,
        parentId: id,
      },
      {
        id: id + "-node-2",
        x: 30,
        y: 20,
        parentId: id,
      },
    ],
    properties: {
      ...{
        voltage: props.properties?.voltage,
        resistance: props.properties?.resistance ?? 10,
        maxResistance: props.properties?.maxResistance ?? 20,
        minResistance: props.properties?.minResistance ?? 0,
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
    case "multimeter":
      element = multimeterElement;
      break;
    case "potentiometer":
      element = potentiometerElement;
      break;
    default:
      element = null;
  }

  return element;
}
