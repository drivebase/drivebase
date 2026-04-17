import { useSignOut } from "@/features/auth/hooks";
import { useAuthStore } from "@/store/auth";
import { Avatar, Dropdown, Label } from "@heroui/react";
import { ArrowRightFromSquare, Gear } from "@gravity-ui/icons";
import { useNavigate } from "@tanstack/react-router";
import { ThemeSwitcher } from "./ThemeSwitcher";

export function UserDropdown() {
	const user = useAuthStore((s) => s.user);
	const { submit: signOut } = useSignOut();
	const navigate = useNavigate();

	if (!user) return null;

	const initials = user.name
		.split(" ")
		.map((n: string) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	return (
		<Dropdown>
			<Dropdown.Trigger className="rounded-full">
				<Avatar size="sm">
					<Avatar.Fallback>{initials}</Avatar.Fallback>
				</Avatar>
			</Dropdown.Trigger>
			<Dropdown.Popover>
				<div className="px-3 pt-3 pb-2">
					<div className="flex items-center gap-2">
						<Avatar size="sm">
							<Avatar.Fallback>{initials}</Avatar.Fallback>
						</Avatar>
						<div className="flex flex-col gap-0">
							<p className="text-sm leading-5 font-medium">{user.name}</p>
							<p className="text-xs leading-none text-muted">{user.email}</p>
						</div>
					</div>
				</div>
				<div className="px-3 pb-2 flex items-center justify-between">
					<span className="text-xs text-muted">Theme</span>
					<ThemeSwitcher />
				</div>
				<Dropdown.Menu onAction={(key) => {
					if (key === "settings") navigate({ to: "/settings/general" });
					if (key === "logout") signOut();
				}}>
					<Dropdown.Item id="settings" textValue="Settings">
						<div className="flex w-full items-center justify-between gap-2">
							<Label>Settings</Label>
							<Gear className="size-3.5 text-muted" />
						</div>
					</Dropdown.Item>
					<Dropdown.Item id="logout" textValue="Logout" variant="danger">
						<div className="flex w-full items-center justify-between gap-2">
							<Label>Log Out</Label>
							<ArrowRightFromSquare className="size-3.5 text-danger" />
						</div>
					</Dropdown.Item>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	);
}
