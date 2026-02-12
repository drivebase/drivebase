import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function PreferencesSettings() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Appearance</h3>
				<p className="text-sm text-muted-foreground">
					Customize the appearance of the application. Automatically switch
					between day and night themes.
				</p>
			</div>
			<div className="border-t border-border" />
			<div className="space-y-4">
				<Label className="text-base">Theme</Label>
				<RadioGroup
					defaultValue={theme}
					onValueChange={(value) =>
						setTheme(value as "light" | "dark" | "system")
					}
					className="grid grid-cols-3 gap-4"
				>
					<div>
						<RadioGroupItem value="light" id="light" className="peer sr-only" />
						<Label
							htmlFor="light"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Sun className="mb-3 h-6 w-6" />
							Light
						</Label>
					</div>
					<div>
						<RadioGroupItem value="dark" id="dark" className="peer sr-only" />
						<Label
							htmlFor="dark"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Moon className="mb-3 h-6 w-6" />
							Dark
						</Label>
					</div>
					<div>
						<RadioGroupItem
							value="system"
							id="system"
							className="peer sr-only"
						/>
						<Label
							htmlFor="system"
							className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-card p-4 hover:border-accent transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer"
						>
							<Laptop className="mb-3 h-6 w-6" />
							System
						</Label>
					</div>
				</RadioGroup>
			</div>
		</div>
	);
}
