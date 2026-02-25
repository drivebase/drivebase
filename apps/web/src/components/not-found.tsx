import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

export function NotFound() {
	return (
		<div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background">
			{/* Card Wrapper (anchor for lines) */}
			<div className="relative z-10">
				{/* Lines */}
				<div className="pointer-events-none absolute inset-0">
					{/* top horizontal */}
					<div className="absolute left-1/2 -top-px h-px w-[200vw] -translate-x-1/2 bg-border/70" />

					{/* bottom horizontal */}
					<div className="absolute left-1/2 -bottom-px h-px w-[200vw] -translate-x-1/2 bg-border/70" />

					{/* left vertical */}
					<div className="absolute -left-px top-1/2 w-px h-[200vh] -translate-y-1/2 bg-border/70" />

					{/* right vertical */}
					<div className="absolute -right-px top-1/2 w-px h-[200vh] -translate-y-1/2 bg-border/70" />
				</div>

				{/* Card */}
				<div className="relative max-w-md w-md border bg-card p-6 text-center space-y-4 shadow-sm">
					<img
						src="/drivebase-light.svg"
						alt="Drivebase"
						className="h-12 w-12 mx-auto"
					/>

					<div className="space-y-2">
						<h1 className="text-xl font-semibold">404</h1>
						<p className="text-sm text-muted-foreground">
							The page you are looking for does not exist.
						</p>

						<Link to="/" className="inline-block mt-6">
							<Button>Go Home</Button>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
