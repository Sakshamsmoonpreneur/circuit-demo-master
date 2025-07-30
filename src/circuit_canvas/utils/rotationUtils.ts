import { Node, CircuitElement } from "../types/circuit";

/**
 * Rotates a point around the origin (0, 0) by the given angle in degrees
 */
export function rotatePoint(
  x: number,
  y: number,
  angleDegrees: number
): { x: number; y: number } {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

/**
 * Gets the absolute position of a node, taking into account the element's position and rotation
 */
export function getAbsoluteNodePosition(
  node: Node,
  element: CircuitElement
): { x: number; y: number } {
  const rotation = element.rotation || 0;

  // If there's no rotation, return the simple calculation
  if (rotation === 0) {
    return {
      x: element.x + node.x,
      y: element.y + node.y,
    };
  }

  // Rotate the node's local position relative to the element's center
  const rotatedNode = rotatePoint(node.x, node.y, rotation);

  return {
    x: element.x + rotatedNode.x,
    y: element.y + rotatedNode.y,
  };
}

/**
 * Gets the center point of an element based on its bounds
 * This is used as the rotation origin for elements
 */
export function getElementCenter(element: CircuitElement): {
  x: number;
  y: number;
} {
  // For now, we'll use a simple approach where the rotation center is at (0, 0)
  // relative to the element's position. This can be refined per element type if needed.
  return { x: 0, y: 0 };
}
