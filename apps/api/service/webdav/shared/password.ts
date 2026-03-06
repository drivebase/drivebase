export function generateWebDavPassword(): string {
	return crypto.randomUUID().replaceAll("-", "");
}
