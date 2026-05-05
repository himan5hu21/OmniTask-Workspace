"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useIsMounted } from "@/hooks/useIsMounted"

// Create a Context to track the open state for Framer Motion "Snapshot Shielding"
const AlertDialogContext = React.createContext<{ open: boolean }>({ open: false })

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
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
    <AlertDialogContext.Provider value={{ open: isOpen }}>
      <AlertDialogPrimitive.Root 
        data-slot="alert-dialog" 
        {...props} 
        open={isOpen}
        onOpenChange={handleOpenChange}
      />
    </AlertDialogContext.Provider>
  )
}

const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

function AlertDialogOverlay({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  const { open } = React.useContext(AlertDialogContext)
  
  return (
    <AnimatePresence>
      {open && (
        <AlertDialogPrimitive.Overlay asChild forceMount {...props}>
          <motion.div
            ref={ref}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            data-slot="alert-dialog-overlay"
            className={cn(
              "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
              className
            )}
          />
        </AlertDialogPrimitive.Overlay>
      )}
    </AnimatePresence>
  )
}

function AlertDialogContent({
  className,
  children,
  size = "default",
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm"
  open?: boolean
}) {
  const { open } = React.useContext(AlertDialogContext)

  return (
    <AlertDialogPortal forceMount>
      <AlertDialogOverlay />
      <AnimatePresence>
        {open && (
          <AlertDialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              ref={ref}
              initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-50%" }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              data-slot="alert-dialog-content"
              data-size={size}
              className={cn(
                "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full gap-4 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm",
                className
              )}
            >
              {children}
              <AlertDialogPrimitive.Cancel className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
                <X />
                <span className="sr-only">Close</span>
              </AlertDialogPrimitive.Cancel>
            </motion.div>
          </AlertDialogPrimitive.Content>
        )}
      </AnimatePresence>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogMedia({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      data-slot="alert-dialog-title"
      className={cn(
        "font-heading text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ref,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Action
        data-slot="alert-dialog-action"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <Button variant={variant} size={size} asChild>
      <AlertDialogPrimitive.Cancel
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        {...props}
      />
    </Button>
  )
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
