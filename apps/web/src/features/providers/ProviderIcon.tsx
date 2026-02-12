import { Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProviderIconProps {
	type: string;
	className?: string;
}

const PROVIDER_LOGOS: Record<string, string> = {
	googledrive: "/assets/providers/google-drive.svg",
	s3: "/assets/providers/s3.svg",
	local: "/assets/providers/local.svg",
};

export function ProviderIcon({ type, className }: ProviderIconProps) {
	// Normalize: "GOOGLE_DRIVE" or "google-drive" both become "googledrive"
	const normalizedType = type.toLowerCase().replace(/[-_]/g, "");
	const logoPath = PROVIDER_LOGOS[normalizedType];

	if (logoPath) {
		return (
			<img
				src={logoPath}
				alt={type}
				className={cn("object-contain", className)}
			/>
		);
	}

	return <Cloud className={cn("text-gray-400", className)} />;
}
