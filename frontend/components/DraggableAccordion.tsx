'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { GripHorizontal } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface DraggableAccordionProps {
  title: string
  children: ReactNode
  initialX: number
  initialY: number
  defaultMinimized?: boolean
  panelClassName?: string
  zIndex?: number
}

export default function DraggableAccordion({
  title,
  children,
  initialX,
  initialY,
  defaultMinimized = false,
  panelClassName = '',
  zIndex = 40,
}: DraggableAccordionProps) {
  const itemValue = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: initialX, y: initialY })
  const [openValue, setOpenValue] = useState<string | undefined>(
    defaultMinimized ? undefined : itemValue
  )

  const clampToViewport = (x: number, y: number) => {
    const panel = panelRef.current
    if (!panel || typeof window === 'undefined') return { x, y }

    const width = panel.offsetWidth || 320
    const height = panel.offsetHeight || 120
    const maxX = Math.max(8, window.innerWidth - width - 8)
    const maxY = Math.max(8, window.innerHeight - height - 8)

    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    }
  }

  useEffect(() => {
    const updateOnResize = () => {
      setPosition((prev) => clampToViewport(prev.x, prev.y))
    }

    const timer = window.setTimeout(updateOnResize, 0)
    window.addEventListener('resize', updateOnResize)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', updateOnResize)
    }
  }, [])

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = (event: DragEvent<HTMLButtonElement>) => {
    if (event.clientX <= 0 && event.clientY <= 0) return
    const next = clampToViewport(
      event.clientX - dragOffsetRef.current.x,
      event.clientY - dragOffsetRef.current.y
    )
    setPosition(next)
  }

  return (
    <div
      ref={panelRef}
      className={`absolute pointer-events-auto ${panelClassName}`}
      style={{ left: position.x, top: position.y, zIndex }}
    >
      <div className="rounded-lg bg-slate-900/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm">
        <div className="mb-1 flex items-center gap-2">
          <button
            type="button"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
            aria-label={`Drag ${title}`}
          >
            <GripHorizontal className="h-4 w-4" />
            Drag
          </button>
        </div>
        <Accordion
          type="single"
          collapsible
          value={openValue}
          onValueChange={(value) => setOpenValue(value || undefined)}
        >
          <AccordionItem value={itemValue} className="border-b-0">
            <AccordionTrigger className="py-2 text-white hover:text-white">
              {title}
            </AccordionTrigger>
            <AccordionContent className="pb-1">{children}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
