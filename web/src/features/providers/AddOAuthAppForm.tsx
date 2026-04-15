import { type AvailableProvider } from "@/gql/graphql";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, TextField } from "@heroui/react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "urql";
import { z } from "zod";
import { SaveOAuthAppMutation } from "./mutations";

const schema = z.object({
	clientID: z.string().min(1, "Client ID is required"),
	clientSecret: z.string().min(1, "Client secret is required"),
	alias: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function AddOAuthAppForm({
	provider,
	onClose,
	onSaved,
}: {
	provider: AvailableProvider;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [, saveOAuthApp] = useMutation(SaveOAuthAppMutation);
	const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
		resolver: zodResolver(schema),
	});

	async function onSubmit(values: FormValues) {
		const result = await saveOAuthApp({
			input: {
				providerType: provider.type,
				clientID: values.clientID,
				clientSecret: values.clientSecret,
				alias: values.alias || undefined,
			},
		});

		if (result.error || !result.data) {
			setError("root", { message: result.error?.message ?? "Failed to save OAuth app" });
			return;
		}

		onSaved();
	}

	return (
		<form onSubmit={handleSubmit(onSubmit)} className="contents">
			<Modal.Body className="space-y-4">
				<p className="text-xs text-muted">
					Create a {provider.label} OAuth app and paste the credentials below.
				</p>
				{errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

				<Controller
					control={control}
					name="clientID"
					render={({ field }) => (
						<TextField isRequired isInvalid={!!errors.clientID} variant="secondary" className="w-full">
							<Label>Client ID</Label>
							<Input {...field} className="focus:ring-inset" placeholder="your-client-id.apps.googleusercontent.com" />
							<FieldError>{errors.clientID?.message}</FieldError>
						</TextField>
					)}
				/>

				<Controller
					control={control}
					name="clientSecret"
					render={({ field }) => (
						<TextField isRequired isInvalid={!!errors.clientSecret} type="password" variant="secondary" className="w-full">
							<Label>Client Secret</Label>
							<Input {...field} className="focus:ring-inset" placeholder="••••••••" />
							<FieldError>{errors.clientSecret?.message}</FieldError>
						</TextField>
					)}
				/>

				<Controller
					control={control}
					name="alias"
					render={({ field }) => (
						<TextField isInvalid={!!errors.alias} variant="secondary" className="w-full">
							<Label>Alias <span className="text-muted">(optional)</span></Label>
							<Input {...field} className="focus:ring-inset" placeholder="e.g. Work account" />
							<FieldError>{errors.alias?.message}</FieldError>
						</TextField>
					)}
				/>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="ghost" onPress={onClose} type="button">Cancel</Button>
				<Button type="submit" isPending={isSubmitting}>Save OAuth app</Button>
			</Modal.Footer>
		</form>
	);
}
