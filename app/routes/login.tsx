import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/firebase-auth";

export const Route = createFileRoute("/login")({
	component: Login,
});

function Login() {
	const navigate = useNavigate();
	const { user, loading, signIn } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// すでにログイン済みならホームへ
	useEffect(() => {
		if (!loading && user) {
			navigate({ to: "/", replace: true });
		}
	}, [user, loading, navigate]);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			await signIn(email, password);
			navigate({ to: "/", replace: true });
		} catch (err: unknown) {
			const code = (err as { code?: string }).code;
			if (
				code === "auth/invalid-credential" ||
				code === "auth/wrong-password" ||
				code === "auth/user-not-found"
			) {
				setError("メールアドレスまたはパスワードが正しくありません。");
			} else {
				setError(
					"ログインに失敗しました。しばらく経ってから再試行してください。",
				);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	// 認証確認中はスピナーを表示
	if (loading) {
		return (
			<div className="min-h-screen bg-neutral-50 flex items-center justify-center">
				<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
			<div className="max-w-md w-full">
				<div className="text-center mb-10">
					<h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">
						Welcome Back
					</h1>
					<p className="mt-2 text-sm text-neutral-500">
						Sign in to Orbit Todo to manage your tasks.
					</p>
				</div>

				<div className="bg-white px-8 py-10 shadow-2xl shadow-indigo-100/50 rounded-3xl border border-neutral-100/60 backdrop-blur-xl">
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-rose-50 text-rose-600 text-sm p-4 rounded-xl font-medium border border-rose-100">
								{error}
							</div>
						)}

						<div className="space-y-1.5">
							<label
								htmlFor="email"
								className="block text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1"
							>
								Email Address
							</label>
							<input
								id="email"
								type="email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="block w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
								placeholder="you@example.com"
							/>
						</div>

						<div className="space-y-1.5">
							<label
								htmlFor="password"
								className="block text-xs font-bold uppercase tracking-widest text-neutral-500 ml-1"
							>
								Password
							</label>
							<input
								id="password"
								type="password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="block w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
								placeholder="••••••••"
							/>
						</div>

						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 active:shadow-indigo-100 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none disabled:shadow-none disabled:hover:-translate-y-0"
						>
							{isSubmitting ? "Signing in..." : "Sign in"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
