import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";

export const Route = createFileRoute("/_authenticated")({
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
	component: AuthenticatedLayout,
});

function FullScreenBrandLoader() {
	return (
		<div className="min-h-screen w-full flex flex-col items-center justify-center gap-5">
			<img
				src="/drivebase.svg"
				alt="Drivebase"
				className="h-16 w-16 animate-pulse"
			/>
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="h-4 w-4 animate-spin" />
				<span>Loading your account...</span>
			</div>
		</div>
	);
}

function ServerUnavailable({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="min-h-screen w-full flex items-center justify-center p-8">
			<div className="max-w-md w-full rounded-2xl border bg-card p-6 text-center space-y-4">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-12 w-12 mx-auto"
				/>
				<div className="space-y-2">
					<h2 className="text-xl font-semibold">Server Unreachable</h2>
					<p className="text-sm text-muted-foreground">
						Unable to connect to the API right now. Check the server and try
						again.
					</p>
				</div>
				<div className="flex items-center justify-center gap-2 text-destructive text-sm">
					<AlertTriangle className="h-4 w-4" />
					<span>Connection failed</span>
				</div>
				<Button onClick={onRetry} className="w-full">
					Retry
				</Button>
			</div>
		</div>
	);
}

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const { token, user, isAuthenticated, logout } = useAuthStore();
	const [meResult, reexecuteMe] = useMe();
	const hasNetworkError = Boolean(meResult.error?.networkError);

	useEffect(() => {
		// Token exists but backend says no user/session; force logout and redirect.
		if (
			isAuthenticated &&
			!meResult.fetching &&
			!meResult.error &&
			meResult.data?.me == null
		) {
			logout();
			navigate({
				to: "/login",
				replace: true,
			});
		}
	}, [
		isAuthenticated,
		meResult.fetching,
		meResult.error,
		meResult.data,
		logout,
		navigate,
	]);

	useEffect(() => {
		// Redirect to onboarding if not completed
		if (user && !user.onboardingCompleted) {
			navigate({
				to: "/onboarding",
				search: { connected: undefined },
				replace: true,
			});
		}
	}, [user, navigate]);

	if (token && !user && meResult.fetching) {
		return <FullScreenBrandLoader />;
	}

	if (token && !user && meResult.error && hasNetworkError) {
		return (
			<ServerUnavailable
				onRetry={() => reexecuteMe({ requestPolicy: "network-only" })}
			/>
		);
	}

	// If we have a user but onboarding is not completed, we are redirecting.
	// Render loader to prevent flashing dashboard content.
	if (user && !user.onboardingCompleted) {
		return <FullScreenBrandLoader />;
	}

	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	);
}
