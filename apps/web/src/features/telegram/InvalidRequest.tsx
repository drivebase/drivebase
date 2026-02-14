import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function InvalidRequest() {
	const navigate = useNavigate();

	return (
		<div
			className="min-h-screen w-full flex items-center justify-center p-4"
			style={{
				background:
					"radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.07), transparent)",
			}}
		>
			<div className="w-full max-w-md text-center space-y-4">
				<img
					src="/drivebase.svg"
					alt="Drivebase"
					className="h-10 w-10 mx-auto"
				/>
				<h2 className="text-xl font-bold">Invalid Connection Request</h2>
				<p className="text-sm text-muted-foreground">
					Missing required parameters. Please start the connection from the
					Providers page.
				</p>
				<Button onClick={() => navigate({ to: "/providers" })}>
					Go to Providers
				</Button>
			</div>
		</div>
	);
}
