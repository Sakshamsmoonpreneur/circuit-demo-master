import { CircuitElement } from "@/circuit_canvas/types/circuit";
import React from "react";
import { FaRotateLeft, FaRotateRight } from "react-icons/fa6";

interface Props {
    selectedElement: CircuitElement | null;
    setElements: React.Dispatch<React.SetStateAction<CircuitElement[]>>;
    pushToHistory: () => void;
    stopSimulation: () => void;
}

/**
 * ElementRotationButtons component renders two buttons:
 * - Rotate left (counterclockwise by 30 degrees)
 * - Rotate right (clockwise by 30 degrees)
 *
 * It disables the buttons if no element or if the selected element is a wire.
 */
const ElementRotationButtons: React.FC<Props> = ({
    selectedElement,
    setElements,
    pushToHistory,
    stopSimulation,
}) => {
    const rotateElement = (direction: "left" | "right") => {
        if (!selectedElement || selectedElement.type === "wire") return;

        pushToHistory();

        setElements((prev) =>
            prev.map((el) =>
                el.id === selectedElement.id
                    ? {
                        ...el,
                        rotation:
                            direction === "right"
                                ? ((el.rotation || 0) + 30) % 360
                                : ((el.rotation || 0) - 30 + 360) % 360,
                    }
                    : el
            )
        );

        stopSimulation();
    };

    return (
        <div className="flex flex-row items-center gap-2">
            <button
                className="px-2 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-lg text-black text-sm cursor-pointer flex items-center justify-center hover:shadow-blue-400 hover:scale-105"
                onClick={() => rotateElement("left")}
                disabled={!selectedElement || selectedElement.type === "wire"}
                title="Rotate Left"
                aria-label="Rotate Left"
            >
                <FaRotateLeft />
            </button>
            <button
                className="px-2 py-1 bg-[#F4F5F6] rounded-sm border-2 border-gray-300 shadow-lg text-black text-sm cursor-pointer flex items-center justify-center hover:shadow-blue-400 hover:scale-105"
                onClick={() => rotateElement("right")}
                disabled={!selectedElement || selectedElement.type === "wire"}
                title="Rotate Right"
                aria-label="Rotate Right"
            >
                <FaRotateRight />
            </button>
        </div>
    );
};

export default ElementRotationButtons;
