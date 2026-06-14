import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Category, CheckListItem } from "../../lib/firestore";

type TaskFormProps = {
	categories: Category[];
	isSubmitting?: boolean;
	onSubmit: (data: {
		title: string;
		description?: string | null;
		doneCriteria?: string | null;
		until_date?: Date | null;
		categoryId?: string | null;
		parentCategoryId?: string | null;
		check_list?: CheckListItem[];
	}) => Promise<void>;
	initialCategoryId?: string;
	initialData?: {
		title?: string;
		description?: string;
		doneCriteria?: string;
		checklist?: string[];
	};
};

export function TaskForm({
	categories,
	isSubmitting = false,
	onSubmit,
	initialCategoryId,
	initialData,
}: TaskFormProps) {
	const [checklist, setChecklist] = useState<string[]>(
		initialData?.checklist && initialData.checklist.length > 0
			? initialData.checklist
			: [""],
	);
	const [description, setDescription] = useState(
		initialData?.description || "",
	);
	const [doneCriteria, setDoneCriteria] = useState(
		initialData?.doneCriteria || "",
	);
	const [showPreview, setShowPreview] = useState(false);

	const addChecklistItem = () => {
		setChecklist([...checklist, ""]);
	};

	const removeChecklistItem = (index: number) => {
		const newChecklist = [...checklist];
		newChecklist.splice(index, 1);
		if (newChecklist.length === 0) {
			newChecklist.push("");
		}
		setChecklist(newChecklist);
	};

	const updateChecklistItem = (index: number, value: string) => {
		const newChecklist = [...checklist];
		newChecklist[index] = value;
		setChecklist(newChecklist);
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const form = e.currentTarget;
		const data = new FormData(form);

		const title = data.get("title") as string;
		const untilDateStr = data.get("until_date") as string;
		const categoryIdInput = (data.get("categoryId") as string) || null;
		let categoryId: string | null = null;
		let parentCategoryId: string | null = null;

		if (categoryIdInput) {
			const selectedCategory = categories.find((c) => c.id === categoryIdInput);
			if (selectedCategory) {
				if (selectedCategory.parentId) {
					categoryId = selectedCategory.id;
					parentCategoryId = selectedCategory.parentId;
				} else {
					categoryId = null;
					parentCategoryId = selectedCategory.id;
				}
			}
		}
		let until_date: Date | null = null;
		if (untilDateStr && untilDateStr.trim() !== "") {
			until_date = new Date(untilDateStr);
		}

		const check_list: CheckListItem[] = checklist
			.map((item) => item.trim())
			.filter((item) => item.length > 0)
			.map((title) => ({ title, completed: false }));

		await onSubmit({
			title,
			description: description.trim() || null,
			doneCriteria: doneCriteria.trim() || null,
			until_date,
			categoryId,
			parentCategoryId,
			check_list: check_list.length > 0 ? check_list : undefined,
		});

		// フォームリセット
		form.reset();
		setChecklist([""]);
		setDescription("");
		setDoneCriteria("");
		setShowPreview(false);
	};

	return (
		<form onSubmit={handleSubmit} className="mb-8">
			<div className="flex flex-col gap-6">
				<div>
					<label
						htmlFor="title"
						className="block text-sm font-semibold text-neutral-700 mb-2"
					>
						Title <span className="text-red-500">*</span>
					</label>
					<input
						type="text"
						name="title"
						id="title"
						required
						defaultValue={initialData?.title || ""}
						placeholder="What needs to be done?"
						className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-all duration-200 ease-in-out placeholder:text-neutral-400 border"
						disabled={isSubmitting}
					/>
				</div>

				<div>
					<div className="flex items-center justify-between mb-2">
						<label
							htmlFor="description"
							className="block text-sm font-semibold text-neutral-700"
						>
							Description
						</label>
						<div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
							<button
								type="button"
								onClick={() => setShowPreview(false)}
								className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
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
								className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
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
						<div className="block w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900 min-h-[120px] overflow-y-auto">
							<div className="markdown-body">
								{description ? (
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{description}
									</ReactMarkdown>
								) : (
									<span className="text-neutral-400 italic text-sm">
										Nothing to preview
									</span>
								)}
							</div>
						</div>
					) : (
						<textarea
							name="description"
							id="description"
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Add more details about this task... (Markdown supported)"
							className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-all duration-200 ease-in-out placeholder:text-neutral-400 border"
							disabled={isSubmitting}
						/>
					)}
				</div>

				<div>
					<label
						htmlFor="doneCriteria"
						className="block text-sm font-semibold text-neutral-700 mb-2"
					>
						Done Criteria
					</label>
					<textarea
						name="doneCriteria"
						id="doneCriteria"
						rows={2}
						value={doneCriteria}
						onChange={(e) => setDoneCriteria(e.target.value)}
						placeholder="What are the conditions for this task to be considered complete?"
						className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-all duration-200 ease-in-out placeholder:text-neutral-400 border"
						disabled={isSubmitting}
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div>
						<label
							htmlFor="until_date"
							className="block text-sm font-semibold text-neutral-700 mb-2"
						>
							Due Date
						</label>
						<input
							type="date"
							name="until_date"
							id="until_date"
							className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-all duration-200 ease-in-out border"
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label
							htmlFor="categoryId"
							className="block text-sm font-semibold text-neutral-700 mb-2"
						>
							Category
						</label>
						<select
							name="categoryId"
							id="categoryId"
							defaultValue={initialCategoryId || ""}
							className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm transition-all duration-200 ease-in-out border appearance-none"
							disabled={isSubmitting}
						>
							<option value="">None</option>
							{categories
								.filter((c) => !c.parentId)
								.map((baseCat) => (
									<optgroup key={baseCat.id} label={baseCat.name}>
										<option value={baseCat.id}>{baseCat.name}</option>
										{categories
											.filter((c) => c.parentId === baseCat.id)
											.map((subCat) => (
												<option key={subCat.id} value={subCat.id}>
													{` └ ${subCat.name}`}
												</option>
											))}
									</optgroup>
								))}
						</select>
					</div>
				</div>

				<div className="space-y-3">
					<label className="block text-sm font-semibold text-neutral-700 mb-2">
						Checklist
					</label>
					<div className="space-y-3">
						{checklist.map((item, index) => (
							<div key={index} className="flex gap-2 items-center group">
								<div className="flex-grow relative">
									<input
										type="text"
										name="check_list"
										value={item}
										onChange={(e) => updateChecklistItem(index, e.target.value)}
										placeholder={`Step ${index + 1}`}
										className="block w-full rounded-xl border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200 border"
										disabled={isSubmitting}
									/>
								</div>
								<button
									type="button"
									onClick={() => removeChecklistItem(index)}
									className="p-2.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
									disabled={isSubmitting}
									title="Remove item"
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
										<path d="M3 6h18" />
										<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
										<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
									</svg>
								</button>
							</div>
						))}
					</div>
					<button
						type="button"
						onClick={addChecklistItem}
						className="mt-2 flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-200 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100"
						disabled={isSubmitting}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="mr-2"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add Item
					</button>
				</div>

				<div className="flex justify-end pt-4 border-t border-neutral-100">
					<button
						type="submit"
						disabled={isSubmitting}
						className="inline-flex items-center justify-center rounded-xl border border-transparent bg-indigo-600 px-10 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out active:scale-95"
					>
						{isSubmitting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Adding...
							</>
						) : (
							"Create Task"
						)}
					</button>
				</div>
			</div>
		</form>
	);
}
