import { useSignOut } from "@/features/auth/hooks";
import { useAuthStore } from "@/store/auth";
import { LogOut } from "lucide-react";

export function UserProfile() {
	const user = useAuthStore((s) => s.user);
	const { submit: signOut, fetching } = useSignOut();

	if (!user) return null;

	const initials = user.name
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<div className="flex items-center gap-2 px-2 py-2">
			<div className="w-10 h-10 rounded-full bg-default flex items-center justify-center shrink-0 text-sm font-semibold text-foreground">
				{initials}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-foreground truncate">{user.name}</p>
				<p className="text-xs text-muted truncate">{user.email}</p>
			</div>
			<button
				type="button"
				onClick={() => signOut()}
				disabled={fetching}
				className="text-muted hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
				aria-label="Sign out"
			>
				<LogOut size={16} />
			</button>
		</div>
	);
}
