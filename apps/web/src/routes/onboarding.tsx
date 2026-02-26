import { Trans } from "@lingui/react/macro";
import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";

export const Route = createFileRoute("/onboarding")({
	beforeLoad: ({ location }) => {
		const isAuthenticated = useAuthStore.getState().isAuthenticated;
		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}
	},
	component: OnboardingLayout,
});

function OnboardingLayout() {
	const navigate = useNavigate();
	const { token, user, isAuthenticated } = useAuthStore();
	const [meResult] = useMe();

	useEffect(() => {
		if (!isAuthenticated) {
			navigate({ to: "/login", replace: true });
		}
	}, [isAuthenticated, navigate]);

	useEffect(() => {
		if (user?.onboardingCompleted) {
			navigate({ to: "/", replace: true });
		}
	}, [user, navigate]);

	if (token && !user && meResult.fetching) {
		return (
			<div className="min-h-screen w-full flex flex-col items-center justify-center gap-3">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-10 w-10 animate-pulse"
				/>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>
						<Trans>Loading...</Trans>
					</span>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="min-h-screen w-full flex flex-col items-center justify-center gap-3">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-10 w-10 animate-pulse"
				/>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>
						<Trans>Redirecting to login...</Trans>
					</span>
				</div>
			</div>
		);
	}

	// If we have a user but onboarding is completed, we are redirecting.
	// Render loader to prevent flashing onboarding content.
	if (user?.onboardingCompleted) {
		return (
			<div className="min-h-screen w-full flex flex-col items-center justify-center gap-3">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-10 w-10 animate-pulse"
				/>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					<span>
						<Trans>Redirecting to dashboard...</Trans>
					</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen w-full flex items-center justify-center p-4"
			style={{
				background:
					"radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.07), transparent)",
			}}
		>
			<Outlet />
		</div>
	);
}
