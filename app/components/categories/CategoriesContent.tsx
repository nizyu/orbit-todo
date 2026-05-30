import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../../lib/firebase-auth";
import {
	type Category,
	createCategory,
	subscribeCategories,
	toggleCategoryStatus,
	updateCategory,
} from "../../lib/firestore";
import { CategoryItem } from "./CategoryItem";

export function CategoriesContent() {
	const { user } = useAuth();
	const [categories, setCategories] = useState<Category[]>([]);
	const [editingCategory, setEditingCategory] = useState<Category | null>(null);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [description, setDescription] = useState("");
	const [showPreview, setShowPreview] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// カテゴリリアルタイム購読
	useEffect(() => {
		if (!user) return;
		const unsub = subscribeCategories(user.uid, (updated) =>
			setCategories(updated),
		);
		return unsub;
	}, [user]);

	const activeCategories = categories.filter((c) => c.status === "ACTIVE");
	const archivedCategories = categories.filter((c) => c.status === "ARCHIVED");
	const baseCategories = activeCategories.filter((c) => !c.parentId);

	const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!user) return;
		const data = new FormData(e.currentTarget);
		const name = data.get("name") as string;
		const parentId = (data.get("parentId") as string) || null;

		if (!name) return;
		setIsSubmitting(true);
		try {
			await createCategory(user.uid, {
				name,
				description: description.trim() || null,
				parentId,
			});
			setIsCreateModalOpen(false);
			setDescription("");
			setShowPreview(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!editingCategory) return;
		const data = new FormData(e.currentTarget);
		const name = data.get("name") as string;
		const parentId = (data.get("parentId") as string) || null;

		if (!name) return;
		setIsSubmitting(true);
		try {
			await updateCategory(editingCategory.id, {
				name,
				description: description.trim() || null,
				parentId,
			});
			setEditingCategory(null);
			setDescription("");
			setShowPreview(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggleStatus = async (category: Category) => {
		setIsSubmitting(true);
		try {
			await toggleCategoryStatus(category);
			setEditingCategory(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="flex-1 flex flex-col overflow-hidden">
			<div className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row bg-white border-x border-neutral-200 overflow-hidden shadow-sm h-full">
				{/* Left Pane: Categories List */}
				<div className="w-full lg:w-1/2 flex flex-col bg-neutral-50/30 border-r border-neutral-100/60 overflow-hidden">
					<div className="px-6 py-5 sm:px-8 bg-white border-b border-neutral-100 flex items-center justify-between sticky top-0 z-10">
						<h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">
							Categories
						</h2>
						<button
							onClick={() => {
								setEditingCategory(null);
								setDescription("");
								setIsCreateModalOpen(true);
							}}
							className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all scale-100 hover:scale-105 active:scale-95"
						>
							New Category
						</button>
					</div>

					<div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
						{/* Active Categories */}
						<div>
							<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 px-2">
								Active
							</h3>
							<div className="space-y-4">
								{baseCategories.length === 0 ? (
									<p className="text-sm text-neutral-400 italic px-2">
										No categories found.
									</p>
								) : (
									baseCategories.map((cat) => (
										<div key={cat.id} className="space-y-2">
											<CategoryItem
												category={cat}
												onEdit={() => {
													setEditingCategory(cat);
													setShowPreview(true);
													setDescription(cat.description || "");
													setIsCreateModalOpen(false);
												}}
											/>
											<div className="ml-6 space-y-2 border-l-2 border-neutral-100 pl-4">
												{cat.children
													?.filter((child) => child.status === "ACTIVE")
													.map((child) => (
														<CategoryItem
															key={child.id}
															category={{ ...child, parent: cat }}
															onEdit={() => {
																setEditingCategory({ ...child, parent: cat });
																setShowPreview(true);
																setDescription(child.description || "");
																setIsCreateModalOpen(false);
															}}
														/>
													))}
											</div>
										</div>
									))
								)}
							</div>
						</div>

						{/* Archived Categories */}
						{archivedCategories.length > 0 && (
							<div>
								<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-4 px-2">
									Archived
								</h3>
								<div className="space-y-2 opacity-60">
									{archivedCategories.map((cat) => (
										<CategoryItem
											key={cat.id}
											category={cat}
											onEdit={() => {
												setEditingCategory(cat);
												setDescription(cat.description || "");
												setIsCreateModalOpen(false);
											}}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Right Pane: Form / Details */}
				<div className="hidden lg:flex w-full lg:w-1/2 flex-col bg-white overflow-hidden p-8 sm:p-12 overflow-y-auto">
					{isCreateModalOpen || editingCategory ? (
						<div className="max-w-xl mx-auto w-full">
							<h2 className="text-2xl font-black text-neutral-900 mb-8 tracking-tight">
								{isCreateModalOpen ? "Create Category" : "Edit Category"}
							</h2>

							<form
								onSubmit={isCreateModalOpen ? handleCreate : handleUpdate}
								className="space-y-6"
							>
								<div>
									<label className="block text-sm font-bold text-neutral-700 mb-2">
										Name
									</label>
									<input
										type="text"
										name="name"
										required
										value={editingCategory?.name || ""}
										placeholder="e.g. Work, Private, Shopping"
										className="block w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all border"
									/>
								</div>

								{!editingCategory?.parentId && (
									<div>
										<label className="block text-sm font-bold text-neutral-700 mb-2">
											Base Category (Optional)
										</label>
										<select
											name="parentId"
											defaultValue={editingCategory?.parentId || ""}
											className="block w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all border appearance-none"
										>
											<option value="">None (This is a Base Category)</option>
											{baseCategories
												.filter((c) => c.id !== editingCategory?.id)
												.map((c) => (
													<option key={c.id} value={c.id}>
														{c.name}
													</option>
												))}
										</select>
										<p className="mt-2 text-[11px] text-neutral-400 font-medium">
											Subcategories cannot have their own subcategories.
										</p>
									</div>
								)}
								{editingCategory?.parentId && (
									<input
										type="hidden"
										name="parentId"
										value={editingCategory.parentId}
									/>
								)}

								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="block text-sm font-bold text-neutral-700">
											Description
										</label>
										<div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
											<button
												type="button"
												onClick={() => setShowPreview(false)}
												className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
													!showPreview
														? "bg-white text-indigo-600 shadow-sm"
														: "text-neutral-500 hover:text-neutral-700"
												}`}
											>
												Edit
											</button>
											<button
												type="button"
												onClick={() => setShowPreview(true)}
												className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
													showPreview
														? "bg-white text-indigo-600 shadow-sm"
														: "text-neutral-500 hover:text-neutral-700"
												}`}
											>
												Preview
											</button>
										</div>
									</div>
									{showPreview ? (
										<div className="block w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 min-h-[150px] max-h-[300px] overflow-y-auto">
											<div className="markdown-body">
												{description ? (
													<ReactMarkdown remarkPlugins={[remarkGfm]}>
														{description}
													</ReactMarkdown>
												) : (
													<span className="text-neutral-400 italic text-sm">
														No description provided.
													</span>
												)}
											</div>
										</div>
									) : (
										<textarea
											name="description"
											rows={5}
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											placeholder="What is this category for? (Markdown supported)"
											className="block w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all border"
										/>
									)}
								</div>

								<div className="flex items-center gap-3 pt-6 border-t border-neutral-100">
									<button
										type="submit"
										disabled={isSubmitting}
										className="flex-1 bg-indigo-600 text-white px-6 py-3.5 rounded-xl text-base font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
									>
										{isSubmitting
											? "Saving..."
											: isCreateModalOpen
												? "Create Category"
												: "Update Category"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsCreateModalOpen(false);
											setEditingCategory(null);
										}}
										className="px-6 py-3.5 text-neutral-500 font-bold hover:text-neutral-700 transition-colors"
									>
										Cancel
									</button>
								</div>
							</form>

							{!isCreateModalOpen && editingCategory && (
								<div className="mt-12 p-6 rounded-2xl bg-rose-50/50 border border-rose-100">
									<h4 className="text-sm font-bold text-rose-900 mb-2">
										Danger Zone
									</h4>
									<p className="text-xs text-rose-600/80 mb-4">
										Archiving a category will hide it from active lists. Tasks
										belonging to this category will remain, but the category
										itself will be marked as archived.
									</p>
									<button
										type="button"
										disabled={isSubmitting}
										onClick={() => handleToggleStatus(editingCategory)}
										className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
											editingCategory.status === "ARCHIVED"
												? "bg-emerald-600 text-white border-transparent hover:bg-emerald-700"
												: "bg-white text-rose-600 border-rose-200 hover:bg-rose-100"
										}`}
									>
										{editingCategory.status === "ARCHIVED"
											? "Restore Category"
											: "Archive Category"}
									</button>
								</div>
							)}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
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
									<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
								</svg>
							</div>
							<h2 className="text-xl font-black text-neutral-900 mb-2">
								Manage Categories
							</h2>
							<p className="text-neutral-500 text-sm leading-relaxed">
								Create and manage categories to keep your tasks organized. You
								can also nested subcategories for better classification.
							</p>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
