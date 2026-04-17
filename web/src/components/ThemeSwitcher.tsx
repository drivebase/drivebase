import { type Theme, useThemeStore } from "@/store/theme";
import { Moon, Sun, SunMoon } from "lucide-react";

const options: { value: Theme; icon: React.ElementType; label: string }[] = [
	{ value: "light", icon: Sun, label: "Light" },
	{ value: "system", icon: SunMoon, label: "System" },
	{ value: "dark", icon: Moon, label: "Dark" },
];

export function ThemeSwitcher() {
	const theme = useThemeStore((s) => s.theme);
	const setTheme = useThemeStore((s) => s.setTheme);

	return (
		<div className="flex items-center gap-0.5 rounded-lg bg-default p-0.5">
			{options.map(({ value, icon: Icon, label }) => (
				<button
					key={value}
					type="button"
					aria-label={label}
					onClick={() => setTheme(value)}
					className={[
						"p-1.5 rounded-md transition-colors",
						theme === value
							? "bg-surface text-foreground shadow-sm"
							: "text-muted hover:text-foreground",
					].join(" ")}
				>
					<Icon size={14} />
				</button>
			))}
		</div>
	);
}
