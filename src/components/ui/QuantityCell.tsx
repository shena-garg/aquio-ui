'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatQuantity } from '@/lib/uom'

interface QuantityCellProps {
  value: number | undefined | null
  uom: string
}

export function QuantityCell({ value, uom }: QuantityCellProps) {
  const { display, full } = formatQuantity(value, uom)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default whitespace-nowrap">{display}</span>
        </TooltipTrigger>
        <TooltipContent>{full}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}