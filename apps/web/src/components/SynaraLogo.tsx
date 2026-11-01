// FILE: QuantumLogo.tsx
// Purpose: Render the official Glass logo mark across the web interface with theme awareness.
// Layer: Shared app branding primitive

import type { ImgHTMLAttributes } from "react";
import { cn } from "~/lib/utils";

export function QuantumLogo({
  className,
  variant = "mark",
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { readonly variant?: "mark" | "lockup" }) {
  const ariaLabel = props["aria-label"] ?? "Glass logo";

  if (variant === "lockup") {
    return (
      <div className={cn("inline-flex items-center shrink-0", className)}>
        <img
          src="/quantum-lockup-dark.png"
          alt={ariaLabel}
          aria-label={ariaLabel}
          className="hidden dark:block h-full w-auto object-contain"
        />
        <img
          src="/quantum-lockup-light.png"
          alt={ariaLabel}
          aria-label={ariaLabel}
          className="block dark:hidden h-full w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <img
      src="/quantum.png"
      alt={ariaLabel}
      aria-label={ariaLabel}
      {...props}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
