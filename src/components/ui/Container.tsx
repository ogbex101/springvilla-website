import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props<T extends ElementType> = { as?: T; size?: "default" | "wide" | "narrow" } & ComponentPropsWithoutRef<T>;

export function Container<T extends ElementType = "div">({ as, size = "default", className, ...rest }: Props<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-gutter",
        size === "default" && "max-w-[1440px]",
        size === "wide" && "max-w-[1680px]",
        size === "narrow" && "max-w-[880px]",
        className,
      )}
      {...rest}
    />
  );
}
