"use client";

import { useRef, type MouseEvent } from "react";

export default function Background({ children }: { children: React.ReactNode }) {
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (glowRef.current) {
      glowRef.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="font-sans relative min-h-screen bg-[#050505] text-white"
    >
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          ref={glowRef}
          className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full blur-[80px] transition-transform duration-75 ease-out bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
          style={{ transform: "translate(-500px, -500px)" }}
        />
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] rounded-full blur-[120px] force-animate-blob bg-blue-600/25" />
        <div className="absolute bottom-[5%] right-[10%] w-[450px] h-[450px] rounded-full blur-[120px] force-animate-blob force-delay bg-indigo-600/25" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>
      {children}
    </div>
  );
}
