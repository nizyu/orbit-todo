import { expect, test } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("2-Column Layout and Task Details", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test("should show 2-column layout on desktop", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/tasks");

		// Wait for the main pane container
		const mainPane = page.locator("main > div > div").first();
		await expect(mainPane).toBeVisible();

		// Check for Task List and Detail placeholder
		await expect(
			page.getByRole("heading", { name: "Tasks", exact: true }),
		).toBeVisible();
		await expect(page.getByText("Select an item")).toBeVisible();
	});

	test("should select a task and show its details", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/tasks");

		// Wait a moment for tasks to load from Firestore
		await page.waitForTimeout(1000);

		// Check if any task exists (we look for the emoji indicator 📝)
		const taskCount = await page
			.locator("#tree-pane div.group")
			.filter({ hasText: "📝" })
			.count();

		if (taskCount === 0) {
			// First create a category
			await page.getByRole("button", { name: "New Category" }).click();
			await page.fill('#detail-pane input[name="name"]', "E2E Test Category");
			await page.click('#detail-pane button[type="submit"]');

			// Wait for submission to complete
			await expect(page.getByText("Select an item")).toBeVisible();

			// Wait for category to appear and select it
			const newCat = page
				.locator("#tree-pane")
				.getByText("E2E Test Category")
				.first();
			await expect(newCat).toBeVisible();
			await newCat.click();

			// Expand form to create task in category
			await page.getByRole("button", { name: "Task", exact: true }).click();
			await page.fill(
				'#detail-pane input[name="title"]',
				"Test Task for Details",
			);
			await page.fill(
				'#detail-pane textarea[name="description"]',
				"This is a test description",
			);
			await page.click('#detail-pane button[type="submit"]');
			// Wait for the task to appear
			await expect(
				page.locator("#tree-pane").getByText("Test Task for Details").first(),
			).toBeVisible();
		}

		// Wait for transitions to settle
		await page.waitForTimeout(500);

		// Click on the first task
		const firstTask = page
			.locator("#tree-pane div.group")
			.filter({ hasText: "📝" })
			.first();
		const rawTaskName = await firstTask.locator("span.truncate").textContent();
		const taskName = rawTaskName?.trim();
		await firstTask.click();

		// Verify detail view updates
		if (taskName) {
			await expect(page.locator("#detail-pane input#edit-title")).toHaveValue(
				taskName,
			);
			if (taskName === "Test Task for Details") {
				// Description is in preview mode by default, switch to edit to check textarea
				await page
					.locator("#detail-pane")
					.getByRole("button", { name: "Edit" })
					.click();
				await expect(
					page.locator("#detail-pane textarea#edit-description"),
				).toHaveValue("This is a test description");
			}
		}
	});
});
