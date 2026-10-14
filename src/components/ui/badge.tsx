import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        outline: "border-border bg-card text-muted-foreground",
        open: "border-transparent bg-warn-soft text-warn",
        issued: "border-transparent bg-accent text-accent-foreground",
        closed: "border-transparent bg-ok-soft text-ok",
        cancelled: "border-transparent bg-muted text-muted-foreground",
        store: "border-transparent bg-secondary text-secondary-foreground",
        danger: "border-transparent bg-danger-soft text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
