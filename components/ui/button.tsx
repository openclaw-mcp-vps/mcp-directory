import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const styles: Record<ButtonVariant, string> = {
  default:
    "bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:bg-cyan-800 disabled:text-slate-300 border border-cyan-300/40",
  outline: "bg-transparent text-slate-100 border border-slate-700 hover:border-cyan-300/50 hover:text-cyan-200",
  ghost: "bg-transparent text-slate-200 hover:bg-slate-800/70"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    />
  );
});
