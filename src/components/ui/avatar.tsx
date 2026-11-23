import { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { initialsOf } from "./variants";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-soft font-display font-bold text-brand-ink",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-[0.625rem]",
        sm: "h-8 w-8 text-caption",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-lg",
        xl: "h-20 w-20 text-2xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type AvatarProps = VariantProps<typeof avatarVariants> & {
  src?: string | null;
  /** Used for the alt text and the initials fallback. */
  name?: string | null;
  /** Hide from assistive tech when the surrounding control already names the person. */
  decorative?: boolean;
  className?: string;
};


/** Photo with an initials fallback when there is no image or it fails to load. */
export function Avatar({ src, name, size, decorative = false, className }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span className={cn(avatarVariants({ size }), className)} aria-hidden={decorative || undefined}>
      {showImage ? (
        <img
          src={src as string}
          alt={name ? `${name}` : ""}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src as string)}
        />
      ) : (
        <span aria-hidden={name ? undefined : true} aria-label={name || undefined} role={name ? "img" : undefined}>
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
