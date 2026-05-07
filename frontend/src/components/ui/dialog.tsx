"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog as DialogPrimitive } from "radix-ui"
import { XIcon } from "lucide-react"
import { useIsMounted } from "@/hooks/useIsMounted"

import { cn } from "@/lib/utils"

// Create a Context to track the open state for Framer Motion "Snapshot Shielding"
const DialogContext = React.createContext<{ open: boolean }>({ open: false })

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const isMounted = useIsMounted()
  const [internalOpen, setInternalOpen] = React.useState(props.open ?? props.defaultOpen ?? false)
  
  // Sync state during render if controlled (React 18+ best practice)
  // This avoids the "cascading render" warning from useEffect
  if (props.open !== undefined && props.open !== internalOpen) {
    setInternalOpen(props.open)
  }

  const handleOpenChange = (val: boolean) => {
    if (props.open === undefined) {
      setInternalOpen(val)
    }
    props.onOpenChange?.(val)
  }

  // Hydration-safe open state
  const isOpen = isMounted ? (props.open !== undefined ? props.open : internalOpen) : false

  return (
    <DialogContext.Provider value={{ open: isOpen }}>
      <DialogPrimitive.Root 
        data-slot="dialog" 
        {...props} 
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </DialogContext.Provider>
  )
}

const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

function DialogOverlay({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const { open } = React.useContext(DialogContext)
  
  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Overlay asChild forceMount {...props}>
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            data-slot="dialog-overlay"
            className={cn(
              "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
              className
            )}
          />
        </DialogPrimitive.Overlay>
      )}
    </AnimatePresence>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ref,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  open?: boolean
}) {
  const { open } = React.useContext(DialogContext)

  return (
    <DialogPortal forceMount>
      <DialogOverlay />
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              ref={ref}
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              data-slot="dialog-content"
              className={cn(
                "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none",
                className
              )}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close className="absolute right-4 top-4 h-9 w-9 flex items-center justify-center rounded-full opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5">
                  <XIcon className="h-4.5 w-4.5" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          </DialogPrimitive.Content>
        )}
      </AnimatePresence>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ref, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
