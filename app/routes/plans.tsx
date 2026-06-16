import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlansContent } from "../components/plans/PlansContent";
import { auth } from "../lib/firebase";
import { z } from "zod";

const plansSearchSchema = z.object({
	planId: z.string().optional(),
});

export const Route = createFileRoute("/plans")({
	validateSearch: (search) => plansSearchSchema.parse(search),
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
