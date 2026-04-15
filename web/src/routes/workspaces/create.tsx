import { CreateWorkspaceMutation, SwitchWorkspaceMutation } from "@/features/workspaces/mutations";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import {
	Alert,
	Button,
	Card,
	FieldError,
	Form,
	InputGroup,
	Label,
	TextField,
} from "@heroui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "urql";

export const Route = createFileRoute("/workspaces/create")({
	component: CreateWorkspacePage,
});

function CreateWorkspacePage() {
	const navigate = useNavigate();
	const setToken = useAuthStore((s) => s.setToken);
	const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
	const [, createWorkspace] = useMutation(CreateWorkspaceMutation);
	const [, switchWorkspace] = useMutation(SwitchWorkspaceMutation);

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	function generateSlug(name: string) {
		const base = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
		const hash = Math.floor(1000 + Math.random() * 9000);
		return `${base}-${hash}`;
	}

	async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const data = Object.fromEntries(new FormData(e.currentTarget));
		const name = data.name as string;
		const slug = generateSlug(name);

		const result = await createWorkspace({ input: { name, slug } });

		if (result.error || !result.data) {
			setError(result.error?.message ?? "Failed to create workspace");
			setLoading(false);
			return;
		}

		const ws = result.data.createWorkspace;
		const switched = await switchWorkspace({ workspaceID: ws.id });

		if (switched.error || !switched.data) {
			navigate({ to: "/workspaces" });
			return;
		}

		setToken(switched.data.switchWorkspace.accessToken);
		setWorkspace({ id: ws.id, name: ws.name, slug: ws.slug });
		navigate({ to: "/" });
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-8">
			<Card className="w-full max-w-sm">
				<Card.Header>
					<Card.Title>Create a workspace</Card.Title>
					<Card.Description>Set up a new workspace to get started</Card.Description>
				</Card.Header>
				<Card.Content className="space-y-4">
					{error && (
						<Alert status="danger">
							<Alert.Indicator />
							<Alert.Content>
								<Alert.Title>{error}</Alert.Title>
							</Alert.Content>
						</Alert>
					)}
					<Form id="create-workspace" onSubmit={onSubmit}>
						<TextField
							isRequired
							name="name"
							type="text"
							variant="secondary"
							className="w-full"
							validate={(v) => (v.trim().length < 2 ? "Name must be at least 2 characters" : null)}
						>
							<Label>Name</Label>
							<InputGroup>
								<InputGroup.Input placeholder="My Workspace" autoComplete="off" />
							</InputGroup>
							<FieldError />
						</TextField>
					</Form>
				</Card.Content>
				<Card.Footer className="flex gap-2">
					<Button
						variant="secondary"
						className="flex-1"
						onPress={() => navigate({ to: "/workspaces" })}
						isDisabled={loading}
					>
						Back
					</Button>
					<Button type="submit" form="create-workspace" className="flex-1" isPending={loading}>
						Create
					</Button>
				</Card.Footer>
			</Card>
		</div>
	);
}
