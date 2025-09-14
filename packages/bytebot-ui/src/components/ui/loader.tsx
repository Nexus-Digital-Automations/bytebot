import * as React from "react";
import Image from "next/image";
import { cn } from "../../lib/utils";
import { DEFAULT_LOADER_SIZE_PX } from "../../constants/ui";

interface LoaderProps {
  size?: number;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = DEFAULT_LOADER_SIZE_PX,
  className,
}) => {
  return (
    <Image
      src="/loader.svg"
      alt="Loading..."
      width={size}
      height={size}
      className={cn("animate-spin", className)}
    />
  );
};
