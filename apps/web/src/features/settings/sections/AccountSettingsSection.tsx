import { Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateMyProfile } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";

export function AccountSettingsSection() {
	const user = useAuthStore((state) => state.user);
	const [, updateMyProfile] = useUpdateMyProfile();
	const [name, setName] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (user) {
			setName(user.name ?? "");
		}
	}, [user]);

	if (!user) return null;

	const userName = user.name?.trim() || user.email.split("@")[0];
	const userInitial = userName.charAt(0).toUpperCase();

	const handleSaveProfile = async () => {
		const trimmed = name.trim();
		if (!trimmed) {
			toast.error("Name is required");
			return;
		}

		setIsSaving(true);
		try {
			const result = await updateMyProfile({
				input: {
					name: trimmed,
				},
			});

			if (result.error) {
				throw new Error(result.error.message);
			}

			toast.success("Profile updated");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to update profile";
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">My Account</h3>
				<p className="text-sm text-muted-foreground">
					Manage your profile and account details.
				</p>
			</div>

			<div className="flex items-center gap-4">
				<Avatar className="h-16 w-16">
					<AvatarImage src={`https://ui-avatars.com/api/?name=${userName}`} />
					<AvatarFallback>{userInitial}</AvatarFallback>
				</Avatar>
				<div>
					<h4 className="text-base font-semibold">{userName}</h4>
					<p className="text-sm text-muted-foreground">{user.email}</p>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="account-name">Name</Label>
				<div className="flex items-center gap-3">
					<Input
						id="account-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder="Enter your name"
						className="h-10 text-sm"
					/>
					<Button onClick={handleSaveProfile} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>

			<div className="space-y-4 text-sm">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground flex items-center gap-2">
						<Mail size={16} />
						Email
					</span>
					<span>{user.email}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground flex items-center gap-2">
						<Shield size={16} />
						Role
					</span>
					<span>{user.role}</span>
				</div>
			</div>
		</div>
	);
}