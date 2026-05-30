import { expect, test } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Home Page with Auth", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test("should load with correct title and show user info", async ({
		page,
	}) => {
		await expect(page).toHaveTitle(/Orbit Todo/i);
		await expect(page.locator("h1")).toHaveText(/OOrbit/);
		await expect(page.getByText("test@example.com")).toBeVisible();
	});

	test("should show empty message if no todos or task list loads", async ({
		page,
	}) => {
		await page.goto("/tasks");
		await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
	});
});
