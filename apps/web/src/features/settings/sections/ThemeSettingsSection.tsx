import { Trans } from "@lingui/react/macro";
import {
	PiLaptop as Laptop,
	PiMoon as Moon,
	PiSun as Sun,
} from "react-icons/pi";
import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function ThemeSettingsSection() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Personalization</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Control how Drivebase looks and feels for your account.</Trans>
				</p>
			</div>

			<div className="flex items-center justify-between gap-6">
				<div className="space-y-1">
					<Label className="text-base">
						<Trans>Theme</Trans>
					</Label>
					<p className="text-sm text-muted-foreground">
						<Trans>Choose light, dark, or system theme.</Trans>
					</p>
				</div>
				<Select
					value={theme}
					onValueChange={(value) =>
						setTheme(value as "light" | "dark" | "system")
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="light">
							<span className="flex items-center gap-2">
								<Sun className="h-4 w-4" />
								<Trans>Light</Trans>
							</span>
						</SelectItem>
						<SelectItem value="dark">
							<span className="flex items-center gap-2">
								<Moon className="h-4 w-4" />
								<Trans>Dark</Trans>
							</span>
						</SelectItem>
						<SelectItem value="system">
							<span className="flex items-center gap-2">
								<Laptop className="h-4 w-4" />
								<Trans>System</Trans>
							</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
