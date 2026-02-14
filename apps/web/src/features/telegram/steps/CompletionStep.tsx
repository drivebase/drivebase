import { Check, Loader2 } from "lucide-react";

export function CompletionStep() {
	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
			<div className="flex flex-col items-center text-center gap-4 py-4">
				<div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
					<Check className="w-7 h-7 text-primary" />
				</div>
				<div className="space-y-1.5">
					<h2 className="text-2xl font-bold tracking-tight">Connected!</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Your Telegram account has been successfully connected.
						Redirecting...
					</p>
				</div>
				<Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
			</div>
		</div>
	);
}
