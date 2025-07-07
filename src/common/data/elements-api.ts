// /src/common/data/elements-api.ts

export type PaletteElementType = "lightbulb" | "battery" | "resistor";

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
        defaultProps: { resistance: 1 },
    },
    {
        type: "battery",
        label: "Battery",
        iconPath: "/circuit_elements/battery.svg",
        defaultProps: { voltage: 20, resistance: 1 },
    },
    {
        type: "resistor",
        label: "Resistor",
        iconPath: "/circuit_elements/resistor.svg",
        defaultProps: { resistance: 10 },
    },
];
