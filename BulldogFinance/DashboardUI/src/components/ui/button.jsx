import * as React from "react"
import { Slot } from "radix-ui"

import Spinner from "@/components/ui/Spinner.jsx"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/buttonVariants.js"

function Button({
  children,
  className,
  variant = "default",
  size = "default",
  asChild = false,
  disabled,
  loading = false,
  loadingText,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"
  const isDisabled = disabled || loading
  const spinnerClassName = cn(
    "h-4 w-4",
    (variant === "default" || variant === "destructive") &&
      "border-white/40 border-t-white"
  )

  return (
    <Comp
      data-slot="button"
      data-loading={loading ? "true" : undefined}
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading ? <Spinner className={spinnerClassName} /> : null}
      {loading ? (loadingText || children) : children}
    </Comp>
  );
}

export { Button }
