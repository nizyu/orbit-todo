import { expect, type Page } from "@playwright/test";

export async function login(page: Page) {
	page.on("pageerror", (err) => {
		console.log(`PAGE ERROR: ${err.message}`);
	});
	page.on("console", (msg) => {
		console.log(`CONSOLE: ${msg.text()}`);
	});
	// Go to home, it should redirect to login
	await page.goto("/");
	try {
		await expect(page).toHaveURL(/.*\/login/, { timeout: 2000 });
	} catch (e) {
		console.log("Failed to redirect. Page content:");
		console.log(await page.content());
		throw e;
	}

	// Login
	await page.fill('input[type="email"]', "test@example.com");
	await page.fill('input[type="password"]', "password123");
	await page.click('button[type="submit"]');

	// Wait for navigation back to home
	await expect(page).toHaveURL("http://localhost:5173/");
}
