import { ProviderType } from "@/gql/graphql";
import { HardDrive, Server } from "lucide-react";

export function ProviderIcon({ type, size = 18 }: { type: ProviderType; size?: number }) {
	if (type === ProviderType.GoogleDrive) {
		return (
			<svg width={size} height={size} viewBox="0 0 87.3 78" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L28.6 49H0c0 1.55.4 3.1 1.2 4.5l5.4 13.35z" fill="#0066DA"/>
				<path d="M43.65 25L29.25 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9 9 0 000 53h28.6l15.05-28z" fill="#00AC47"/>
				<path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H58.7l6.1 11.9 8.75 11.9z" fill="#EA4335"/>
				<path d="M43.65 25L58.05 0c-1.55-.45-3.15-.7-4.8-.7H33.9c-1.65 0-3.25.25-4.8.7L43.65 25z" fill="#00832D"/>
				<path d="M58.7 53H28.6L13.75 76.8c1.55.45 3.15.7 4.8.7h49.8c1.65 0 3.25-.25 4.8-.7L58.7 53z" fill="#2684FC"/>
				<path d="M73.4 26.5L59.55 3.3c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 58.7 53h28.55c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
			</svg>
		);
	}
	if (type === ProviderType.S3) return <Server size={size} className="text-muted" />;
	return <HardDrive size={size} className="text-muted" />;
}
