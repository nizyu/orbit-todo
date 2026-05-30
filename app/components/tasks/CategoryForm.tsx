import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Category } from "../../lib/firestore";

export type CategoryFormProps = {
	mode: "create" | "edit";
	category?: Category | null;
	baseCategories: Category[];
	isSubmitting: boolean;
	onSubmit: (data: {
		name: string;
		description: string | null;
		parentId: string | null;
	}) => void;
	onCancel: () => void;
	onToggleStatus?: (category: Category) => void;
	onCreateTask?: () => void;
	onCreateSubcategory?: () => void;
	initialParentId?: string;
};

export function CategoryForm({
	mode,
	category,
	baseCategories,
	isSubmitting,
	onSubmit,
	onCancel,
	onToggleStatus,
	onCreateTask,
	onCreateSubcategory,
	initialParentId,
}: CategoryFormProps) {
	const [description, setDescription] = useState(category?.description || "");
	const [showPreview, setShowPreview] = useState(false);

	useEffect(() => {
		setDescription(category?.description || "");
		setShowPreview(false);
	}, [category]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const data = new FormData(e.currentTarget);
		const name = data.get("name") as string;
		const parentId = (data.get("parentId") as string) || null;

		if (!name) return;
		onSubmit({
			name,
			description: description.trim() || null,
			parentId,
		});
	};

	return (
		<div className="max-w-xl mx-auto w-full p-8 sm:p-12 overflow-y-auto">
			<div className="flex items-center justify-between mb-8">
				<h2 className="text-2xl font-black text-neutral-900 tracking-tight">
					{mode === "create" ? "Create Category" : "Edit Category"}
				</h2>
				{mode === "edit" && (
					<div className="flex items-center gap-2">
						{onCreateSubcategory && (
							<button
								type="button"
								onClick={onCreateSubcategory}
								className="flex items-center px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg text-sm font-bold transition-colors"
							>
								<svg
									className="w-4 h-4 mr-1.5"
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
								Subcategory
							</button>
						)}
						{onCreateTask && (
							<button
								type="button"
								onClick={onCreateTask}
								className="flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm font-bold transition-colors"
							>
								<svg
									className="w-4 h-4 mr-1.5"
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
								Task
							</button>
						)}
					</div>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label className="block text-sm font-bold text-neutral-700 mb-2">
						Name
					</label>
					<input
						type="text"
						name="name"
						required
						defaultValue={category?.name || ""}
						placeholder="e.g. Work, Private, Shopping"
						className="block w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all border"
					/>
				</div>

				{!category?.parentId && (
					<div>
						<label className="block text-sm font-bold text-neutral-700 mb-2">
							Base Category (Optional)
						</label>
						<select
							name="parentId"
							defaultValue={category?.parentId || initialParentId || ""}
							className="block w-full rounded-xl border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all border appearance-none"
						>
							<option value="">None (This is a Base Category)</option>
							{baseCategories
								.filter((c) => c.id !== category?.id)
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
				{category?.parentId && (
					<input type="hidden" name="parentId" value={category.parentId} />
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
							: mode === "create"
								? "Create Category"
								: "Update Category"}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="px-6 py-3.5 text-neutral-500 font-bold hover:text-neutral-700 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>

			{mode === "edit" && category && onToggleStatus && (
				<div className="mt-12 p-6 rounded-2xl bg-rose-50/50 border border-rose-100">
					<h4 className="text-sm font-bold text-rose-900 mb-2">Danger Zone</h4>
					<p className="text-xs text-rose-600/80 mb-4">
						Archiving a category will hide it from active lists. Tasks belonging
						to this category will remain, but the category itself will be marked
						as archived.
					</p>
					<button
						type="button"
						disabled={isSubmitting}
						onClick={() => onToggleStatus(category)}
						className={`w-full sm:w-auto px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
							category.status === "ARCHIVED"
								? "bg-emerald-600 text-white border-transparent hover:bg-emerald-700"
								: "bg-white text-rose-600 border-rose-200 hover:bg-rose-100"
						}`}
					>
						{category.status === "ARCHIVED"
							? "Restore Category"
							: "Archive Category"}
					</button>
				</div>
			)}
		</div>
	);
}
