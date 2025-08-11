"use client";
import {
    BaseElement,
    BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import { useEffect, useState } from "react";
import { Image } from "react-konva";

export default function UltraSonicSensor4P(props: BaseElementProps) {
    const [img, setImg] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const image = new window.Image();
        image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
        image.onload = () => setImg(image);
        image.alt = "UltraSonicSensor4P";
    }, []);

    return (
        <BaseElement {...props}>
            {img && (
                <Image
                    image={img}
                    width={230}
                    height={130}
                    shadowColor={props.selected ? "#000000" : undefined}
                    shadowBlur={props.selected ? 10 : 0}
                    shadowOffset={{ x: 15, y: -15 }}
                    shadowOpacity={props.selected ? 2 : 0}
                />
            )}
        </BaseElement>
    );
}
