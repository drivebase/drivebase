import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { Rss, Settings2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRecentUpdates } from "@/shared/hooks/useRecentUpdates";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

function DefaultAccountView() {
	const user = useAuthStore((state) => state.user);
	const navigate = useNavigate();
	const { posts, isLoading } = useRecentUpdates();

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

			<div className="flex-1 overflow-y-auto">
				<div className="flex items-center justify-between mb-4 px-4">
					<h3 className="font-semibold flex items-center gap-2">
						<Rss size={18} />
						<Trans>Recent Updates</Trans>
					</h3>
				</div>
				<div className="space-y-3">
					{isLoading &&
						Array.from({ length: 3 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: skeleton items have no stable id
							<div key={i} className="space-y-2 py-1">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-3 w-4/5" />
								<Skeleton className="h-3 w-1/3" />
							</div>
						))}
					{!isLoading && posts.length === 0 && (
						<div className="text-sm text-muted-foreground text-center py-8">
							<Trans>No updates yet</Trans>
						</div>
					)}
					{posts.map((post) => (
						<a
							key={post.url}
							href={post.url}
							target="_blank"
							rel="noreferrer noopener"
							className="block  p-3 hover:bg-muted transition-colors px-4"
						>
							<p className="text-sm font-medium leading-snug line-clamp-2">
								{post.title}
							</p>
							{post.description && (
								<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
									{post.description}
								</p>
							)}
							<p className="text-xs text-muted-foreground mt-2">
								{new Date(post.date).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</p>
						</a>
					))}
				</div>
			</div>
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
				<DefaultAccountView />
			)}
		</div>
	);
}
