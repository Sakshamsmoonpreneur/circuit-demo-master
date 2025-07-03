"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface LightbulbProps extends BaseElementProps { isLitOn?: boolean; }

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = props.isLitOn
      ? "/circuit_elements/bulb-onn.svg"
      : "/circuit_elements/bulb-off.svg";
    image.onload = () => setImg(image);
  }, [props.isLitOn]);

  return (
    <BaseElement {...props}>
      {img && <Image image={img} width={40} height={40} />}
    </BaseElement>
  );
}
