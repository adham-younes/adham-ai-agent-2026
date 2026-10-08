import * as React from "react"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "./button"

/*
 * InputGroup — composes an input with addons (icons, text, buttons) on either side.
 * Uses the same inset aesthetic as a regular input, but the group container takes
 * the shadow so all children sit "inside" the recessed surface.
 */

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group/input-group flex flex-wrap items-stretch w-full rounded-lg overflow-hidden",
        "bg-input border border-border [box-shadow:var(--shadow-inset)]",
        "transition-[border-color,box-shadow] duration-150",
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40",
        className
      )}
      {...props}
    />
  )
)
InputGroup.displayName = "InputGroup"

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { side?: "left" | "right"; align?: "inline-start" | "inline-end" | "block-start" | "block-end" }
>(({ className, side = "left", align, ...props }, ref) => (
  <div
    ref={ref}
    data-align={align}
    className={cn(
      "flex items-center px-3 text-sm text-muted-foreground bg-muted/30",
      align?.startsWith("block") ? "w-full border-0 bg-transparent py-2" : side === "left" ? "border-r border-border" : "border-l border-border",
      align === "block-start" && "order-first",
      align === "block-end" && "order-last",
      className
    )}
    {...props}
  />
))
InputGroupAddon.displayName = "InputGroupAddon"

const InputGroupInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 flex-1 min-w-0 bg-transparent px-3 py-1.5 text-sm text-foreground",
      "placeholder:text-muted-foreground",
      "outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
InputGroupInput.displayName = "InputGroupInput"

type InputGroupButtonProps = Omit<ButtonProps, "size"> & { size?: "xs" | "sm" | "icon-xs" | "icon-sm" }
const InputGroupButton = React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  ({ className, size = "xs", ...props }, ref) => <Button ref={ref} size={size === "xs" ? "sm" : size} className={cn(size === "xs" && "h-6 px-2 text-xs", className)} {...props} />
)
InputGroupButton.displayName = "InputGroupButton"
const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn("min-h-20 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
)
InputGroupTextarea.displayName = "InputGroupTextarea"

export { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton, InputGroupTextarea }
