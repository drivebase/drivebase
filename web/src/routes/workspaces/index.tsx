import { SwitchWorkspaceMutation } from "@/features/workspaces/mutations";
import { MyWorkspacesQuery } from "@/features/workspaces/queries";
import { gqlClient } from "@/lib/gql-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { Button, Card, Description, Label, ListBox } from "@heroui/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { useMutation } from "urql";

export const Route = createFileRoute("/workspaces/")({
	loader: async () => {
		const result = await gqlClient.query(MyWorkspacesQuery, {}).toPromise();
		const workspaces = result.data?.myWorkspaces ?? [];
		if (workspaces.length === 0) throw redirect({ to: "/workspaces/create" });
		return { workspaces };
	},
	component: WorkspacesPage,
});

function WorkspacesPage() {
	const { workspaces } = Route.useLoaderData();
	const navigate = useNavigate();
	const setToken = useAuthStore((s) => s.setToken);
	const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
	const [, switchWorkspace] = useMutation(SwitchWorkspaceMutation);
	const [selecting, setSelecting] = useState<string | null>(null);

	async function selectWorkspace(id: string, name: string, slug: string) {
		setSelecting(id);
		const result = await switchWorkspace({ workspaceID: id });

		if (result.error || !result.data) {
			setSelecting(null);
			return;
		}

		setToken(result.data.switchWorkspace.accessToken);
		setWorkspace({ id, name, slug });
		navigate({ to: "/" });
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-8">
			<Card className="w-full max-w-sm">
				<Card.Header>
					<Card.Title>Select a workspace</Card.Title>
					<Card.Description>Choose which workspace you want to open</Card.Description>
				</Card.Header>
				<Card.Content>
					<ListBox
						aria-label="Workspaces"
						selectionMode="single"
						onSelectionChange={(keys) => {
							const id = [...keys][0] as string;
							const ws = workspaces.find((w) => w.id === id);
							if (ws) selectWorkspace(ws.id, ws.name, ws.slug);
						}}
					>
						{workspaces.map((ws) => (
							<ListBox.Item key={ws.id} id={ws.id} textValue={ws.name}>
								<div className="flex items-center justify-center w-8 h-8 rounded-md bg-overlay shrink-0">
									<Building2 size={16} className="text-muted" />
								</div>
								<div className="flex flex-col">
									<Label>{ws.name}</Label>
									<Description>{ws.slug}</Description>
								</div>
								{selecting === ws.id ? (
									<span className="text-xs text-muted ml-auto">Loading…</span>
								) : (
									<ListBox.ItemIndicator />
								)}
							</ListBox.Item>
						))}
					</ListBox>
				</Card.Content>
				<Card.Footer>
					<Button className="w-full" onPress={() => navigate({ to: "/workspaces/create" })}>
						Create a workspace
					</Button>
				</Card.Footer>
			</Card>
		</div>
	);
}
