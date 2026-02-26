import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	setActiveWorkspaceId,
	useAcceptWorkspaceInvite,
} from "@/features/workspaces";

type JoinWorkspaceSearch = {
	token: string;
};

export const Route = createFileRoute("/join-workspace")({
	validateSearch: (search: Record<string, unknown>): JoinWorkspaceSearch => {
		const token = typeof search.token === "string" ? search.token.trim() : "";
		if (!token) {
			throw new Error("Invite token is required");
		}
		return { token };
	},
	component: JoinWorkspacePage,
});

function JoinWorkspacePage() {
	const { token } = Route.useSearch();
	const navigate = useNavigate();
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const [, acceptInvite] = useAcceptWorkspaceInvite();
	const startedRef = useRef(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isAuthenticated) {
			navigate({
				to: "/login",
				search: {
					redirect: window.location.href,
				},
				replace: true,
			});
			return;
		}

		if (startedRef.current) {
			return;
		}

		startedRef.current = true;

		const run = async () => {
			const result = await acceptInvite({ token });
			if (result.error || !result.data?.acceptWorkspaceInvite) {
				setError(result.error?.message ?? "Failed to join workspace");
				return;
			}

			setActiveWorkspaceId(result.data.acceptWorkspaceInvite.id);
			toast.success(
				`Joined workspace: ${result.data.acceptWorkspaceInvite.name}`,
			);
			navigate({ to: "/files", replace: true });
		};

		void run();
	}, [acceptInvite, isAuthenticated, navigate, token]);

	if (error) {
		return (
			<div className="min-h-screen w-full flex items-center justify-center p-8">
				<div className="max-w-md w-full  border bg-card p-6 space-y-4">
					<h1 className="text-lg font-semibold">
						<Trans>Could not join workspace</Trans>
					</h1>
					<p className="text-sm text-muted-foreground">{error}</p>
					<Button onClick={() => window.location.reload()} className="w-full">
						<Trans>Try again</Trans>
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen w-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
			<Loader2 className="h-4 w-4 animate-spin" />
			<span>
				<Trans>Joining workspace…</Trans>
			</span>
		</div>
	);
}
