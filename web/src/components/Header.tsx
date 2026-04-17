import { UserDropdown } from "./UserDropdown";

export function Header() {
	return (
		<header className="h-14 shrink-0 flex items-center justify-end px-6">
			<UserDropdown />
		</header>
	);
}
