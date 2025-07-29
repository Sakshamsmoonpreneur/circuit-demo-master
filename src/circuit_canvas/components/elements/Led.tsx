import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image } from "react-konva";

interface Led extends BaseElementProps {
  power?: number;
}

export default function Led(props: Led) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/led.svg"; // Always use the "off" bulb
    image.onload = () => setImg(image);
    image.alt = "LED";
  }, []);

  // Normalize brightness between 0 and 1
  // const brightness = Math.min(1, (props.current ?? 0) / 1.5); // Adjust denominator for how quickly it maxes out
  const power = Math.max(0, props.power ?? 0);
  // Assume max power for full brightness is 60 (adjust as needed)
  const maxPower = 300;
  // Normalize brightness between 0 and 1
  const brightness = Math.min(1, power / maxPower);
  return (
    <BaseElement {...props}>
      <Group>
        {/* Glow layer */}
        {brightness > 0 && (
          <Circle
            x={34.3}
            y={36}
            radius={20 + 10 * brightness}
            fill="red"
            opacity={0.2 + 0.4 * brightness}
            shadowBlur={10 + 30 * brightness}
          />
        )}
        {/* Bulb image */}
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
      </Group>
    </BaseElement>
  );
}
