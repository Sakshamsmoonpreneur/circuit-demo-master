"use client";

import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Image, Rect, Text } from "react-konva";

interface MicrobitProps extends BaseElementProps {
  onControllerInput?: (input: "A" | "B") => void;
  leds: boolean[][];
}

export default function Microbit({
  leds,
  onControllerInput,
  ...props
}: MicrobitProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/microbit.svg";
    image.onload = () => setImg(image);
    image.alt = "Microbit";
  }, []);

  const handleButtonClick = (btn: "A" | "B") => {
    onControllerInput?.(btn);
  };

  return (
    <BaseElement {...props}>
      <Group>
        {img && (
          <Image
            image={img}
            width={120}
            height={120}
            shadowColor={props.selected ? "blue" : undefined}
            shadowBlur={props.selected ? 15 : 0}
            shadowOffset={{ x: 0, y: 0 }}
            shadowOpacity={props.selected ? 0.6 : 0}
          />
        )}

        {/* 5x5 LED Grid */}
        {leds[0].map((_, y) =>
          leds.map((col, x) => (
            <Rect
              key={`${x}-${y}`}
              x={12 + x * 16}
              y={20 + y * 16}
              width={8}
              height={8}
              fill={leds[x][y] ? "yellow" : "#333"}
              cornerRadius={2}
            />
          ))
        )}

        {/* Button A */}
        <Group
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("A");
          }}
          x={10}
          y={95}
        >
          <Rect
            width={20}
            height={20}
            fill="blue"
            cornerRadius={10}
            shadowBlur={3}
          />
          <Text
            text="A"
            fill="white"
            x={6}
            y={3}
            fontSize={12}
            fontStyle="bold"
          />
        </Group>

        {/* Button B */}
        <Group
          onClick={(e) => {
            e.cancelBubble = true;
            handleButtonClick("B");
          }}
          x={90}
          y={95}
        >
          <Rect
            width={20}
            height={20}
            fill="blue"
            cornerRadius={10}
            shadowBlur={3}
          />
          <Text
            text="B"
            fill="white"
            x={6}
            y={3}
            fontSize={12}
            fontStyle="bold"
          />
        </Group>
      </Group>
    </BaseElement>
  );
}
