"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HelpTooltipProps {
  content: string;
  className?: string;
  /** Max width of the tooltip bubble in px. Defaults to 220. */
  maxWidth?: number;
  side?: "top" | "bottom" | "left" | "right";
}

export function HelpTooltip({
  content,
  className,
  maxWidth = 220,
  side = "top",
}: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none",
            className
          )}
          tabIndex={-1}
          aria-label="Help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        style={{ maxWidth }}
        className="text-center leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
