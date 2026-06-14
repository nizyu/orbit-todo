import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "../lib/firebase-auth";

export function Header() {
	const navigate = useNavigate();
	const { user, signOut } = useAuth();
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;

	const isTasks = pathname === "/tasks";
	const isInbox = pathname === "/" || pathname === "/inbox";
	const isPlans = pathname === "/plans";
	const isToday = pathname === "/today";

	const handleSignOut = async () => {
		await signOut();
		navigate({ to: "/login", replace: true });
	};

	return (
		<header className="w-full bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-50">
			<div className="max-w-7xl mx-auto flex items-center justify-between">
				<div className="flex items-center gap-4 sm:gap-10 overflow-x-auto no-scrollbar">
					<h1 className="text-xl font-black tracking-tighter text-neutral-900 flex items-center gap-2 shrink-0">
						<span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">
							O
						</span>
						<span className="hidden sm:inline">Orbit</span>
					</h1>

					<nav className="flex items-center gap-4 sm:gap-6 shrink-0">
						<Link
							to="/inbox"
							className={`text-sm font-bold transition-all duration-200 border-b-2 py-1 ${
								isInbox
									? "border-indigo-600 text-indigo-600"
									: "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
							}`}
						>
							Inbox
						</Link>
						<Link
							to="/today"
							className={`text-sm font-bold transition-all duration-200 border-b-2 py-1 ${
								isToday
									? "border-indigo-600 text-indigo-600"
									: "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
							}`}
						>
							Today
						</Link>
						<Link
							to="/plans"
							className={`text-sm font-bold transition-all duration-200 border-b-2 py-1 ${
								isPlans
									? "border-indigo-600 text-indigo-600"
									: "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
							}`}
						>
							Plans
						</Link>
						<Link
							to="/tasks"
							className={`text-sm font-bold transition-all duration-200 border-b-2 py-1 ${
								isTasks
									? "border-indigo-600 text-indigo-600"
									: "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
							}`}
						>
							Tasks
						</Link>
					</nav>
				</div>

				<div className="flex items-center gap-4">
					{user && (
						<div className="hidden md:flex flex-col items-end">
							<span className="text-sm font-bold text-neutral-800 leading-none">
								{user.displayName || user.email?.split("@")[0]}
							</span>
							<span className="text-[10px] font-medium text-neutral-400">
								{user.email}
							</span>
						</div>
					)}
					<button
						onClick={handleSignOut}
						className="text-sm font-bold text-neutral-500 hover:text-rose-600 transition-all bg-neutral-100 hover:bg-rose-50 px-3.5 py-2 rounded-xl border border-transparent hover:border-rose-100"
					>
						Sign out
					</button>
				</div>
			</div>
		</header>
	);
}
