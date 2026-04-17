import { ChevronRight } from "lucide-react";

interface BreadcrumbProps {
	segments: string[];
	onNavigate?: (index: number) => void;
}

export function Breadcrumb({ segments, onNavigate }: BreadcrumbProps) {
	return (
		<div className="flex items-center gap-1 px-5 py-3 text-xs">
			{segments.map((segment, i) => {
				const isLast = i === segments.length - 1;
				return (
					<span key={segment} className="flex items-center gap-1">
						{i > 0 && <ChevronRight size={12} className="text-muted-foreground" />}
						<button
							type="button"
							onClick={() => onNavigate?.(i)}
							className={`uppercase tracking-wider transition-colors ${
								isLast ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
							}`}
						>
							{segment}
						</button>
					</span>
				);
			})}
		</div>
	);
}
