import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "default" | "primary" | "secondary";
}

export function Spinner({ className, size = "md", variant = "default", ...props }: SpinnerProps) {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
    };

    const variantClasses = {
        default: "text-muted-foreground",
        primary: "text-primary",
        secondary: "text-secondary",
    };

    return (
        <div className={cn("flex justify-center items-center", className)} {...props}>
            <Loader2
                className={cn(
                    "animate-spin",
                    sizeClasses[size],
                    variantClasses[variant]
                )}
            />
            <span className="sr-only">Loading...</span>
        </div>
    );
}
