import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Category, Todo } from "../../lib/firestore";
import { TaskTree } from "./TaskTree";

describe("TaskTree Component", () => {
	it("renders uncategorized tasks", () => {
		const mockTasks: Todo[] = [
			{
				id: "1",
				title: "Buy groceries",
				status: "OPEN",
				until_date: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user1",
				categoryId: null,
				parentCategoryId: null,
				description: null,
				check_list: null,
			},
		];

		render(
			<TaskTree
				tasks={mockTasks}
				categories={[]}
				selectedItem={null}
				onSelectTask={() => {}}
				onSelectCategory={() => {}}
			/>,
		);

		expect(screen.getByText("Buy groceries")).toBeInTheDocument();
		expect(screen.getByText("📦 Uncategorized")).toBeInTheDocument();
	});

	it("renders categories and tasks within them", () => {
		const mockCategories: Category[] = [
			{
				id: "cat1",
				name: "Work",
				userId: "user1",
				createdAt: new Date(),
				updatedAt: new Date(),
				status: "ACTIVE",
				parentId: null,
				description: null,
			},
		];
		const mockTasks: Todo[] = [
			{
				id: "2",
				title: "Category Task 1",
				status: "OPEN",
				until_date: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: "user1",
				categoryId: "cat1",
				parentCategoryId: null,
				description: null,
				check_list: null,
			},
		];

		render(
			<TaskTree
				tasks={mockTasks}
				categories={mockCategories}
				selectedItem={null}
				onSelectTask={() => {}}
				onSelectCategory={() => {}}
			/>,
		);

		expect(screen.getByText(/Work/)).toBeInTheDocument();
		expect(screen.getByText("Category Task 1")).toBeInTheDocument();
	});
});
