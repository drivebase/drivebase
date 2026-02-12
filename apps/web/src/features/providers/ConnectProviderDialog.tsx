import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
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
import type { AvailableProvider } from "@/gql/graphql";

interface ConnectProviderDialogProps {
	provider: AvailableProvider;
	isOpen: boolean;
	onClose: () => void;
	onConnect: (data: any) => Promise<void>;
	isConnecting: boolean;
}

export function ConnectProviderDialog({
	provider,
	isOpen,
	onClose,
	onConnect,
	isConnecting,
}: ConnectProviderDialogProps) {
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm();

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Connect {provider.name}</DialogTitle>
					<DialogDescription>
						Enter the configuration details for {provider.name}.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit(onConnect)} className="space-y-4">
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
					{provider.configFields.map((field) => (
						<div key={field.name} className="space-y-2">
							<Label htmlFor={field.name}>
								{field.label}
								{field.required && <span className="text-red-500 ml-1">*</span>}
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
					))}
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
							Connect
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
