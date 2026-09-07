import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80",
        outline: "text-foreground border",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-sm hover:bg-warning/80",
        info:
          "border-transparent bg-info text-info-foreground shadow-sm hover:bg-info/80",
      },
      size: {
        sm: "h-5 px-1.5 text-2xs gap-0.5",
        default: "h-6 px-2.5 text-xs gap-1",
        lg: "h-7 px-3 text-xs gap-1",
        icon: "h-5 w-5 p-0 justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants, type BadgeProps }
