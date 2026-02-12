export interface User {
	id: string;
	name: string;
	email: string;
	avatarUrl?: string;
	plan: "Free" | "Pro" | "Enterprise";
}
