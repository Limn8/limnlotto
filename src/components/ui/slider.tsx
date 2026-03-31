"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-stone-200">
        <SliderPrimitive.Range className="absolute h-full bg-orange-500" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-5 rounded-full border-2 border-orange-500 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
