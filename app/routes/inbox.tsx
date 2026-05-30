import { createFileRoute, redirect } from "@tanstack/react-router";
import { InboxContent } from "../components/inbox/InboxContent";
import { auth } from "../lib/firebase";

export const Route = createFileRoute("/inbox")({
	beforeLoad: async () => {
		// client-side auth check
		await auth.authStateReady();
		if (!auth.currentUser) {
			throw redirect({
				to: "/login",
			});
		}
	},
	component: InboxPage,
});

export function InboxPage() {
	return <InboxContent />;
}
