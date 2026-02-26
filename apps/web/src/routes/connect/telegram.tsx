import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import {
	CompletionStep,
	InvalidRequest,
	PhoneStep,
	StepIndicator,
	useTelegramAuth,
	VerifyStep,
} from "@/features/telegram";

interface TelegramSearchParams {
	state: string;
	apiId: string;
	apiHash: string;
}

export const Route = createFileRoute("/connect/telegram")({
	validateSearch: (search: Record<string, unknown>): TelegramSearchParams => ({
		state: (search.state as string) || "",
		apiId: (search.apiId as string) || "",
		apiHash: (search.apiHash as string) || "",
	}),
	component: TelegramConnectPage,
});

function TelegramConnectPage() {
	const { state, apiId, apiHash } = Route.useSearch();
	const navigate = useNavigate();
	const [step, setStep] = useState(1);

	// Extract providerId from state (format: "<providerId>:<csrfToken>")
	const providerId = state ? state.split(":")[0] : "";

	const {
		loading,
		requires2FA,
		sendCode,
		verifyCode,
		verify2FA,
		completeAuth,
	} = useTelegramAuth(providerId);

	const handlePhoneSubmit = async (phone: string) => {
		const success = await sendCode(Number(apiId), apiHash, phone);
		if (success) {
			setStep(2);
			toast.success(<Trans>Verification code sent to your Telegram app</Trans>);
		}
		return success;
	};

	const handleVerifyCodeSubmit = async (code: string) => {
		const result = await verifyCode(code);
		if (
			result &&
			"sessionString" in result &&
			typeof result.sessionString === "string"
		) {
			await handleCompleteAuth(result.sessionString);
		} else if (result && "requires2FA" in result) {
			toast.info(<Trans>Two-factor authentication required</Trans>);
		}
	};

	const handleVerify2FASubmit = async (password: string) => {
		const sessionString = await verify2FA(password);
		if (sessionString) {
			await handleCompleteAuth(sessionString);
		}
	};

	const handleCompleteAuth = async (sessionString: string) => {
		const success = await completeAuth(sessionString, state);
		if (success) {
			setStep(3);
			toast.success(<Trans>Telegram connected successfully!</Trans>);
			setTimeout(() => {
				navigate({ to: "/providers", search: { connected: true } });
			}, 1500);
		} else {
			toast.error(<Trans>Failed to complete connection</Trans>);
		}
	};

	if (!state || !apiId || !apiHash) {
		return <InvalidRequest />;
	}

	return (
		<div
			className="min-h-screen w-full flex items-center justify-center p-4"
			style={{
				background:
					"radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.07), transparent)",
			}}
		>
			<div className="w-full max-w-md">
				{/* Logo */}
				<div className="flex items-center justify-center gap-2.5 mb-10">
					<img
						src="/assets/providers/telegram.svg"
						alt="Drivebase"
						className="h-7 w-7"
					/>
					<span className="font-semibold text-lg tracking-tight">
						<Trans>Connect Telegram</Trans>
					</span>
				</div>

				<StepIndicator currentStep={step} />

				<Card className="shadow-xl border-border/50">
					<CardContent className="px-8 py-8">
						{step === 1 && (
							<PhoneStep loading={loading} onSubmit={handlePhoneSubmit} />
						)}

						{step === 2 && (
							<VerifyStep
								loading={loading}
								requires2FA={requires2FA}
								onVerifyCode={handleVerifyCodeSubmit}
								onVerify2FA={handleVerify2FASubmit}
							/>
						)}

						{step === 3 && <CompletionStep />}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
