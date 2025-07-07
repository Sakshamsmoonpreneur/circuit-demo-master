"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Image, Text, Rect, Group } from "react-konva";

interface MultimeterProps extends BaseElementProps {
  current?: number;
  voltage?: number;
  resistance?: number;
}

type Mode = "voltage" | "current" | "resistance";

export default function Multimeter(props: MultimeterProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<Mode>("voltage");

  const getDisplayValue = () => {
    switch (mode) {
      case "voltage":
        return props.voltage !== undefined
          ? `${props.voltage.toFixed(2)} V`
          : "---";
      case "current":
        return props.current !== undefined
          ? `${props.current.toFixed(2)} A`
          : "---";
      case "resistance":
        return props.resistance !== undefined
          ? `${props.resistance.toFixed(2)} Ω`
          : "---";
      default:
        return "---";
    }
  };

  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/multimeter.svg";
    image.onload = () => setImg(image);
  }, []);

  const SCALE = 180 / 240; // ~0.3333

  const buttonDefs = [
    { y: 10, label: "V", mode: "voltage" },
    { y: 40, label: "A", mode: "current" },
    { y: 70, label: "Ω", mode: "resistance" },
  ] as const;

  return (
    <BaseElement {...props}>
      <Group scale={{ x: SCALE, y: SCALE }}>
        {img && <Image image={img} width={240} height={100} />}
        <Text
          x={10}
          y={40}
          width={150}
          align="center"
          fontSize={24}
          fill="black"
          stroke="none"
          strokeWidth={1}
          text={getDisplayValue()}
        />
        {buttonDefs.map((btn) => (
          <Group
            key={btn.label}
            onClick={() => setMode(btn.mode)}
            onTap={() => setMode(btn.mode)}
          >
            <Rect
              x={170}
              y={btn.y}
              width={60}
              height={20}
              cornerRadius={3}
              fill={mode === btn.mode ? "#aaa" : "#ddd"}
              stroke="black"
            />
            <Text
              x={202}
              y={btn.y + 12}
              text={btn.label}
              fontSize={14}
              fill="black"
              stroke="none"
              align="center"
              strokeWidth={0.5}
              verticalAlign="middle"
              offsetX={7}
              offsetY={7}
            />
          </Group>
        ))}
      </Group>
    </BaseElement>
  );
}
