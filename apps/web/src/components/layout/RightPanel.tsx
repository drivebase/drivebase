import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { Settings2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RecentActivityView } from "@/components/layout/RecentActivityView";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

function DefaultView() {
	const user = useAuthStore((state) => state.user);
	const navigate = useNavigate();

	if (!user) return null;

	const userName = user.name?.trim() || user.email.split("@")[0];
	const userInitial = userName.charAt(0).toUpperCase();

	return (
		<>
			<div className="flex flex-col items-center gap-4 px-4">
				<div className="relative">
					<Avatar className="w-24 h-24 border-4 border-background">
						<AvatarImage src={`https://ui-avatars.com/api/?name=${userName}`} />
						<AvatarFallback>{userInitial}</AvatarFallback>
					</Avatar>
				</div>
				<div className="text-center">
					<h2 className="text-xl font-bold text-foreground">{userName}</h2>
					<p className="text-sm text-muted-foreground">{user.email}</p>
				</div>
				<Button
					className="w-full"
					size="lg"
					variant={"outline"}
					onClick={() => navigate({ to: "/settings" })}
				>
					<Settings2 size={16} className="mr-2" />
					<Trans>My Account</Trans>
				</Button>
			</div>

			<Separator />
			<RecentActivityView />
		</>
	);
}

export function RightPanel() {
	const user = useAuthStore((state) => state.user);
	const content = useRightPanelStore((state) => state.content);
	const clearContent = useRightPanelStore((state) => state.clearContent);

	if (!user) return null;

	return (
		<div className="w-80 py-6 flex flex-col gap-8 shrink-0 relative">
			{content ? (
				<div className="relative px-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={clearContent}
						className="h-8 w-8 absolute right-4"
					>
						<X className="h-4 w-4" />
						<span className="sr-only">
							<Trans>Close panel</Trans>
						</span>
					</Button>
					<div className="flex-1 overflow-y-auto">{content}</div>
				</div>
			) : (
				<DefaultView />
			)}
		</div>
	);
}
