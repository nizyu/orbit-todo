/**
 * Firebase Authエミュレータに対してテストユーザーを登録するスクリプト
 */
async function initUser() {
	const email = "test@example.com";
	const password = "password123";

	console.log(`Checking/Creating test user: ${email}...`);

	try {
		const res = await fetch(
			`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=dummy-key`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: email,
					password: password,
					returnSecureToken: true,
				}),
			},
		);

		const data = await res.json();

		if (res.ok) {
			console.log("✅ Test user created successfully.");
		} else {
			if (data.error && data.error.message === "EMAIL_EXISTS") {
				console.log("ℹ️ Test user already exists.");
			} else {
				console.error("❌ Failed to create test user:", data);
				process.exit(1);
			}
		}
	} catch (error) {
		console.error("❌ Error connecting to emulator:", error.message);
		console.error(
			"Make sure the Firebase Auth emulator is running on port 9099.",
		);
		process.exit(1);
	}
}

initUser();
