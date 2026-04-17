import { useDesktop } from "./hooks/use-desktop";

interface TrafficLightsProps {
	windowId: string;
}

export function TrafficLights({ windowId }: TrafficLightsProps) {
	const { closeApp, minimizeApp, maximizeApp } = useDesktop();

	return (
		<div className="flex items-center gap-2 group" onMouseDown={(e) => e.stopPropagation()}>
			<button
				type="button"
				onClick={() => closeApp(windowId)}
				className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 flex items-center justify-center transition-colors"
				aria-label="Close"
			>
				<svg className="w-2 h-2 text-[#4a0002] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M3 3l6 6M9 3l-6 6" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => minimizeApp(windowId)}
				className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 flex items-center justify-center transition-colors"
				aria-label="Minimize"
			>
				<svg className="w-2 h-2 text-[#995700] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M2 6h8" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => maximizeApp(windowId)}
				className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 flex items-center justify-center transition-colors"
				aria-label="Maximize"
			>
				<svg className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
					<path d="M2 3v7h7M10 9V2H3" />
				</svg>
			</button>
		</div>
	);
}
