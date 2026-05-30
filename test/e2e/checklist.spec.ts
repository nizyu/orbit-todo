import { expect, test } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Todo Checklist", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		await page.goto("/tasks");
	});

	test("should allow adding and removing checklist items", async ({ page }) => {
		// First create a category
		await page.getByRole("button", { name: "New Category" }).click();
		await page.fill('#detail-pane input[name="name"]', "Checklist Category");
		await page.click('#detail-pane button[type="submit"]');

		// Wait for submission to complete
		await expect(page.getByText("Select an item")).toBeVisible();

		// Wait for category to appear and select it
		const newCat = page
			.locator("#tree-pane")
			.getByText("Checklist Category")
			.first();
		await expect(newCat).toBeVisible();
		await newCat.click();

		// Expand form first
		await page.getByRole("button", { name: "Task", exact: true }).click();

		// Initially one item
		const checklistInputs = page.locator('form input[name="check_list"]');
		// The form has one by default
		await expect(checklistInputs).toHaveCount(1);

		// Add an item
		await page.getByRole("button", { name: /Add Item/i }).click();
		await expect(checklistInputs).toHaveCount(2);

		// Type in items
		await page.locator('form input[name="check_list"]').nth(0).fill("Task 1");
		await page.locator('form input[name="check_list"]').nth(1).fill("Task 2");

		// Add another one
		await page.getByRole("button", { name: /Add Item/i }).click();
		await expect(page.locator('form input[name="check_list"]')).toHaveCount(3);

		// Remove the second one
		const removeButtons = page.locator('form button[title="Remove item"]');
		await removeButtons.nth(1).click();
		await expect(page.locator('form input[name="check_list"]')).toHaveCount(2);

		// Verify remaining values
		await expect(
			page.locator('form input[name="check_list"]').nth(0),
		).toHaveValue("Task 1");
		await expect(
			page.locator('form input[name="check_list"]').nth(1),
		).toHaveValue("");
	});

	test("should filter blank items on submission", async ({ page }) => {
		// First create a category
		await page.getByRole("button", { name: "New Category" }).click();
		await page.fill('#detail-pane input[name="name"]', "Filter Category");
		await page.click('#detail-pane button[type="submit"]');

		// Wait for submission to complete
		await expect(page.getByText("Select an item")).toBeVisible();

		// Wait for category to appear and select it
		const newCat = page
			.locator("#tree-pane")
			.getByText("Filter Category")
			.first();
		await expect(newCat).toBeVisible();
		await newCat.click();

		// Expand form first
		await page.getByRole("button", { name: "Task", exact: true }).click();

		const taskName = `Test Task with Blanks ${Date.now()}`;
		const titleInput = page.locator('form input[name="title"]');
		await titleInput.fill(taskName);

		const checklistInputs = page.locator('form input[name="check_list"]');
		await checklistInputs.nth(0).fill("Real Item 1");

		// Add a blank item
		await page
			.getByRole("button", { name: /Add Item/i })
			.first()
			.click();
		// and another real item
		await page
			.getByRole("button", { name: /Add Item/i })
			.first()
			.click();
		await checklistInputs.nth(2).fill("Real Item 2");

		// Submit
		await page.getByRole("button", { name: /Create Task/i }).click();

		// Wait for submission to complete and right pane to reset
		await expect(
			page.getByRole("heading", { name: "Select an item" }),
		).toBeVisible();

		// Should be successful and appearing in the list
		const latestTask = page
			.locator("#tree-pane div.group")
			.filter({ hasText: taskName })
			.first();
		await expect(latestTask).toBeVisible();

		// Select it
		await latestTask.click();

		// Verify detail view
		const detailChecklistItems = page.locator(
			"#detail-pane div.space-y-3 > div.flex.gap-2.items-center",
		);
		// Should only have 2 real items (Real Item 1 and Real Item 2)
		await expect(detailChecklistItems).toHaveCount(2);
		await expect(
			detailChecklistItems.nth(0).locator('input[type="text"]'),
		).toHaveValue("Real Item 1");
		await expect(
			detailChecklistItems.nth(1).locator('input[type="text"]'),
		).toHaveValue("Real Item 2");
	});
});
