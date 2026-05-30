import { useState } from "react";
import type { Category, Todo as Task } from "../../lib/firestore";

type TaskTreeProps = {
	tasks: Task[];
	categories: Category[];
	selectedItem: { type: "task" | "category"; id: string } | null;
	onSelectTask: (id: string) => void;
	onSelectCategory: (id: string) => void;
	onRequestNewBaseCategory?: () => void;
	onRequestNewSubcategory?: (parentId: string) => void;
};

export function TaskTree({
	tasks,
	categories,
	selectedItem,
	onSelectTask,
	onSelectCategory,
	onRequestNewBaseCategory,
	onRequestNewSubcategory,
}: TaskTreeProps) {
	// 展開状態の管理（デフォルトで全て展開）
	const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
		const initial: Record<string, boolean> = { uncategorized: true };
		categories.forEach((c) => {
			initial[c.id] = true;
		});
		return initial;
	});

	const toggleExpand = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// タスクの所属先を計算
	const getTaskLocation = (task: Task) => {
		if (task.categoryId) {
			const cat = categories.find((c) => c.id === task.categoryId);
			if (cat) {
				if (cat.parentId) return { baseId: cat.parentId, subId: cat.id };
				return { baseId: cat.id, subId: null };
			}
		}
		if (task.parentCategoryId) {
			return { baseId: task.parentCategoryId, subId: null };
		}
		return { baseId: null, subId: null };
	};

	const groupedTasks = tasks.reduce(
		(acc, task) => {
			const loc = getTaskLocation(task);
			if (loc.subId) {
				if (!acc.sub[loc.subId]) acc.sub[loc.subId] = [];
				acc.sub[loc.subId].push(task);
			} else if (loc.baseId) {
				if (!acc.base[loc.baseId]) acc.base[loc.baseId] = [];
				acc.base[loc.baseId].push(task);
			} else {
				acc.uncategorized.push(task);
			}
			return acc;
		},
		{
			base: {} as Record<string, Task[]>,
			sub: {} as Record<string, Task[]>,
			uncategorized: [] as Task[],
		},
	);

	const baseCategories = categories.filter(
		(c) => !c.parentId && c.status === "ACTIVE",
	);

	// タスクのソート（完了済みは下へ）
	const sortTasks = (taskList: Task[]) => {
		return [...taskList].sort((a, b) => {
			if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
			if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1;
			// 期限が近いものを上に
			if (a.until_date && b.until_date)
				return a.until_date.getTime() - b.until_date.getTime();
			if (a.until_date && !b.until_date) return -1;
			if (!a.until_date && b.until_date) return 1;
			return b.createdAt.getTime() - a.createdAt.getTime();
		});
	};

	const renderTaskNode = (task: Task, level: number = 0) => {
		const isSelected =
			selectedItem?.type === "task" && selectedItem.id === task.id;
		return (
			<div
				key={`task-${task.id}`}
				onClick={() => onSelectTask(task.id)}
				className={`group flex items-center justify-between py-2 px-4 transition-colors cursor-pointer border-b border-neutral-100/40 last:border-b-0 ${
					isSelected ? "bg-indigo-50/80" : "hover:bg-neutral-50/80"
				}`}
				style={{ paddingLeft: `${Math.max(1, level * 1.5 + 1)}rem` }}
			>
				<div className="flex items-center gap-3 w-full">
					<span className="shrink-0 text-[13px]">
						{task.status === "COMPLETED"
							? "✅"
							: task.status === "PENDING"
								? "⏳"
								: "📝"}
					</span>
					<span
						className={`text-[13px] font-medium flex-grow truncate ${
							task.status === "COMPLETED"
								? "text-neutral-400 line-through"
								: "text-neutral-700"
						}`}
					>
						{task.title}
					</span>
					{task.until_date && (
						<span
							className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md ${
								new Date(task.until_date) < new Date() &&
								task.status !== "COMPLETED"
									? "bg-rose-50 text-rose-600 border border-rose-200"
									: "text-neutral-500"
							}`}
						>
							{new Date(task.until_date).toLocaleDateString(undefined, {
								month: "short",
								day: "numeric",
							})}
						</span>
					)}
				</div>
			</div>
		);
	};

	const renderCategoryNode = (category: Category, level: number = 0) => {
		const isSelected =
			selectedItem?.type === "category" && selectedItem.id === category.id;
		const isExpanded = expanded[category.id] !== false;
		const hasChildren = categories.some((c) => c.parentId === category.id);
		const tasksHere =
			level === 0
				? groupedTasks.base[category.id] || []
				: groupedTasks.sub[category.id] || [];

		const subCategories =
			level === 0
				? categories.filter(
						(c) => c.parentId === category.id && c.status === "ACTIVE",
					)
				: [];

		const isEmpty = !hasChildren && tasksHere.length === 0;

		return (
			<div
				key={`cat-${category.id}`}
				className="flex flex-col border-b border-neutral-100/60 last:border-b-0"
			>
				<div
					onClick={() => onSelectCategory(category.id)}
					className={`group flex items-center w-full gap-2 py-2.5 px-4 transition-colors cursor-pointer select-none ${
						isSelected ? "bg-indigo-100/50" : "hover:bg-neutral-100/50"
					}`}
					style={{ paddingLeft: `${Math.max(1, level * 1.5 + 1)}rem` }}
				>
					<button
						onClick={(e) => toggleExpand(category.id, e)}
						className={`p-1 rounded-md hover:bg-neutral-200/50 transition-colors ${isEmpty ? "invisible" : ""}`}
					>
						<svg
							className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : "rotate-0"}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M9 5l7 7-7 7"
							/>
						</svg>
					</button>
					<span className="text-[14px] font-bold text-neutral-800 flex items-center gap-2 flex-grow">
						{level === 0 ? "📁" : "📂"} {category.name}
					</span>
					{level === 0 && onRequestNewSubcategory && (
						<button
							onClick={(e) => {
								e.stopPropagation();
								onRequestNewSubcategory(category.id);
							}}
							className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all shrink-0"
							title="New Subcategory"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</button>
					)}
				</div>

				{/* Children */}
				<div
					className={`transition-all duration-300 ease-in-out overflow-hidden ${
						isExpanded ? "opacity-100 max-h-[5000px]" : "opacity-0 max-h-0"
					}`}
				>
					<div className="flex flex-col">
						{subCategories.map((subCat) =>
							renderCategoryNode(subCat, level + 1),
						)}
						{sortTasks(tasksHere).map((task) =>
							renderTaskNode(task, level + 1),
						)}

						{isExpanded &&
							!isEmpty &&
							subCategories.length === 0 &&
							tasksHere.length === 0 && (
								<div
									className="py-2 px-4 text-xs text-neutral-400 italic"
									style={{ paddingLeft: `${(level + 1) * 1.5 + 1}rem` }}
								>
									No items
								</div>
							)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="flex flex-col divide-y divide-neutral-200/60 bg-white min-h-full pb-20">
			{/* New Base Category Button */}
			{onRequestNewBaseCategory && (
				<div className="border-b border-neutral-100/60 p-3">
					<button
						onClick={onRequestNewBaseCategory}
						className="flex w-full items-center gap-2 px-3 py-2 text-[13px] font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100 border-dashed hover:border-solid"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						New Category
					</button>
				</div>
			)}

			{/* Base Categories */}
			{baseCategories.map((cat) => renderCategoryNode(cat, 0))}

			{/* Uncategorized Tasks */}
			{groupedTasks.uncategorized.length > 0 && (
				<div className="flex flex-col border-b border-neutral-100/60">
					<div
						onClick={() => {
							setExpanded((prev) => ({
								...prev,
								uncategorized: !prev.uncategorized,
							}));
						}}
						className="group flex items-center w-full gap-2 py-2.5 px-4 transition-colors cursor-pointer select-none hover:bg-neutral-100/50"
					>
						<button className={`p-1 rounded-md transition-colors`}>
							<svg
								className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${expanded.uncategorized !== false ? "rotate-90" : "rotate-0"}`}
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</button>
						<span className="text-[14px] font-bold text-neutral-500 italic flex items-center gap-2">
							📦 Uncategorized
						</span>
					</div>
					<div
						className={`transition-all duration-300 ease-in-out overflow-hidden ${
							expanded.uncategorized !== false
								? "opacity-100 max-h-[5000px]"
								: "opacity-0 max-h-0"
						}`}
					>
						<div className="flex flex-col bg-neutral-50/30">
							{sortTasks(groupedTasks.uncategorized).map((task) =>
								renderTaskNode(task, 1),
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
