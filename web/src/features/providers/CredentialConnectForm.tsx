import { FieldType, type AvailableProvider } from "@/gql/graphql";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FieldError, Input, Label, Modal, TextField } from "@heroui/react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "urql";
import { z } from "zod";
import { ConnectProviderMutation } from "./mutations";

function buildSchema(provider: AvailableProvider) {
	const shape: Record<string, z.ZodTypeAny> = {
		name: z.string().min(1, "Display name is required"),
	};
	for (const field of provider.fields ?? []) {
		shape[field.name] = field.required
			? z.string().min(1, `${field.label} is required`)
			: z.string().optional();
	}
	return z.object(shape);
}

export function CredentialConnectForm({
	provider,
	onClose,
	onConnected,
}: {
	provider: AvailableProvider;
	onClose: () => void;
	onConnected: () => void;
}) {
	const schema = useMemo(() => buildSchema(provider), [provider]);
	const [, connectProvider] = useMutation(ConnectProviderMutation);
	const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
		resolver: zodResolver(schema),
	});

	async function onSubmit(values: Record<string, string>) {
		const credentials: Record<string, string | boolean> = {};
		for (const field of provider.fields ?? []) {
			credentials[field.name] = field.type === FieldType.Boolean
				? values[field.name] === "true"
				: values[field.name] ?? "";
		}

		const result = await connectProvider({
			input: {
				name: values.name,
				type: provider.type,
				credentials: JSON.stringify(credentials),
			},
		});

		if (result.error || !result.data) {
			setError("root", { message: result.error?.message ?? "Failed to connect provider" });
			return;
		}

		onConnected();
	}

	return (
		<form onSubmit={handleSubmit(onSubmit as any)} className="contents">
			<Modal.Body className="space-y-4 pt-2">
				{errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

				<Controller
					control={control}
					name="name"
					render={({ field }) => (
						<TextField isRequired isInvalid={!!errors.name} variant="secondary" className="w-full">
							<Label>Display name</Label>
							<Input {...field} value={field.value as string ?? ""} className="focus:ring-inset" placeholder={`My ${provider.label}`} />
							<FieldError>{(errors.name as any)?.message}</FieldError>
						</TextField>
					)}
				/>

				{(provider.fields ?? []).map((field) => (
					<Controller
						key={field.name}
						control={control}
						name={field.name}
						render={({ fieldState, field: f }) => (
							<TextField
								isRequired={field.required}
								isInvalid={!!fieldState.error}
								type={field.secret ? "password" : field.type === FieldType.Url ? "url" : "text"}
								variant="secondary"
								className="w-full"
							>
								<Label>{field.label}</Label>
								<Input {...f} value={f.value as string ?? ""} className="focus:ring-inset" placeholder={field.placeholder ?? ""} />
								{field.description && (
									<p className="text-xs text-muted mt-1">{field.description}</p>
								)}
								<FieldError>{fieldState.error?.message}</FieldError>
							</TextField>
						)}
					/>
				))}
			</Modal.Body>
			<Modal.Footer>
				<Button variant="ghost" onPress={onClose} type="button">Cancel</Button>
				<Button type="submit" isPending={isSubmitting}>Connect</Button>
			</Modal.Footer>
		</form>
	);
}
