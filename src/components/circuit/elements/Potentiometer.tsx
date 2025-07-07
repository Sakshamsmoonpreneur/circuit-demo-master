"use client";
import {
  BaseElement,
  BaseElementProps,
} from "@/components/circuit/core/BaseElement";
import { useState, useEffect } from "react";
import { Circle, Group, Line } from "react-konva";

interface PotentiometerProps extends BaseElementProps {
  onResistanceChange?: (resistance: number) => void;
}

export default function Potentiometer(props: PotentiometerProps) {
  const [angle, setAngle] = useState(135); // initial knob angle
  const [isDragging, setIsDragging] = useState(false);

  const minAngle = 45;
  const maxAngle = 315;
  const centerX = 25;
  const centerY = 25;

  const resistance = Math.round(
    ((angle - minAngle) / (maxAngle - minAngle)) * 10000
  );

  useEffect(() => {
    props.onResistanceChange?.(resistance);
  }, [resistance]);

  const clamp = (a: number) => Math.max(minAngle, Math.min(maxAngle, a));

  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const dx = pointer.x - (props.x ?? 0) - centerX;
    const dy = pointer.y - (props.y ?? 0) - centerY;

    // Calculate angle from center to pointer
    let rawAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (rawAngle < 0) rawAngle += 360;

    // Accept only angles within the allowed range (45–315)
    const inRange = rawAngle >= minAngle && rawAngle <= maxAngle;

    if (inRange) {
      setAngle(rawAngle);
    }
  };

  return (
    <BaseElement {...props}>
      <Group
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
      >
        {/* Potentiometer base */}
        <Circle
          x={centerX}
          y={centerY}
          radius={24}
          fill="#e0e0e0"
          stroke="black"
          strokeWidth={2}
        />

        {/* Center knob pointer (corrected) */}
        <Line
          points={[0, 0, 0, -15]} // from center upward
          stroke="black"
          strokeWidth={4}
          lineCap="round"
          x={centerX}
          y={centerY}
          rotation={angle}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
        />
      </Group>
    </BaseElement>
  );
}
