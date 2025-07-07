"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Line } from "react-konva";
import Konva from "konva";

interface PotentiometerProps extends BaseElementProps {
  onResistanceChange?: (resistance: number) => void;
  minResistance?: number; // Optional min resistance
  maxResistance?: number; // Optional max resistance
}

export default function Potentiometer(props: PotentiometerProps) {
  const [angle, setAngle] = useState(135); // Start in middle of range
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<Konva.Group>(null);

  const minAngle = 45;
  const maxAngle = 315;
  const centerX = 25;
  const centerY = 25;

  const minResistance = props.minResistance ?? 0; // Default to 0 if not provided
  const maxResistance = props.maxResistance ?? 10000; // Default to 10k

  const resistance = Math.round(
    ((angle - minAngle) / (maxAngle - minAngle)) *
      (maxResistance - minResistance) +
      minResistance
  );

  useEffect(() => {
    props.onResistanceChange?.(resistance);
  }, [resistance]);

  const clampAngle = (deg: number) => {
    if (deg < minAngle && deg > 180) return minAngle;
    if (deg > maxAngle && deg < 360) return maxAngle;
    return Math.max(minAngle, Math.min(maxAngle, deg));
  };

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

    // Only allow values from minAngle to maxAngle
    const withinRange = rawAngle >= minAngle && rawAngle <= maxAngle;

    if (withinRange) {
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
        />

        <Line
          points={[0, 0, 0, -15]} // center to top
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
