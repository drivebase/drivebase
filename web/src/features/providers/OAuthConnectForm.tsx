import { type AvailableProvider } from "@/gql/graphql";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, ListBox, Modal, Select, TextField } from "@heroui/react";
import type { Key } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery } from "urql";
import { z } from "zod";
import { AddOAuthAppForm } from "./AddOAuthAppForm";
import { InitiateOAuthMutation } from "./mutations";
import { OAuthAppsQuery } from "./queries";

const schema = z.object({
	appID: z.string().min(1, "Select an OAuth app"),
	name: z.string().min(1, "Display name is required"),
});

type FormValues = z.infer<typeof schema>;

export function OAuthConnectForm({
	provider,
	onClose,
}: {
	provider: AvailableProvider;
	onClose: () => void;
}) {
	const [{ data, fetching }, refetch] = useQuery({ query: OAuthAppsQuery });
	const [, initiateOAuth] = useMutation(InitiateOAuthMutation);
	const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
		resolver: zodResolver(schema),
	});

	const apps = (data?.oauthApps ?? []).filter((a) => a.providerType === provider.type);

	async function onSubmit(values: FormValues) {
		const result = await initiateOAuth({
			oauthAppID: values.appID,
			providerName: values.name,
		});

		if (result.error || !result.data) {
			setError("root", { message: result.error?.message ?? "Failed to initiate OAuth" });
			return;
		}

		window.location.href = result.data.initiateOAuth;
	}

	if (fetching) {
		return (
			<Modal.Body>
				<div className="h-10 rounded-lg bg-default animate-pulse" />
			</Modal.Body>
		);
	}

	if (apps.length === 0) {
		return (
			<AddOAuthAppForm
				provider={provider}
				onClose={onClose}
				onSaved={() => refetch({ requestPolicy: "network-only" })}
			/>
		);
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="contents">
			<Modal.Body className="space-y-4">
				{errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

				<Controller
					control={control}
					name="appID"
					render={({ field }) => (
						<Select
							className="w-full"
							placeholder="Select OAuth app"
							isInvalid={!!errors.appID}
							value={field.value}
							onChange={(key: Key | null) => field.onChange(key ?? "")}
						>
							<Select.Trigger>
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{apps.map((app) => (
										<ListBox.Item key={app.id} id={app.id} textValue={app.alias ?? app.clientID}>
											<div className="flex flex-col">
												<span className="text-sm">{app.alias ?? app.clientID}</span>
												{app.alias && <span className="text-xs text-muted">{app.clientID}</span>}
											</div>
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>
					)}
				/>

				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<TextField isRequired isInvalid={!!errors.name} variant="secondary" className="w-full">
							<Label>Display name</Label>
							<Input {...field} className="focus:ring-inset" placeholder={`My ${provider.label}`} />
							<FieldError>{errors.name?.message}</FieldError>
						</TextField>
					)}
				/>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="ghost" onPress={onClose} type="button">Cancel</Button>
				<Button type="submit" isPending={isSubmitting}>Continue with OAuth</Button>
			</Modal.Footer>
		</form>
	);
}
