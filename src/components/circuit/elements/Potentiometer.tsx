"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Line } from "react-konva";
import Konva from "konva";

interface PotentiometerProps extends BaseElementProps {
  resistance?: number; // Total resistance between ends A and B
  ratio?: number; // Wiper position from 0 to 1
  onRatioChange?: (ratio: number) => void; // Called when user moves the knob
}

export default function Potentiometer(props: PotentiometerProps) {
  const [angle, setAngle] = useState(135); // Initial angle
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<Konva.Group>(null);

  const minAngle = 45;
  const maxAngle = 315;
  const centerX = 25;
  const centerY = 25;

  const clampAngle = (deg: number) => {
    if (deg < minAngle && deg > 180) return minAngle;
    if (deg > maxAngle && deg < 360) return maxAngle;
    return Math.max(minAngle, Math.min(maxAngle, deg));
  };

  const ratioFromAngle = (ang: number) =>
    (ang - minAngle) / (maxAngle - minAngle);

  const angleFromRatio = (ratio: number) =>
    clampAngle(ratio * (maxAngle - minAngle) + minAngle);

  useEffect(() => {
    if (typeof props.ratio === "number") {
      setAngle(angleFromRatio(props.ratio));
    }
  }, [props.ratio]);

  useEffect(() => {
    const ratio = ratioFromAngle(angle);
    props.onRatioChange?.(ratio);
  }, [angle]);

  const handlePointerMove = (e: any) => {
    if (!isDragging || !groupRef.current) return;

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    const absPos = groupRef.current.getAbsolutePosition();
    if (!pointer || !absPos) return;

    const dx = pointer.x - (absPos.x + centerX);
    const dy = pointer.y - (absPos.y + centerY);

    let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (rawAngle < 0) rawAngle += 360;

    if (rawAngle >= minAngle && rawAngle <= maxAngle) {
      setAngle(clampAngle(rawAngle));
    }
  };

  return (
    <BaseElement {...props}>
      <Group
        ref={groupRef}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
      >
        <Circle
          x={centerX}
          y={centerY}
          radius={24}
          fill="#e0e0e0"
          stroke="black"
          strokeWidth={2}
          shadowColor={props.selected ? "blue" : undefined}
          shadowBlur={props.selected ? 15 : 0}
          shadowOffset={{ x: 0, y: 0 }}
          shadowOpacity={props.selected ? 0.6 : 0}
        />

        <Line
          points={[0, 0, 0, -15]} // handle
          stroke="black"
          strokeWidth={4}
          hitStrokeWidth={10}
          lineCap="round"
          x={centerX}
          y={centerY}
          rotation={angle}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            setIsDragging(true);
          }}
          onTouchStart={(e) => {
            e.cancelBubble = true;
            setIsDragging(true);
          }}
        />
      </Group>
    </BaseElement>
  );
}
