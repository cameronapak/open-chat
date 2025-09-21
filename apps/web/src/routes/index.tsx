import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<section>Jesus Saves</section>
	);
}
