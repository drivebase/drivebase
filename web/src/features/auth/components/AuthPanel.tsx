const IMAGE_URL =
	"https://images.unsplash.com/photo-1654198340681-a2e0fc449f1b?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export function AuthPanel() {
	return (
		<div className="relative hidden lg:block h-full min-h-screen">
			<img
				src={IMAGE_URL}
				alt=""
				className="absolute inset-0 w-full h-full object-cover"
			/>
		</div>
	);
}
