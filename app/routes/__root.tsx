import {
	createRootRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { Header } from "../components/Header";
import { AuthProvider } from "../lib/firebase-auth";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	const isLogin = pathname === "/login";

	if (isLogin) {
		return (
			<AuthProvider>
				<Outlet />
			</AuthProvider>
		);
	}

	return (
		<AuthProvider>
			<div className="flex flex-col h-screen bg-neutral-50 overflow-hidden text-neutral-900 font-sans">
				<Header />
				<div className="flex-1 overflow-hidden flex flex-col w-full">
					<Outlet />
				</div>
			</div>
		</AuthProvider>
	);
}
