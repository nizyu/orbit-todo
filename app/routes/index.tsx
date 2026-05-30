import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "../lib/firebase";
import { InboxPage } from "./inbox";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		// client-side auth check
		await auth.authStateReady();
		if (!auth.currentUser) {
			throw redirect({
				to: "/login",
			});
		}
	},
	component: IndexPage,
});

function IndexPage() {
	return <InboxPage />;
}
