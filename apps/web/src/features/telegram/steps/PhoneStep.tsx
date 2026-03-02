import { useState } from "react";
import { PiSpinnerGap as Loader2 } from "react-icons/pi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneStepProps {
	loading: boolean;
	onSubmit: (phone: string) => Promise<boolean>;
}

export function PhoneStep({ loading, onSubmit }: PhoneStepProps) {
	const [phone, setPhone] = useState("");

	const handleSubmit = async () => {
		const trimmed = phone.trim();
		if (!trimmed) {
			toast.error("Please enter your phone number");
			return;
		}
		await onSubmit(trimmed);
	};

	return (
		<div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
			<div className="space-y-1.5">
				<h2 className="text-2xl font-bold tracking-tight">Connect Telegram</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">
					Enter your phone number to receive a verification code in your
					Telegram app.
				</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="phone">Phone Number</Label>
					<Input
						id="phone"
						type="tel"
						placeholder="+1234567890"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
						disabled={loading}
					/>
					<p className="text-xs text-muted-foreground">
						Include your country code (e.g. +1 for US)
					</p>
				</div>

				<Button className="w-full" onClick={handleSubmit} disabled={loading}>
					{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
					Send Code
				</Button>
			</div>
		</div>
	);
}
