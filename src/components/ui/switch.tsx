"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-0 p-0 shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-foreground/20 dark:data-[state=unchecked]:bg-slate-600/80",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute inset-y-0 start-[2px] my-auto block size-4 rounded-full bg-white shadow-xs ring-0 transition-transform data-[state=unchecked]:translate-x-0 ltr:data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
