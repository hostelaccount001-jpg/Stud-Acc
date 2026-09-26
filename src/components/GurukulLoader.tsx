import React from "react";
import { cn } from "@/lib/utils";

interface GurukulLoaderProps {
  size?: "sm" | "md" | "lg" | "fullscreen";
  text?: string;
  subtext?: string;
  className?: string;
}

export function GurukulLoader({
  size = "md",
  text = "Loading Gurukul ERP...",
  subtext,
  className,
}: GurukulLoaderProps) {
  if (size === "sm") {
    return (
      <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
        <div className="relative size-6 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-[#8b2500]/20 border-t-amber-500 animate-golden-orbit" />
          <img
            src="/logo.png"
            alt="Gurukul"
            className="size-3.5 object-contain animate-logo-blink"
          />
        </div>
        {text && <span className="text-xs font-semibold text-[#4a1c14]">{text}</span>}
      </div>
    );
  }

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-6 space-y-4 select-none",
        className,
      )}
    >
      {/* Outer Rotating Glow Frame with Slow-Blinking Gurukul Logo */}
      <div className="relative flex items-center justify-center">
        {/* Soft Ambient Gold Aura */}
        <div className="absolute size-24 rounded-full bg-amber-500/20 blur-xl animate-pulse pointer-events-none" />

        {/* Dual Rotating Rings */}
        <div className="size-20 rounded-full border-2 border-dashed border-amber-500/40 animate-golden-orbit" />
        <div
          className="absolute size-24 rounded-full border-2 border-[#8b2500]/30 border-t-[#8b2500] animate-golden-orbit"
          style={{ animationDuration: "1.8s", animationDirection: "reverse" }}
        />

        {/* The Gurukul Logo with Slow Blink/Breath Animation */}
        <div className="absolute size-14 rounded-2xl bg-white p-1.5 shadow-xl border border-amber-400/50 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Shree Swaminarayan Gurukul"
            className="size-full object-contain animate-logo-blink"
          />
        </div>
      </div>

      {/* Loading Status Typography */}
      <div className="space-y-1">
        <p className="text-sm font-serif font-bold tracking-wide text-[#4a1c14] flex items-center justify-center gap-1.5">
          <span>{text}</span>
        </p>
        {subtext ? (
          <p className="text-xs text-[#7c533f] font-medium">{subtext}</p>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <span
              className="size-1.5 rounded-full bg-amber-500 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="size-1.5 rounded-full bg-amber-600 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-1.5 rounded-full bg-[#8b2500] animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (size === "fullscreen") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#faf6ef]/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
