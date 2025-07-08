// /src/common/data/elements-api.ts

import { PaletteElementType } from "../types/circuit";

export interface PaletteElement {
  type: PaletteElementType;
  label: string;
  iconPath: string; // Relative to public/assets
  defaultProps: {
    resistance?: number;
    voltage?: number;
  };
}

export const ELEMENT_PALETTE: PaletteElement[] = [
  {
    type: "lightbulb",
    label: "Lightbulb",
    iconPath: "/circuit_elements/bulb-off.svg",
    defaultProps: { resistance: 50 },
  },
  {
    type: "battery",
    label: "Battery",
    iconPath: "/circuit_elements/battery.svg",
    defaultProps: { voltage: 9, resistance: 1 },
  },
  {
    type: "resistor",
    label: "Resistor",
    iconPath: "/circuit_elements/resistor.svg",
    defaultProps: { resistance: 10 },
  },
  {
    type: "multimeter",
    label: "Multimeter",
    iconPath: "/circuit_elements/Multimeter.svg",
    defaultProps: { resistance: 10 },
  },
  {
    type: "potentiometer",
    label: "Potentiometer",
    iconPath: "/circuit_elements/potentiometer.svg",
    defaultProps: { resistance: 10 },
  },
  {
    type: "led",
    label: "Led",
    iconPath: "/circuit_elements/led.svg",
    defaultProps: { resistance: 10 },
  },
];
