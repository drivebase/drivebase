import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface AuthLayoutProps {
	children: ReactNode;
	title: string;
	description: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
			{/* Abstract Background Shapes */}
			<div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5  blur-3xl opacity-70" />
			<div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5  blur-3xl opacity-70" />

			<div className="z-10 w-full max-w-md px-4">
				{/* Logo Section */}
				<div className="flex flex-col items-center mb-8 gap-3">
					<img
						src="/drivebase.svg"
						alt="Drivebase Logo"
						className="w-14 h-14"
					/>
				</div>

				{/* Main Card */}
				<Card className="border-border/50 shadow-xl shadow-black/5 bg-card/80 backdrop-blur-sm">
					<CardHeader className="space-y-1 text-center pb-8">
						<CardTitle className="text-2xl font-semibold tracking-tight">
							{title}
						</CardTitle>
						<CardDescription className="text-base text-muted-foreground">
							{description}
						</CardDescription>
					</CardHeader>
					<CardContent>{children}</CardContent>
				</Card>

				{/* Footer Links (Terms, etc - Optional) */}
				<div className="mt-8 text-center text-xs text-muted-foreground">
					<p>
						&copy; {new Date().getFullYear()} Drivebase. Secure file storage.
					</p>
				</div>
			</div>
		</div>
	);
}
