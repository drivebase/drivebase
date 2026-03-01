import { zodResolver } from "@hookform/resolvers/zod";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiCheck as Check, PiSpinnerGap as Loader2 } from "react-icons/pi";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	setActiveWorkspaceId,
	useCreateWorkspace,
	WORKSPACE_COLORS,
} from "@/features/workspaces";
import { WorkspaceColor } from "@/gql/graphql";

const createWorkspaceSchema = z.object({
	name: z.string().min(1, "Workspace name is required"),
	color: z.nativeEnum(WorkspaceColor),
});

type CreateWorkspaceFormValues = z.infer<typeof createWorkspaceSchema>;

export const Route = createFileRoute("/_workspace/workspaces/create")({
	component: CreateWorkspacePage,
});

function CreateWorkspacePage() {
	const navigate = useNavigate();
	const [{ fetching }, createWorkspace] = useCreateWorkspace();
	const [formError, setFormError] = useState<string | null>(null);

	const form = useForm<CreateWorkspaceFormValues>({
		resolver: zodResolver(createWorkspaceSchema),
		defaultValues: {
			name: "",
			color: WorkspaceColor.Sky,
		},
	});

	const selectedColor = form.watch("color");

	async function onSubmit(values: CreateWorkspaceFormValues) {
		setFormError(null);
		const result = await createWorkspace({ input: values });

		if (result.data?.createWorkspace) {
			setActiveWorkspaceId(result.data.createWorkspace.id);
			window.location.assign("/");
			return;
		}

		if (result.error) {
			setFormError(result.error.message);
		}
	}

	return (
		<div className="w-full max-w-md">
			<Card className="shadow-xl border-border/50">
				<CardContent className="px-8 py-8 min-h-105 flex flex-col">
					<div className="space-y-1.5 mb-6">
						<h1 className="text-2xl font-bold tracking-tight">
							<Trans>Create Workspace</Trans>
						</h1>
						<p className="text-muted-foreground text-sm leading-relaxed">
							<Trans>Set up a new workspace and switch to it.</Trans>
						</p>
					</div>

					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-6 flex-1"
						>
							{formError && (
								<div className="p-3 text-sm font-medium text-destructive bg-destructive/10  border border-destructive/20 text-center">
									{formError}
								</div>
							)}

							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<Trans>Name</Trans>
										</FormLabel>
										<FormControl>
											<Input
												placeholder="Marketing Workspace"
												autoComplete="off"
												{...field}
												className="bg-background h-10"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="color"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<Trans>Accent Color</Trans>
										</FormLabel>
										<FormControl>
											<div className="flex items-center gap-3">
												{WORKSPACE_COLORS.map((color) => {
													const isSelected = selectedColor === color.value;

													return (
														<button
															key={color.value}
															type="button"
															onClick={() => field.onChange(color.value)}
															className={`w-10 h-10  border flex items-center justify-center ${color.className} ${
																isSelected
																	? "ring-2 ring-primary border-primary"
																	: "border-border"
															}`}
														>
															{isSelected ? (
																<Check className="w-4 h-4" />
															) : null}
														</button>
													);
												})}
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="pt-4 space-y-2">
								<Button
									type="submit"
									disabled={fetching}
									className="w-full h-10"
								>
									{fetching ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : null}
									<Trans>Create Workspace</Trans>
								</Button>
								<Button
									type="button"
									variant="outline"
									className="w-full h-10"
									onClick={() => navigate({ to: "/" })}
								>
									<Trans>Cancel</Trans>
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
