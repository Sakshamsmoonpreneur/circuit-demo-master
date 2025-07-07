"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface BatteryProps extends BaseElementProps {}

export default function Battery(props: BatteryProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    image.src = "/circuit_elements/battery.svg";
    image.onload = () => setImg(image);
  }, []);

  return (
    <BaseElement {...props}>
      {img && <Image image={img} width={40} height={40} />}
    </BaseElement>
  );
}
