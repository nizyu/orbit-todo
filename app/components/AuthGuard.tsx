import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "../lib/firebase-auth";

interface AuthGuardProps {
	children: ReactNode;
}

/**
 * 認証済みユーザーのみchildrenを表示するガードコンポーネント。
 * 未認証の場合は /login へリダイレクトする。
 * 認証確認中はローディングスピナーを表示する。
 */
export function AuthGuard({ children }: AuthGuardProps) {
	const { user, loading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!loading && !user) {
			navigate({ to: "/login", replace: true });
		}
	}, [user, loading, navigate]);

	if (loading) {
		return (
			<div className="min-h-screen bg-neutral-50 flex items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
					<p className="text-sm text-neutral-400 font-medium">Loading...</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return <>{children}</>;
}
