import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image, Line } from "react-konva";
import { ShortCircuitNotification } from "./ShortCircuitNotification";

interface LedProps extends BaseElementProps {
  power?: number;
}

export default function Led(props: LedProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/led.svg";
    image.onload = () => setImg(image);
    image.alt = "LED";
  }, []);

  const power = Math.max(0, props.power ?? 0);

  // You can tune these for your simulation:
  const maxPower = 300;     // visual scaling (full brightness)
  const maxSafePower = 350; // safety threshold for short circuit
  const brightness = Math.min(1, power / maxPower);
  const isOverloaded = power > maxSafePower;

  return (
    <BaseElement {...props}>
      <Group>
        {/* Always show the LED image, undimmed */}
        {img && (
          <Image
            image={img}
            width={75}
            height={75}
            shadowColor={props.selected ? "#000000" : undefined}
            shadowBlur={props.selected ? 7 : 0}
            shadowOffset={{ x: 12, y: -12 }}
            shadowOpacity={props.selected ? 2 : 0}
          />
        )}

        {/* Overload/short circuit effect (overlays LED) */}
        {isOverloaded ? (
          <>
            {/* Red flash */}
            <Circle
              x={34.3}
              y={35}
              radius={17}
              fill="red"
              opacity={0.6}
              shadowBlur={20}
              shadowColor="red"
            // This effect overlays the image because it is rendered after <Image />
            />
            {/* White spark/zigzag for short circuit */}
            <Line
              points={[30, 45, 34, 28, 39, 45]}
              stroke="white"
              strokeWidth={3}
              tension={0.8}
              lineCap="round"
              lineJoin="round"
              opacity={0.85}
              shadowBlur={10}
              shadowColor="white"
            />
            {/* Notification overlay */}
            <ShortCircuitNotification
              show={isOverloaded}
              message={`Current through the LED is ${power.toFixed(2)} mA, while absolute maximum is ${maxPower} mA`}
            />
          </>
        ) : (
          // Normal LED glow
          brightness > 0 && (
            <Circle
              x={34.3}
              y={36}
              radius={20 + 10 * brightness}
              fill="red"
              opacity={0.2 + 0.4 * brightness}
              shadowBlur={10 + 30 * brightness}
            />
          )
        )}
      </Group>
    </BaseElement>
  );
}
