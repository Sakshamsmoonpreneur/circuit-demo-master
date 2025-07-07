"use client";
import React from "react";
import { ELEMENT_PALETTE } from "@/common/data/elements-api";

export default function Palette() {
  return (
    <div className="w-[100%] h-1/2 overflow-y-auto bg-blue-300 border-l border-b-blue-700 shadow-lg p-4">
      {/* <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center gap-2">
                ⚡ Circuit Elements
            </h2> */}

      <div className="flex flex-col gap-4">
        {ELEMENT_PALETTE.map((el) => (
          <div
            key={el.type}
            className="cursor-grab active:cursor-grabbing flex items-center gap-3 p-3 rounded-lg border border-b-blue-950 shadow-sm hover:shadow-blue-950 transition-all duration-200"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                "application/element-type",
                JSON.stringify(el)
              );
            }}
          >
            <img
              src={el.iconPath}
              alt={el.label}
              className="w-10 h-10 object-contain"
            />
            <span className="font-bold text-gray-800">{el.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
