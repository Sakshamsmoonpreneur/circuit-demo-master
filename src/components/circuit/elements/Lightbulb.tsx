import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Group, Circle, Image } from "react-konva";

interface LightbulbProps extends BaseElementProps {
  current?: number;
}

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/bulb-off.svg"; // Always use the "off" bulb
    image.onload = () => setImg(image);
  }, []);

  // Normalize brightness between 0 and 1
  // const brightness = Math.min(1, (props.current ?? 0) / 1.5); // Adjust denominator for how quickly it maxes out
  const brightness = Math.round((props.current ?? 0) / 2); // Adjust denominator for how quickly it maxes out
  console.log('brightness' + brightness)
  return (
    <BaseElement {...props}>
      <Group>
        {/* Glow layer */}
        {brightness > 0 && (
          <Circle
            x={20}
            y={20}
            radius={20 + 10 * brightness}
            fill="yellow"
            opacity={0.2 + 0.4 * brightness}
            shadowBlur={10 + 30 * brightness}
          />
        )}

        {/* Bulb image */}
        {img && <Image image={img} width={40} height={40} />}
      </Group>
    </BaseElement>
  );
}
