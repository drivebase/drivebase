import { TrafficLights } from "./TrafficLights";

interface WindowTitleBarProps {
	windowId: string;
	title: string;
	isFocused: boolean;
}

export function WindowTitleBar({
	windowId,
	title,
	isFocused,
}: WindowTitleBarProps) {
	return (
		<div
			className="window-title-bar flex items-center h-11 px-3 border-b border-border/50 select-none shrink-0"
			style={{ cursor: "default" }}
		>
			<TrafficLights windowId={windowId} />
			<span
				className={`flex-1 text-center text-sm font-medium truncate transition-opacity ${
					isFocused ? "opacity-100" : "opacity-50"
				}`}
			>
				{title}
			</span>
			{/* Spacer to balance traffic lights */}
			<div className="w-[52px]" />
		</div>
	);
}
