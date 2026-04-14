import { Button } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	component: HomePage,
});

function HomePage() {
	return <Button>HELLO</Button>;
}
