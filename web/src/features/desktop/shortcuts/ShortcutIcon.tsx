import { useState } from "react";
import { eventBus } from "@/lib/event-bus";
import type { ShortcutDefinition } from "./shortcut-registry";
import type { LaunchSourceRect } from "../window-animation";

interface ShortcutIconProps {
	shortcut: ShortcutDefinition;
}

export function ShortcutIcon({ shortcut }: ShortcutIconProps) {
	const [selected, setSelected] = useState(false);
	const Icon = shortcut.icon;

	return (
		<button
			type="button"
			data-context-type="shortcut"
			data-context-data={JSON.stringify({ id: shortcut.id, label: shortcut.label })}
			onClick={() => setSelected(true)}
			onDoubleClick={(event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				const launchSourceRect: LaunchSourceRect = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height,
				};
				shortcut.onOpen({ launchSourceRect });
				eventBus.emit("desktop:shortcut-activated", {
					shortcutId: shortcut.id,
					launchSourceRect,
				});
			}}
			onBlur={() => setSelected(false)}
			className="flex flex-col items-center gap-1.5 p-2 rounded-lg outline-none"
		>
			<div
				className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors ${
					selected
						? "bg-white/20 border-white/40"
						: "bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30"
				}`}
			>
				<Icon size={28} className="text-white" />
			</div>
			<span className="text-xs text-white font-medium drop-shadow text-center leading-tight">
				{shortcut.label}
			</span>
			{shortcut.subtitle && (
				<span className="text-[10px] text-white/60 text-center leading-tight">
					{shortcut.subtitle}
				</span>
			)}
		</button>
	);
}
