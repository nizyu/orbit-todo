import { useEffect, useState } from "react";
import { useAuth } from "../../lib/firebase-auth";
import {
	type Category,
	type CheckListItem,
	createCategory,
	createTodo as createTask,
	setTodoStatus as setTaskStatus,
	subscribeCategories,
	subscribeTodos as subscribeTasks,
	type Todo as Task,
	toggleCategoryStatus,
	updateCategory,
	updateTodo as updateTask,
} from "../../lib/firestore";
import { CategoryForm } from "./CategoryForm";
import { SettingsPanel } from "./SettingsPanel";
import { TaskDetail } from "./TaskDetail";
import { TaskForm } from "./TaskForm";
import { TaskTree } from "./TaskTree";

function formatDate(date: Date) {
	return date.toISOString().split("T")[0];
}

type SelectedItem = {
	type: "task" | "category" | "new-task" | "new-category";
	id?: string;
	parentId?: string;
};

export function TasksContent() {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
	const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// フィルター状態
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const defaultStart = new Date(today);
	defaultStart.setDate(today.getDate() - 30);
	const defaultEnd = new Date(today);
	defaultEnd.setDate(today.getDate() + 120);

	const [startDateStr, setStartDateStr] = useState(formatDate(defaultStart));
	const [endDateStr, setEndDateStr] = useState(formatDate(defaultEnd));
	const [limit, setLimit] = useState(500);

	// Taskリアルタイム購読
	useEffect(() => {
		if (!user) return;
		const startDate = new Date(startDateStr);
		const endDate = new Date(endDateStr);
		endDate.setHours(23, 59, 59, 999);

		const unsub = subscribeTasks(
			user.uid,
			{ startDate, endDate, maxLimit: limit },
			(updatedTasks) => setTasks(updatedTasks),
		);
		return unsub;
	}, [user, startDateStr, endDateStr, limit]);

	// カテゴリリアルタイム購読
	useEffect(() => {
		if (!user) return;
		const unsub = subscribeCategories(user.uid, (updatedCategories) =>
			setCategories(updatedCategories),
		);
		return unsub;
	}, [user]);

	const activeCategories = categories.filter((c) => c.status === "ACTIVE");
	const baseCategories = activeCategories.filter((c) => !c.parentId);

	const selectedTask =
		selectedItem?.type === "task" && selectedItem.id
			? tasks.find((t) => t.id === selectedItem.id) || null
			: null;
	const selectedCategory =
		selectedItem?.type === "category" && selectedItem.id
			? categories.find((c) => c.id === selectedItem.id) || null
			: null;

	const selectedTaskWithCategory = selectedTask
		? {
				...selectedTask,
				category: selectedTask.categoryId
					? (categories.find((c) => c.id === selectedTask.categoryId) ?? null)
					: null,
				parentCategory: selectedTask.parentCategoryId
					? (categories.find((c) => c.id === selectedTask.parentCategoryId) ??
						null)
					: null,
			}
		: null;

	// Handlers for Task
	const handleCreateTask = async (data: {
		title: string;
		description?: string | null;
		until_date?: Date | null;
		categoryId?: string | null;
		parentCategoryId?: string | null;
		check_list?: CheckListItem[];
	}) => {
		if (!user) return;
		setIsSubmitting(true);
		try {
			await createTask(user.uid, data);
			setSelectedItem(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdateTask = async (
		taskId: string,
		data: {
			title?: string;
			description?: string | null;
			until_date?: Date | null;
			categoryId?: string | null;
			parentCategoryId?: string | null;
			check_list?: CheckListItem[] | null;
		},
	) => {
		await updateTask(taskId, data);
	};

	const handleSetStatus = async (
		task: Task,
		newStatus: "OPEN" | "PENDING" | "COMPLETED",
	) => {
		await setTaskStatus(task, newStatus);
	};

	// Handlers for Category
	const handleCreateCategory = async (data: {
		name: string;
		description: string | null;
		parentId: string | null;
	}) => {
		if (!user) return;
		setIsSubmitting(true);
		try {
			await createCategory(user.uid, data);
			setSelectedItem(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdateCategory = async (data: {
		name: string;
		description: string | null;
		parentId: string | null;
	}) => {
		if (!selectedCategory) return;
		setIsSubmitting(true);
		try {
			await updateCategory(selectedCategory.id, data);
			setSelectedItem(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggleCategoryStatus = async (category: Category) => {
		setIsSubmitting(true);
		try {
			await toggleCategoryStatus(category);
			setSelectedItem(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="flex-1 flex flex-col overflow-hidden">
			<div className="w-full max-w-6xl mx-auto flex-1 flex flex-col lg:flex-row bg-white border-x border-neutral-200 overflow-hidden shadow-sm h-full max-h-full">
				{/* Left Column: Tree View */}
				<div
					id="tree-pane"
					className={`${
						selectedItem ? "hidden lg:flex" : "flex"
					} w-full lg:w-1/2 flex-col bg-neutral-50/30 lg:border-r border-neutral-100/60 overflow-hidden shrink-0`}
				>
					<div className="flex items-center justify-between px-6 py-5 sm:px-8 bg-white/80 border-b border-neutral-100/60 backdrop-blur-md sticky top-0 z-20">
						<div className="flex items-center gap-3">
							<h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
								Tasks
							</h2>
							<div className="flex items-center gap-2">
								<button
									onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
									className={`p-2 rounded-xl transition-all duration-300 ml-1 ${
										isSettingsExpanded
											? "bg-amber-50 text-amber-600"
											: "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
									}`}
									title="Display Settings"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<circle cx="12" cy="12" r="3" />
										<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
									</svg>
								</button>
							</div>
						</div>
					</div>

					{/* Settings Panel */}
					<SettingsPanel
						isExpanded={isSettingsExpanded}
						startDateStr={startDateStr}
						setStartDateStr={setStartDateStr}
						endDateStr={endDateStr}
						setEndDateStr={setEndDateStr}
						limit={limit}
						setLimit={setLimit}
						tasksCount={tasks.length}
					/>

					<div className="flex-1 overflow-y-auto">
						<TaskTree
							tasks={tasks}
							categories={categories}
							selectedItem={selectedItem as any}
							onSelectTask={(id) => setSelectedItem({ type: "task", id })}
							onSelectCategory={(id) =>
								setSelectedItem({ type: "category", id })
							}
							onRequestNewBaseCategory={() =>
								setSelectedItem({ type: "new-category" })
							}
							onRequestNewSubcategory={(parentId) =>
								setSelectedItem({ type: "new-category", parentId })
							}
						/>
					</div>
				</div>

				{/* Right Column: Dynamic Details */}
				<div
					id="detail-pane"
					className={`${
						selectedItem ? "flex" : "hidden"
					} lg:flex w-full lg:w-1/2 flex-col bg-white overflow-hidden shrink-0`}
				>
					{selectedItem && (
						<div className="lg:hidden p-4 border-b border-neutral-100 flex items-center bg-white shrink-0 z-10 sticky top-0">
							<button
								onClick={() => setSelectedItem(null)}
								className="text-neutral-500 hover:text-neutral-800 flex items-center gap-2 font-bold text-sm bg-neutral-50 px-3 py-2 rounded-xl transition-colors"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m15 18-6-6 6-6" />
								</svg>
								Back to List
							</button>
						</div>
					)}
					{selectedItem?.type === "task" && selectedTaskWithCategory ? (
						<TaskDetail
							task={selectedTaskWithCategory}
							categories={activeCategories}
							onUpdate={handleUpdateTask}
							onSetStatus={handleSetStatus}
						/>
					) : selectedItem?.type === "category" && selectedCategory ? (
						<CategoryForm
							mode="edit"
							category={selectedCategory}
							baseCategories={baseCategories}
							isSubmitting={isSubmitting}
							onSubmit={handleUpdateCategory}
							onCancel={() => setSelectedItem(null)}
							onToggleStatus={handleToggleCategoryStatus}
							onCreateTask={() =>
								setSelectedItem({
									type: "new-task",
									parentId: selectedCategory.id,
								})
							}
						/>
					) : selectedItem?.type === "new-category" ? (
						<CategoryForm
							mode="create"
							baseCategories={baseCategories}
							isSubmitting={isSubmitting}
							onSubmit={handleCreateCategory}
							onCancel={() => setSelectedItem(null)}
							initialParentId={selectedItem.parentId}
						/>
					) : selectedItem?.type === "new-task" ? (
						<div className="p-8 sm:p-12 overflow-y-auto w-full h-full">
							<h2 className="text-2xl font-black text-neutral-900 mb-8 tracking-tight">
								Create Task
							</h2>
							<TaskForm
								categories={activeCategories}
								isSubmitting={isSubmitting}
								onSubmit={handleCreateTask}
								initialCategoryId={selectedItem.parentId}
							/>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto opacity-60">
							<div className="w-20 h-20 bg-neutral-50 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-neutral-100">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#6366f1"
									strokeWidth="2.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
									<polyline points="10 17 15 12 10 7" />
									<line x1="15" y1="12" x2="3" y2="12" />
								</svg>
							</div>
							<h2 className="text-xl font-black text-neutral-900 mb-2">
								Select an item
							</h2>
							<p className="text-neutral-500 text-sm leading-relaxed">
								Click a task or category from the list to view its details, or
								create a new one.
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
