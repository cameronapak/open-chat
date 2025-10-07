"use client";

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { motion } from "motion/react"
import useMeasure from "react-use-measure"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function AnimatedDrawerContent({
  className,
  children,
  defaultHeight = 400,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  defaultHeight?: number;
}) {
  const [ref, bounds] = useMeasure({
    offsetSize: true,
    scroll: true,
    debounce: 100,
  });

  const [targetHeight, setTargetHeight] = React.useState<number>(defaultHeight);

  // Track last stable height and a debounce timer so we only animate once measurements stabilize.
  const lastHeightRef = React.useRef<number | null>(null);
  const stabilityTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const natural = bounds.height || defaultHeight;
    const viewportMax = Math.floor((typeof window !== "undefined" ? window.innerHeight : 800) * 0.95);
    const clamped = Math.max(0, Math.min(natural, viewportMax));

    // If same as last stable height, apply immediately; otherwise wait briefly for stability
    if (lastHeightRef.current === clamped) {
      setTargetHeight(clamped);
    } else {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
      stabilityTimerRef.current = window.setTimeout(() => {
        setTargetHeight(clamped);
        lastHeightRef.current = clamped;
        stabilityTimerRef.current = null;
      }, 80); // 80ms stability window to avoid nested child animations affecting the drawer
    }
    // Validation logs
    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
    };
  }, [bounds.height, defaultHeight]);

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[90svh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[90svh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        <motion.div
          initial={{ height: '90%' }}
          animate={{ height: `${targetHeight}px` }}
          transition={{
            type: "spring",
            visualDuration: 0.65,
            bounce: 0.4
          }}
          className="w-full overflow-hidden will-change-transform"
        >
          {/* Measured natural content; this element is scrollable when clipped */}
          <div ref={ref} className="max-h-[90svh] overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function useMediaQuery(query: string) {
  const defaultMatches =
    typeof window === "undefined" ? false : window.matchMedia(query).matches

  const [matches, setMatches] = React.useState(defaultMatches)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQueryList = window.matchMedia(query)
    const updateMatch = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(mediaQueryList.matches)
    mediaQueryList.addEventListener("change", updateMatch)

    return () => {
      mediaQueryList.removeEventListener("change", updateMatch)
    }
  }, [query])

  return matches
}

type ResponsiveDialogProps = {
  trigger: React.ReactNode
  desktop: React.ReactNode
  mobile: React.ReactNode
  dialogContentProps?: React.ComponentProps<typeof DialogContent>
  drawerContentProps?: React.ComponentProps<typeof DrawerContent>
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

function ResponsiveDialog({
  trigger,
  desktop,
  mobile,
  dialogContentProps,
  drawerContentProps,
  open,
  defaultOpen,
  onOpenChange,
  modal,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal={modal}
      >
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent {...dialogContentProps}>{desktop}</DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent {...drawerContentProps}>{mobile}</DrawerContent>
    </Drawer>
  )
}

type ProfileFormProps = {
  className?: string
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
}

function ProfileForm({ className, onSubmit }: ProfileFormProps) {
  return (
    <form
      className={cn("grid gap-4 py-4", className)}
      onSubmit={(event) => {
        onSubmit?.(event)
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" defaultValue="Pedro Duarte" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" defaultValue="@peduarte" />
      </div>
      <div className="ml-auto">
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  )
}

function DrawerDialogDemo() {
  const [open, setOpen] = React.useState(false)

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setOpen(false)
    },
    []
  )

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Edit Profile</Button>}
      dialogContentProps={{ className: "sm:max-w-[425px]" }}
      mobile={
        <>
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit profile</DrawerTitle>
            <DrawerDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DrawerDescription>
          </DrawerHeader>
          <ProfileForm className="px-4" onSubmit={handleSubmit} />
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </>
      }
      desktop={
        <>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm onSubmit={handleSubmit} />
        </>
      }
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  AnimatedDrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  ResponsiveDialog,
  DrawerDialogDemo,
}
