"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "success";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] border border-transparent",
  outline:
    "bg-transparent text-[var(--foreground)] border border-[var(--border)] hover:bg-white/5",
  ghost: "bg-transparent text-[var(--foreground)] border border-transparent hover:bg-white/10",
  success:
    "bg-[var(--success)] text-black border border-transparent hover:brightness-95"
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
