import { Cloud } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProviderIconProps {
	type: string;
	className?: string;
}

export function ProviderIcon({ type, className }: ProviderIconProps) {
	const [error, setError] = useState(false);

	// Construct path based on ID (e.g., "google_drive" -> "/assets/providers/google_drive.svg")
	const normalizedId = type.toLowerCase();
	const logoPath = `/assets/providers/${normalizedId}.svg`;

	if (!error) {
		return (
			<img
				src={logoPath}
				alt={type}
				className={cn("object-contain", className)}
				onError={() => setError(true)}
			/>
		);
	}

	return <Cloud className={cn("text-gray-400", className)} />;
}
