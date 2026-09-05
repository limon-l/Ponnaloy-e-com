"use client";

import { type ReactNode, Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface StaggerGridProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerGrid({
  children,
  className,
  staggerDelay = 30,
}: StaggerGridProps) {
  const childArray = Children.toArray(children);

  return (
    <div className={cn("grid", className)}>
      {childArray.map((child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child as React.ReactElement<any>, {
            key: (child as any).key || index,
            className: cn(
              (child.props as any).className,
              "animate-slide-up"
            ),
            style: {
              ...(child.props as any).style,
              animationDelay: `${index * staggerDelay}ms`,
              animationFillMode: "both",
            },
          });
        }
        return child;
      })}
    </div>
  );
}
