'use client';

import dynamic from "next/dynamic";

const CircuitCanvas = dynamic(() => import('@/components/circuit_canvas/core/CircuitCanvas'), {
  ssr: false,
});


export default function Page() {
  return <CircuitCanvas />;
}
