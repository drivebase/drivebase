import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { graphql } from "@/gql";

const AVAILABLE_PROVIDERS_QUERY = graphql(`
	query GetAvailableProviders {
		availableProviders {
			id
			name
			description
			authType
			configFields {
				name
				label
				type
				required
				description
				placeholder
			}
		}
	}
`);

const CONNECT_STORAGE_MUTATION = graphql(`
	mutation ConnectStorage($input: ConnectStorageInput!) {
		connectStorage(input: $input) {
			id
			name
			isActive
		}
	}
`);

const INITIATE_OAUTH_MUTATION = graphql(`
	mutation InitiateProviderOAuth($id: ID!) {
		initiateProviderOAuth(id: $id) {
			authorizationUrl
			state
		}
	}
`);

interface ProviderStepProps {
	onNext: () => void;
}

export function ProviderStep({ onNext }: ProviderStepProps) {
	const [selectedProviderId, setSelectedProviderId] = useState<string>("");
	const [{ data, fetching }] = useQuery({ query: AVAILABLE_PROVIDERS_QUERY });
	const [{ fetching: connecting }, connectStorage] = useMutation(
		CONNECT_STORAGE_MUTATION,
	);
	const [{ fetching: initializingOAuth }, initiateOAuth] = useMutation(
		INITIATE_OAUTH_MUTATION,
	);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm();

	const selectedProvider = data?.availableProviders.find(
		(p) => p.id === selectedProviderId,
	);

	const onSubmit = async (formData: any) => {
		if (!selectedProvider) return;

		const { _displayName, ...config } = formData;

		try {
			// Convert provider ID (e.g., "google_drive") to enum format (e.g., "GOOGLE_DRIVE")
			const providerType = selectedProvider.id.toUpperCase() as any;

			const result = await connectStorage({
				input: {
					name: _displayName,
					type: providerType,
					config: config,
				},
			});

			if (result.error) {
				toast.error(result.error.message);
				return;
			}

			const provider = result.data?.connectStorage;

			if (selectedProvider.authType === "OAUTH" && provider) {
				// Initiate OAuth flow
				const oauthResult = await initiateOAuth({ id: provider.id });
				if (oauthResult.data?.initiateProviderOAuth.authorizationUrl) {
					// Persist current step so the wizard can restore it if navigation is interrupted.
					localStorage.setItem("onboarding_step", "2");
					window.location.href =
						oauthResult.data.initiateProviderOAuth.authorizationUrl;
				}
			} else {
				toast.success("Storage connected successfully!");
				onNext();
			}
		} catch (_error) {
			toast.error("Failed to connect storage provider");
		}
	};

	if (fetching) {
		return (
			<div className="flex flex-col items-center justify-center py-12 gap-3">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">Loading providers...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1">
			<div className="space-y-6 flex-1">
				<div className="space-y-1.5">
					<h2 className="text-2xl font-bold tracking-tight">Connect Storage</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Select a provider to connect your first storage drive.
					</p>
				</div>

				<div className="space-y-5">
					<div className="space-y-2">
						<Label>Storage Provider</Label>
						<Select
							value={selectedProviderId}
							onValueChange={(val) => {
								setSelectedProviderId(val);
								reset();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a provider..." />
							</SelectTrigger>
							<SelectContent>
								{data?.availableProviders.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedProvider && (
							<p className="text-xs text-muted-foreground">
								{selectedProvider.description}
							</p>
						)}
					</div>

					{selectedProvider && (
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
						>
							<div className="space-y-2">
								<Label htmlFor="_displayName">Display Name</Label>
								<Input
									id="_displayName"
									placeholder={`My ${selectedProvider.name}`}
									{...register("_displayName", { required: true })}
								/>
								{errors._displayName && (
									<span className="text-xs text-destructive">Required</span>
								)}
							</div>

							{selectedProvider.configFields.map((field) => (
								<div key={field.name} className="space-y-2">
									<Label htmlFor={field.name}>
										{field.label}
										{field.required && (
											<span className="text-destructive ml-1">*</span>
										)}
									</Label>
									<Input
										id={field.name}
										type={field.type === "password" ? "password" : "text"}
										placeholder={field.placeholder ?? ""}
										{...register(field.name, { required: field.required })}
									/>
									{errors[field.name] && (
										<span className="text-xs text-destructive">Required</span>
									)}
									{field.description && (
										<p className="text-xs text-muted-foreground">
											{field.description}
										</p>
									)}
								</div>
							))}

							<Button
								type="submit"
								className="w-full"
								disabled={connecting || initializingOAuth}
							>
								{(connecting || initializingOAuth) && (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								)}
								{selectedProvider.authType === "OAUTH"
									? "Connect & Authorize"
									: "Connect Storage"}
							</Button>
						</form>
					)}
				</div>
			</div>

			<div className="mt-auto pt-6 text-center">
				<Button
					variant="ghost"
					size="sm"
					onClick={onNext}
					className="text-muted-foreground text-xs h-8"
				>
					Skip for now
				</Button>
			</div>
		</div>
	);
}
