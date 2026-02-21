import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "urql";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { OAUTH_PROVIDER_CREDENTIALS_QUERY } from "@/features/providers/api/provider";
import {
	AuthType,
	type AvailableProvider,
	type ProviderType,
} from "@/gql/graphql";

interface ConnectProviderDialogProps {
	provider: AvailableProvider;
	isOpen: boolean;
	onClose: () => void;
	onConnect: (data: {
		displayName?: string;
		config?: Record<string, unknown>;
		oauthCredentialId?: string;
	}) => Promise<void>;
	isConnecting: boolean;
}

export function ConnectProviderDialog({
	provider,
	isOpen,
	onClose,
	onConnect,
	isConnecting,
}: ConnectProviderDialogProps) {
	const isOAuthProvider = provider.authType === AuthType.Oauth;
	const [mode, setMode] = useState<"new" | "existing">("new");
	const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
	const [selectionError, setSelectionError] = useState<string | null>(null);

	const identifierFieldLabel = useMemo(() => {
		const identifierField = provider.configFields.find(
			(field) => field.isIdentifier,
		);
		return identifierField?.label ?? "Identifier";
	}, [provider.configFields]);

	const [{ data: credentialsData, fetching: credentialsFetching }] = useQuery({
		query: OAUTH_PROVIDER_CREDENTIALS_QUERY,
		variables: { type: provider.id.toUpperCase() as ProviderType },
		pause: !isOpen || !isOAuthProvider,
	});

	const existingCredentials = credentialsData?.oauthProviderCredentials ?? [];
	const selectedCredentialLabel = useMemo(() => {
		if (!selectedCredentialId) return "";
		const selected = existingCredentials.find(
			(credential) => credential.id === selectedCredentialId,
		);
		return selected?.identifierValue ?? "";
	}, [existingCredentials, selectedCredentialId]);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm();

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		setMode("new");
		setSelectedCredentialId("");
		setSelectionError(null);
		reset();
	}, [isOpen, reset]);

	const submit = handleSubmit(async (formData) => {
		const displayName = (formData._displayName as string) || provider.name;

		if (isOAuthProvider && mode === "existing") {
			if (!selectedCredentialId) {
				setSelectionError(`Please select an existing ${identifierFieldLabel}`);
				return;
			}

			setSelectionError(null);
			await onConnect({
				displayName,
				oauthCredentialId: selectedCredentialId,
			});
			return;
		}

		const config: Record<string, unknown> = {};
		for (const field of provider.configFields) {
			config[field.name] = formData[field.name];
		}

		await onConnect({
			displayName,
			config,
		});
	});

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Connect {provider.name}</DialogTitle>
					<DialogDescription>
						{isOAuthProvider
							? `Add new credentials or use existing ${identifierFieldLabel} for ${provider.name}.`
							: `Enter the configuration details for ${provider.name}.`}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					{isOAuthProvider && (
						<div className="grid grid-cols-2 gap-2  border p-1">
							<Button
								type="button"
								variant={mode === "new" ? "default" : "ghost"}
								onClick={() => {
									setMode("new");
									setSelectionError(null);
								}}
								disabled={isConnecting}
							>
								New
							</Button>
							<Button
								type="button"
								variant={mode === "existing" ? "default" : "ghost"}
								onClick={() => {
									setMode("existing");
									setSelectionError(null);
								}}
								disabled={isConnecting}
							>
								Existing
							</Button>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="_displayName">Display Name</Label>
						<Input
							id="_displayName"
							placeholder={`My ${provider.name}`}
							{...register("_displayName", { required: true })}
						/>
						{errors._displayName && (
							<span className="text-xs text-red-500">
								This field is required
							</span>
						)}
					</div>

					{isOAuthProvider && mode === "existing" ? (
						<div className="space-y-2">
							<Label>{identifierFieldLabel}</Label>
							<Select
								value={selectedCredentialId}
								onValueChange={setSelectedCredentialId}
								disabled={isConnecting || credentialsFetching}
							>
								<SelectTrigger className="w-full max-w-full min-w-0 overflow-hidden">
									<SelectValue
										placeholder={
											credentialsFetching
												? "Loading..."
												: `Select ${identifierFieldLabel}`
										}
									>
										{selectedCredentialLabel ? (
											<span
												className="block max-w-[300px] truncate"
												title={selectedCredentialLabel}
											>
												{selectedCredentialLabel}
											</span>
										) : undefined}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{existingCredentials.map((credential) => (
										<SelectItem key={credential.id} value={credential.id}>
											<span
												className="block max-w-full truncate pr-5"
												title={credential.identifierValue}
											>
												{credential.identifierValue}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{!credentialsFetching && existingCredentials.length === 0 && (
								<p className="text-xs text-muted-foreground">
									No existing credentials found. Use the New tab to add one.
								</p>
							)}
							{selectionError && (
								<span className="text-xs text-red-500">{selectionError}</span>
							)}
						</div>
					) : (
						provider.configFields.map((field) => (
							<div key={field.name} className="space-y-2">
								<Label htmlFor={field.name}>
									{field.label}
									{field.required && (
										<span className="text-red-500 ml-1">*</span>
									)}
								</Label>
								<Input
									id={field.name}
									type={field.type === "password" ? "password" : "text"}
									placeholder={field.placeholder || ""}
									{...register(field.name, { required: field.required })}
								/>
								{errors[field.name] && (
									<span className="text-xs text-red-500">
										This field is required
									</span>
								)}
								{field.description && (
									<p className="text-xs text-muted-foreground">
										{field.description}
									</p>
								)}
							</div>
						))
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isConnecting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isConnecting}>
							{isConnecting && (
								<Loader2 className="animate-spin h-4 w-4 mr-2" />
							)}
							{isOAuthProvider ? "Connect & Authorize" : "Connect"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
