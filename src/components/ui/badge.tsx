import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Etiqueta de estado con estilos configurables. */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}
