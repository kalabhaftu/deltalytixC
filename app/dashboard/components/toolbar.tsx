"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { Pencil, Trash2, LayoutGrid, RotateCcw } from "lucide-react"
import { ShareButton } from "./share-button"
import { AddWidgetSheet } from "./add-widget-sheet"
import FilterLeftPane from "./filters/filter-left-pane"
import { WidgetType, WidgetSize } from "../types/dashboard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useState, useEffect, useRef } from "react"
import { FilterDropdown } from "./filters/filter-dropdown"
import { useToolbarSettingsStore } from "@/store/toolbar-settings-store"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface ToolbarProps {
  onAddWidget: (type: WidgetType, size?: WidgetSize) => void
  isCustomizing: boolean
  onEditToggle: () => void
  currentLayout: {
    desktop: any[]
    mobile: any[]
  }
  onRemoveAll: () => void
  onAutoArrange?: () => void
  onReset?: () => void
}

export function Toolbar({
  onAddWidget,
  isCustomizing,
  onEditToggle,
  currentLayout,
  onRemoveAll,
  onAutoArrange,
  onReset
}: ToolbarProps) {
  const { isMobile } = useData()
  const { settings, setAutoHide, setFixedPosition } = useToolbarSettingsStore()
  
  // Handle auto-hide toggle with proper state management
  const handleAutoHideToggle = () => {
    const newValue = !settings.autoHide
    console.log('Toggling auto-hide from', settings.autoHide, 'to', newValue)
    setAutoHide(newValue)
    
    // Show toast notification
    toast.success(
      newValue ? "Loading..." : "Loading...",
      {
        duration: 2000,
      }
    )
  }
  
  // Handle fixed position toggle
  const handleFixedPositionToggle = () => {
    const newValue = !settings.fixedPosition
    setFixedPosition(newValue)
    
    // Show toast notification
    toast.success(
      newValue ? "Loading..." : "Loading...",
      {
        duration: 2000,
      }
    )
  }
  
  // Check if consent banner is visible
  const [isConsentVisible, setIsConsentVisible] = useState(false)
  
  // Auto-hide functionality
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(!settings.autoHide) // Start hidden if auto-hide is enabled
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasConsentBanner = document.body.hasAttribute('data-consent-banner')
      setIsConsentVisible(hasConsentBanner)
    })
    
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['data-consent-banner'] 
    })
    
    // Initial check
    setIsConsentVisible(document.body.hasAttribute('data-consent-banner'))
    
    return () => observer.disconnect()
  }, [])
  
  // Measure toolbar height
  useEffect(() => {
    if (toolbarRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setToolbarHeight(entry.contentRect.height)
        }
      })
      
      resizeObserver.observe(toolbarRef.current)
      
      return () => resizeObserver.disconnect()
    }
  }, [])
  
  // Handle auto-hide functionality
  useEffect(() => {
    if (!settings.autoHide) {
      setIsVisible(true)
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
      return
    }
    
    if (isHovered) {
      setIsVisible(true)
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
        autoHideTimeoutRef.current = null
      }
    } else {
      autoHideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false)
      }, settings.autoHideDelay)
    }
    
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current)
      }
    }
  }, [isHovered, settings.autoHide, settings.autoHideDelay])
  
  // Show toolbar when mouse moves near it
  useEffect(() => {
    if (!settings.autoHide) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const mouseY = e.clientY
      const mouseX = e.clientX
      const threshold = settings.showThreshold
      
      // Check if mouse is near bottom edge
      const shouldShow = mouseY > viewportHeight - threshold
      
      // Also check if mouse is near the toolbar area horizontally
      const toolbarCenterX = viewportWidth / 2
      const toolbarWidth = 400 // Approximate toolbar width
      const horizontalThreshold = toolbarWidth / 2 + 50
      const inHorizontalRange = Math.abs(mouseX - toolbarCenterX) < horizontalThreshold
      
      if (shouldShow && inHorizontalRange) {
        setIsVisible(true)
        setIsHovered(true)
      } else {
        setIsHovered(false)
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [settings.autoHide, settings.showThreshold])
  
  // Animation variants
  const toolbarVariants = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.4
      }
    },
    hidden: {
      opacity: 1,
      y: Math.max(toolbarHeight - 4, 0),
      scale: 0.95,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        duration: 0.4
      }
    }
  }

  const buttonVariants = {
    hover: { 
      scale: 1.05, 
      transition: { duration: 0.2 } 
    },
    tap: { 
      scale: 0.95, 
      transition: { duration: 0.1 } 
    }
  }
  
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <motion.div
          ref={toolbarRef}
          className={cn(
            "inset-x-0 mx-auto z-[9999] w-fit",
            settings.fixedPosition ? "fixed" : "relative",
            settings.fixedPosition && (isConsentVisible ? "bottom-36 sm:bottom-20" : "bottom-6")
          )}
          style={{ 
            transform: 'translateZ(0)',
            willChange: 'transform, opacity'
          }}
          variants={toolbarVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Enhanced gradient strip overlay for hidden state */}
          {!isVisible && (
            <motion.div 
              className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent h-6 rounded-t-2xl pointer-events-none backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          <motion.div 
            className="flex items-center justify-center gap-3 p-3 bg-background/98 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-background/20 relative ring-1 ring-white/10"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <Button
                variant={isCustomizing ? "default" : "ghost"}
                onClick={onEditToggle}
                className={cn(
                  "h-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium",
                  isMobile ? "w-10 p-0" : "min-w-[100px] gap-2 px-4",
                  isCustomizing ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" : "hover:bg-accent/80 hover:shadow-md"
                )}
              >
                <Pencil className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  isCustomizing && "text-background"
                )} />
                {!isMobile && (
                  <span className="text-sm font-medium">
                    {isCustomizing ? "Done" : "Edit"}
                  </span>
                )}
              </Button>
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <ShareButton currentLayout={currentLayout} />
            </motion.div>

            <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
              <AddWidgetSheet onAddWidget={onAddWidget} isCustomizing={isCustomizing} />
            </motion.div>

            {isMobile ? (
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <FilterLeftPane />
              </motion.div>
            ) : (
              <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                <FilterDropdown />
              </motion.div>
            )}
            
            {isCustomizing && onAutoArrange && (
              <motion.div 
                variants={buttonVariants} 
                whileHover="hover" 
                whileTap="tap"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="outline"
                  onClick={onAutoArrange}
                  className={cn(
                    "h-10 rounded-xl flex items-center justify-center transition-all duration-200 border-border/50 hover:bg-accent/80 hover:shadow-md hover:border-accent",
                    isMobile ? "w-10 p-0" : "min-w-[110px] gap-2 px-4"
                  )}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  {!isMobile && (
                    <span className="text-sm font-medium">
                      Auto Arrange
                    </span>
                  )}
                </Button>
              </motion.div>
            )}

            {isCustomizing && onReset && (
              <motion.div 
                variants={buttonVariants} 
                whileHover="hover" 
                whileTap="tap"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Button
                  variant="outline"
                  onClick={onReset}
                  className={cn(
                    "h-10 rounded-xl flex items-center justify-center transition-all duration-200 border-border/50 hover:bg-accent/80 hover:shadow-md hover:border-accent",
                    isMobile ? "w-10 p-0" : "min-w-[100px] gap-2 px-4"
                  )}
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                  {!isMobile && (
                    <span className="text-sm font-medium">
                      Reset
                    </span>
                  )}
                </Button>
              </motion.div>
            )}
            
            {isCustomizing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: 0.2 }}
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <motion.div variants={buttonVariants} whileHover="hover" whileTap="tap">
                      <Button
                        variant="destructive"
                        className="h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 bg-gradient-to-r from-destructive to-destructive/80 hover:shadow-lg hover:shadow-destructive/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Layout</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will reset all widgets to their default positions and sizes. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="hover:bg-accent/80 transition-colors duration-200">{"Cancel"}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onRemoveAll}
                        className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground hover:shadow-lg hover:shadow-destructive/20 transition-all duration-200"
                      >
                        Reset Layout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-52 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
        <ContextMenuItem 
          onClick={handleAutoHideToggle}
          className="hover:bg-accent/80 transition-colors duration-200"
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
              settings.autoHide ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-muted-foreground hover:border-primary/50"
            )}>
              {settings.autoHide && (
                <motion.div 
                  className="w-2 h-2 bg-background rounded-sm" 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </div>
            <span className="text-sm font-medium">{"Auto Hide"}</span>
          </div>
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={handleFixedPositionToggle}
          className="hover:bg-accent/80 transition-colors duration-200"
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
              settings.fixedPosition ? "bg-primary border-primary shadow-lg shadow-primary/20" : "border-muted-foreground hover:border-primary/50"
            )}>
              {settings.fixedPosition && (
                <motion.div 
                  className="w-2 h-2 bg-background rounded-sm" 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </div>
            <span className="text-sm font-medium">{"Fixed Position"}</span>
          </div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}