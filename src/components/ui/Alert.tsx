import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info" | "destructive";
  children: ReactNode;
  className?: string;
}

const variantStyles = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  destructive: "bg-red-50 border-red-200 text-red-800",
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-4",
        variantStyles[variant],
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("text-sm", className)}>
      {children}
    </div>
  );
} 