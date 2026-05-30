import type { FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
	// エミュレータの認証APIを叩いてテストユーザーを作成しておく
	// グローバルセットアップとしてテスト全体で1度だけ実行される
	try {
		const res = await fetch(
			"http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=dummy-key",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "test@example.com",
					password: "password123",
					returnSecureToken: true,
				}),
			},
		);
		if (!res.ok) {
			const text = await res.text();
			if (!text.includes("EMAIL_EXISTS")) {
				console.error("Failed to create test user:", text);
			}
		}
	} catch (e) {
		console.error("Error creating test user:", e);
	}
}

export default globalSetup;
