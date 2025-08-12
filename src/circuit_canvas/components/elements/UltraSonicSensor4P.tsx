// import React, { useEffect, useState } from "react";
// import { Image, Group, Arc, Circle, Line, Text } from "react-konva";
// import {
//   BaseElement,
//   BaseElementProps,
// } from "@/circuit_canvas/components/core/BaseElement";

// const SENSOR_IMG_WIDTH = 230;
// const SENSOR_IMG_HEIGHT = 130;
// const SENSOR_X = SENSOR_IMG_WIDTH / 2.1; // horizontally centered
// const SENSOR_Y = -25; // sensor face 'y'; adjust based on image
// const EYE_OFFSET_X = 37; // distance left/right from center
// const EYE_RADIUS = 18;
// const RANGE_RADIUS = 153.1; // same as your snip: 153.1cm
// const RANGE_ANGLE = 45; // 45° either side (90° spread)
// const BALL_RADIUS = 8;

// // Define interface for ball coordinates state
// interface BallPosition {
//   x: number;
//   y: number;
// }

// // Extend existing BaseElementProps to add isSimulation
// interface UltraSonicSensor4PProps extends BaseElementProps {
//   isSimulation?: boolean;
//   selected?: boolean;
// }

// export default function UltraSonicSensor4P(props: UltraSonicSensor4PProps) {
//   const [img, setImg] = useState<HTMLImageElement | null>(null);
//   const [ball, setBall] = useState<BallPosition>({
//     x: SENSOR_X,
//     y: SENSOR_Y - 30, // ball starts above sensor
//   });

//   useEffect(() => {
//     const image = new window.Image();
//     image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
//     image.onload = () => setImg(image);
//     image.alt = "UltraSonicSensor4P";
//   }, []);

//   const leftEye = { x: SENSOR_X - EYE_OFFSET_X - 10, y: SENSOR_Y + 40 };
//   const rightEye = { x: SENSOR_X + EYE_OFFSET_X + 10, y: SENSOR_Y + 40 };

//   const dx = ball.x - SENSOR_X;
//   const dy = SENSOR_Y - ball.y; // y axis reversed in konva: up is negative
//   const distance = Math.sqrt(dx * dx + dy * dy);

//   // Angle: 0 = up, positive = right
//   const angleRad = Math.atan2(dx, dy);
//   const angleDeg = angleRad * (180 / Math.PI);

//   const ballInRange =
//     distance >= 18 &&
//     distance <= RANGE_RADIUS &&
//     Math.abs(angleDeg) <= RANGE_ANGLE;

//   const distInch = (distance / 2.54).toFixed(1); // px treated as cm -> in
//   const distCm = distance.toFixed(1);

//   return (
//     <BaseElement {...props}>
//       {img && (
//         <Group>
//           {/* Always show sensor image */}
//           <Image
//             image={img}
//             width={SENSOR_IMG_WIDTH}
//             height={SENSOR_IMG_HEIGHT}
//             shadowColor={props.selected ? "#000000" : undefined}
//             shadowBlur={props.selected ? 6 : 0}
//             shadowOffset={{ x: 15, y: -15 }}
//             shadowOpacity={props.selected ? 2 : 0}
//           />

//           {/* Conditionally render region, ball, lines, and distance only if simulation mode and selected */}
//           {props.isSimulation && props.selected && (
//             <>
//               <Arc
//                 x={SENSOR_X}
//                 y={SENSOR_Y}
//                 innerRadius={25}
//                 outerRadius={RANGE_RADIUS}
//                 angle={RANGE_ANGLE * 2}
//                 rotation={225}
//                 fill={ballInRange ? "rgba(0,255,0,0.3)" : "rgba(255,0,0,0.3)"}
//                 stroke={ballInRange ? "green" : "red"}
//                 strokeWidth={2}
//                 shadowColor={props.selected ? "#000000" : undefined}
//                 shadowBlur={props.selected ? 6 : 0}
//                 shadowOffset={{ x: 15, y: -15 }}
//                 shadowOpacity={props.selected ? 2 : 0}
//               />
//               <Line
//                 points={[leftEye.x, leftEye.y, ball.x, ball.y]}
//                 stroke="#888"
//                 strokeWidth={2}
//                 dash={[8, 8]}
//                 shadowColor={props.selected ? "#000000" : undefined}
//                 shadowBlur={props.selected ? 6 : 0}
//                 shadowOffset={{ x: 15, y: -15 }}
//                 shadowOpacity={props.selected ? 2 : 0}
//               />
//               <Line
//                 points={[rightEye.x, rightEye.y, ball.x, ball.y]}
//                 stroke="#888"
//                 strokeWidth={2}
//                 dash={[8, 8]}
//                 shadowColor={props.selected ? "#000000" : undefined}
//                 shadowBlur={props.selected ? 6 : 0}
//                 shadowOffset={{ x: 15, y: -15 }}
//                 shadowOpacity={props.selected ? 2 : 0}
//               />
//               <Text
//                 x={ball.x - 55}
//                 y={ball.y - BALL_RADIUS - 28}
//                 text={`${distInch}in / ${distCm}cm`}
//                 fontSize={18}
//                 fill="#0684aa"
//                 shadowColor={props.selected ? "#000000" : undefined}
//                 shadowBlur={props.selected ? 6 : 0}
//                 shadowOffset={{ x: 15, y: -15 }}
//                 shadowOpacity={props.selected ? 2 : 0}
//               />
//               <Circle
//                 x={ball.x}
//                 y={ball.y}
//                 radius={BALL_RADIUS}
//                 fill="blue"
//                 draggable
//                 onDragMove={(e) =>
//                   setBall({ x: e.target.x(), y: e.target.y() })
//                 }
//                 shadowColor={props.selected ? "#000000" : undefined}
//                 shadowBlur={props.selected ? 6 : 0}
//                 shadowOffset={{ x: 15, y: -15 }}
//                 shadowOpacity={props.selected ? 2 : 0}
//               />
//             </>
//           )}
//         </Group>
//       )}
//     </BaseElement>
//   );
// }

// V2

import React, { useEffect, useState, useMemo } from "react";
import { Image, Group, Arc, Circle, Line, Text } from "react-konva";
import {
  BaseElement,
  BaseElementProps,
} from "@/circuit_canvas/components/core/BaseElement";
import Konva from "konva";

// Sensor and UI constants
const SENSOR_IMG_WIDTH = 230;
const SENSOR_IMG_HEIGHT = 130;
const SENSOR_X = SENSOR_IMG_WIDTH / 2.1; // Horizontal center
const SENSOR_Y = -25; // Sensor face Y (adjust for your image asset)
const EYE_OFFSET_X = 37; // Offset from center for sensor eyes
const EYE_RADIUS = 18;
const RANGE_RADIUS = 153.1; // Range radius in "cm"
const RANGE_ANGLE = 45; // 45° either side (90° spread)
const BALL_RADIUS = 8;

interface BallPosition {
  x: number;
  y: number;
}

interface UltraSonicSensor4PProps extends BaseElementProps {
  isSimulation?: boolean;
  onDistanceChange?: (distanceCm: number) => void;
}

export default function UltraSonicSensor4P(props: UltraSonicSensor4PProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [ball, setBall] = useState<BallPosition>({
    x: SENSOR_X,
    y: SENSOR_Y - 30, // Start ball above sensor
  });
  const [triggered, setTriggered] = useState(false);
  const [echoTime, setEchoTime] = useState<number | null>(null); // microseconds
  const [unit, setUnit] = useState<"cm" | "in">("cm");

  // Load sensor image
  useEffect(() => {
    const image = new window.Image();
    image.src = "assets/circuit_canvas/elements/UltraSonicSensor4P.svg";
    image.onload = () => setImg(image);
    image.alt = "UltraSonicSensor4P";
  }, []);

  // Calculate sensor eye positions (bottom of eyes)
  const leftEye = { x: SENSOR_X - EYE_OFFSET_X - 10, y: SENSOR_Y + 40 };
  const rightEye = { x: SENSOR_X + EYE_OFFSET_X + 10, y: SENSOR_Y + 40 };

  // Calculate dx, dy to ball, distance
  const dx = ball.x - SENSOR_X;
  const dy = SENSOR_Y - ball.y; // y reversed in Konva
  const distance = useMemo(() => Math.sqrt(dx * dx + dy * dy), [dx, dy]);

  // Compute angle between sensor direction (up) and ball
  const angleRad = useMemo(() => Math.atan2(dx, dy), [dx, dy]);
  const angleDeg = useMemo(() => (angleRad * 180) / Math.PI, [angleRad]);

  // Check if ball is in valid range region (exclude inner radius)
  const ballInRange =
    distance >= EYE_RADIUS &&
    distance <= RANGE_RADIUS &&
    Math.abs(angleDeg) <= RANGE_ANGLE;

  // Notify parent component of distance changes if callback provided
  useEffect(() => {
    if (props.onDistanceChange) {
      props.onDistanceChange(distance);
    }
  }, [distance, props]);

  // Displayed distance in selected unit
  const displayedDistance =
    unit === "cm" ? distance.toFixed(1) : (distance / 2.54).toFixed(1);
  const displayedUnit = unit;

  // Simulate ultrasonic sensor trigger and echo pulses
  const startMeasurement = () => {
    if (triggered) return; // avoid multiple triggers
    setTriggered(true);
    setEchoTime(null);

    const timeForEcho = (distance / 34300) * 2 * 1e6; // microseconds (speed of sound in cm/s)
    // Echo time update with delay simulation (10ms)
    setTimeout(() => {
      setEchoTime(timeForEcho);
      setTriggered(false);
    }, 10);
  };

  // Auto-start measurement on simulation + selected mode
  useEffect(() => {
    if (props.isSimulation && props.selected) {
      const interval = setInterval(() => {
        startMeasurement();
      }, 1000); // Simulate measurement every second
      return () => clearInterval(interval);
    }
  }, [props.isSimulation, props.selected, distance]);

  // Constrain ball movement within sensor range circle
  const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    let x = e.target.x();
    let y = e.target.y();
    const dx = x - SENSOR_X;
    const dy = y - SENSOR_Y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RANGE_RADIUS) {
      const angle = Math.atan2(dy, dx);
      x = SENSOR_X + RANGE_RADIUS * Math.cos(angle);
      y = SENSOR_Y + RANGE_RADIUS * Math.sin(angle);
      e.target.position({ x, y });
      dist = RANGE_RADIUS;
    }
    setBall({ x, y });
  };

  // Keyboard controls for ball movement when selected
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!props.selected) return;

      let dx = 0,
        dy = 0;
      switch (e.key) {
        case "ArrowUp":
          dy = -5;
          break;
        case "ArrowDown":
          dy = 5;
          break;
        case "ArrowLeft":
          dx = -5;
          break;
        case "ArrowRight":
          dx = 5;
          break;
      }

      setBall((prev) => {
        let newX = prev.x + dx;
        let newY = prev.y + dy;

        const dist = Math.sqrt((newX - SENSOR_X) ** 2 + (newY - SENSOR_Y) ** 2);
        if (dist > RANGE_RADIUS) {
          return prev; // prevent out of range
        }
        return { x: newX, y: newY };
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.selected]);

  // Animate echo pulse radius visualization
  const [pulseRadius, setPulseRadius] = useState(0);
  useEffect(() => {
    let animationFrameId: number;
    let start: number | null = null;

    if (triggered) {
      const animate = (time: number) => {
        if (!start) start = time;
        const elapsed = time - start;
        const newRadius = (elapsed / 10) % RANGE_RADIUS;
        setPulseRadius(newRadius);
        animationFrameId = requestAnimationFrame(animate);
      };
      animationFrameId = requestAnimationFrame(animate);
    } else {
      setPulseRadius(0);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [triggered]);

  return (
    <BaseElement {...props}>
      {img && (
        <Group>
          {/* Sensor image */}
          <Image
            image={img}
            width={SENSOR_IMG_WIDTH}
            height={SENSOR_IMG_HEIGHT}
          />

          {/* Show interactive elements only in simulation mode and when selected */}
          {props.isSimulation && props.selected && (
            <>
              {/* Range arc */}
              <Arc
                x={SENSOR_X}
                y={SENSOR_Y}
                innerRadius={EYE_RADIUS}
                outerRadius={RANGE_RADIUS}
                angle={RANGE_ANGLE * 2}
                rotation={225}
                fill={ballInRange ? "rgba(0,255,0,0.3)" : "rgba(255,0,0,0.3)"}
                stroke={ballInRange ? "green" : "red"}
                strokeWidth={2}
              />

              {/* Dashed lines from sensor eyes to ball */}
              <Line
                points={[leftEye.x, leftEye.y, ball.x, ball.y]}
                stroke="#888"
                strokeWidth={2}
                dash={[8, 8]}
              />
              <Line
                points={[rightEye.x, rightEye.y, ball.x, ball.y]}
                stroke="#888"
                strokeWidth={2}
                dash={[8, 8]}
              />

              {/* Distance annotation */}
              <Text
                x={ball.x - 55}
                y={ball.y - BALL_RADIUS - 28}
                text={`${displayedDistance} ${displayedUnit}`}
                fontSize={18}
                fill="#0684aa"
              />

              {/* Draggable ball */}
              <Circle
                x={ball.x}
                y={ball.y}
                radius={BALL_RADIUS}
                fill="blue"
                draggable
                onDragMove={onDragMove}
              />

              {/* Echo pulse circle animation */}
              {triggered && (
                <Circle
                  x={SENSOR_X}
                  y={SENSOR_Y}
                  radius={pulseRadius}
                  stroke="rgba(0,0,255,0.5)"
                  strokeWidth={3}
                />
              )}

              {/* Sensor output data */}
              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 10}
                fontSize={14}
                fill="#555"
                text={`Echo time: ${
                  echoTime ? echoTime.toFixed(0) + " μs" : "N/A"
                }`}
              />
              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 30}
                fontSize={14}
                fill="#555"
                text={`Distance: ${distance.toFixed(1)} cm`}
              />

              {/* Unit toggle button */}
              <Text
                x={10}
                y={SENSOR_IMG_HEIGHT + 60}
                fontSize={14}
                fill="blue"
                text={`Switch to ${unit === "cm" ? "inches" : "cm"}`}
                onClick={() => setUnit(unit === "cm" ? "in" : "cm")}
                style={{ cursor: "pointer" }}
              />

              {/* Out of range warning */}
              {!ballInRange && (
                <Text
                  x={SENSOR_X - 60}
                  y={SENSOR_Y + SENSOR_IMG_HEIGHT + 50}
                  fontSize={16}
                  fill="red"
                  text="Out of range"
                />
              )}
            </>
          )}
        </Group>
      )}
    </BaseElement>
  );
}
