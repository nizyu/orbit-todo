import { expect, test } from "@playwright/test";
import { login } from "./auth-helper";

test.describe("Inbox Feature", () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
		// Click on the Inbox link in the header
		await page.getByRole("link", { name: "Inbox" }).click();
		await expect(page).toHaveURL(/.*\/inbox/);
	});

	test("should create and delete an inbox item", async ({ page }) => {
		const uniqueText = `E2E Test Note - ${Date.now()}`;

		// Fill the textarea
		await page.getByPlaceholder("What's on your mind?").fill(uniqueText);

		// Select the 'Memo' annotation
		await page.getByRole("button", { name: "📝 Memo" }).click();

		// Post the item
		await page.getByRole("button", { name: "Post" }).click();

		// Verify the textarea is cleared
		await expect(page.getByPlaceholder("What's on your mind?")).toHaveValue("");

		// Verify it appears in the timeline list
		const itemText = page.getByText(uniqueText);
		await expect(itemText).toBeVisible();

		// Find the container for this specific item
		const itemContainer = itemText.locator("..").locator("..");

		// Verify annotation is applied
		await expect(itemContainer).toContainText("Memo");
		await expect(itemContainer).toContainText("📝");

		// Hover over the item to reveal the delete button
		await itemContainer.hover();

		// Set up dialog handler for confirmation
		page.once("dialog", (dialog) => {
			expect(dialog.message()).toBe(
				"Are you sure you want to delete this item?",
			);
			dialog.accept();
		});

		// Click the delete button
		await itemContainer.getByRole("button", { name: "Delete" }).click();

		// Verify the item is removed from the list
		await expect(itemText).not.toBeVisible();
	});
});
