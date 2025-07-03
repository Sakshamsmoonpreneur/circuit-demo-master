"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

interface LightbulbProps extends BaseElementProps {
  current?: number;
}

export default function Lightbulb(props: LightbulbProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const image = new window.Image();
    console.log(props.current);
    image.src =
      props.current && props.current > 0
        ? "/circuit_elements/bulb-onn.svg"
        : "/circuit_elements/bulb-off.svg";
    image.onload = () => setImg(image);
  }, [props.current]);

  return (
    <BaseElement {...props}>
      {img && <Image image={img} width={40} height={40} />}
    </BaseElement>
  );
}
