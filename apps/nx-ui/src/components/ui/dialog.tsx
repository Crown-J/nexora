'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  draggable = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  /** 顯示頂部拖曳列，可左右／上下移動視窗 */
  draggable?: boolean;
}) {
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const dragState = React.useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  } | null>(null);

  React.useEffect(() => {
    if (!draggable) return;
    const onMove = (e: PointerEvent) => {
      const d = dragState.current;
      if (!d?.active) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      setDragOffset({ x: d.startX + dx, y: d.startY + dy });
    };
    const onUp = () => {
      if (dragState.current) dragState.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [draggable]);

  const onDragHandleDown = (e: React.PointerEvent) => {
    if (!draggable) return;
    e.preventDefault();
    dragState.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: dragOffset.x,
      startY: dragOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        style={
          draggable
            ? {
                transform: `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px))`,
              }
            : undefined
        }
        className={cn(
          'glass-card border-border bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-xl border p-6 shadow-lg duration-200 sm:max-w-[min(92vw,32rem)]',
          draggable ? '' : 'translate-x-[-50%] translate-y-[-50%]',
          draggable && 'pt-0',
          className,
        )}
        {...props}
      >
        {draggable ? (
          <div
            role="separator"
            aria-orientation="horizontal"
            className="border-border/60 -mx-6 -mt-6 mb-2 flex cursor-grab select-none items-center justify-center gap-2 rounded-t-xl border-b bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground active:cursor-grabbing"
            onPointerDown={onDragHandleDown}
          >
            <span aria-hidden className="inline-block h-1 w-8 rounded-full bg-muted-foreground/40" />
            拖曳以移動視窗
            <span aria-hidden className="inline-block h-1 w-8 rounded-full bg-muted-foreground/40" />
          </div>
        ) : null}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
              'ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
              draggable ? 'top-14' : 'top-4',
            )}
          >
            <X className="size-4" />
            <span className="sr-only">關閉</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
