import { Trans } from "@lingui/macro";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";

export function ChangePasswordSection() {
	const navigate = useNavigate();
	const clearAuth = useAuthStore((state) => state.logout);
	const [, changePassword] = useChangePassword();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleChangePassword = async () => {
		if (!currentPassword || !newPassword) {
			toast.error("Current password and new password are required");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await changePassword({
				input: {
					currentPassword,
					newPassword,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			toast.success("Password updated. Please sign in again.");
			clearAuth();
			navigate({ to: "/login", replace: true });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to change password";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Change Password</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Update your account password.</Trans>
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="current-password">
					<Trans>Current password</Trans>
				</Label>
				<Input
					id="current-password"
					type="password"
					value={currentPassword}
					onChange={(event) => setCurrentPassword(event.target.value)}
					placeholder="Enter current password"
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="new-password">
					<Trans>New password</Trans>
				</Label>
				<Input
					id="new-password"
					type="password"
					value={newPassword}
					onChange={(event) => setNewPassword(event.target.value)}
					placeholder="Enter new password"
				/>
			</div>
			<div>
				<Button onClick={handleChangePassword} disabled={isSubmitting}>
					{isSubmitting ? (
						<Trans>Updating...</Trans>
					) : (
						<Trans>Change password</Trans>
					)}
				</Button>
			</div>
		</div>
	);
}
