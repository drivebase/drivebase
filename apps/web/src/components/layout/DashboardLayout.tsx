import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			id="dashboard-layout"
			className="flex h-screen bg-background overflow-hidden relative"
			style={{
				backgroundImage: "var(--app-background-image)",
				backgroundAttachment: "fixed",
			}}
		>
			<aside className="shrink-0 h-full">
				<Sidebar />
			</aside>

			<div className="flex-1 flex flex-col min-w-0 h-full">
				<Header />
				<main className="flex-1 overflow-y-auto min-h-0 bg-background/30 backdrop-blur-3xl">
					{children}
				</main>
			</div>

			<aside className="shrink-0 h-full border-l hidden xl:block bg-background/50 backdrop-blur-2xl">
				<RightPanel />
			</aside>
		</div>
	);
}
