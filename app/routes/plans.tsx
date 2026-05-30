import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlansContent } from "../components/plans/PlansContent";
import { auth } from "../lib/firebase";

export const Route = createFileRoute("/plans")({
	beforeLoad: async () => {
		// client-side auth check
		await auth.authStateReady();
		if (!auth.currentUser) {
			throw redirect({
				to: "/login",
			});
		}
	},
	component: PlansPage,
});

export function PlansPage() {
	return <PlansContent />;
}
