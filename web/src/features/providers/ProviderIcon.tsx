import { ProviderType } from "@/gql/graphql";
import { PROVIDER_ICON_CLASSES } from "./provider-icons";
import { cn } from "@/lib/utils";

interface ProviderIconProps {
  type: ProviderType;
  size?: number;
  className?: string;
}

export function ProviderIcon({ type, size = 20, className }: ProviderIconProps) {
  const iconClass = PROVIDER_ICON_CLASSES[type];

  return (
    <span
      className={cn(iconClass, "shrink-0", className)}
      style={{ width: size, height: size, display: "inline-block" }}
    />
  );
}
