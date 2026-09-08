import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-5 shadow-card",
        "transition-shadow hover:shadow-lift",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn("text-lg font-semibold tracking-tight", className)} {...props}>
      {children}
    </h2>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <p className={cn("mt-1 text-sm text-muted", className)} {...props}>
      {children}
    </p>
  );
}
