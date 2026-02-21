import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen bg-background overflow-hidden">
			<aside className="shrink-0 h-full">
				<Sidebar />
			</aside>
			<div className="flex-1 flex flex-col min-w-0 h-full">
				<Header />
				<main className="flex-1 overflow-y-auto min-h-0 pt-4">{children}</main>
			</div>
			<aside className="shrink-0 h-full border-l">
				<RightPanel />
			</aside>
		</div>
	);
}
