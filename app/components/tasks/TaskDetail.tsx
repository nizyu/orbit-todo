import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { suggestTaskRefinement } from "../../lib/ai";
import {
	type Category,
	type CheckListItem,
	createInboxItem,
	type Todo as Task,
} from "../../lib/firestore";

type TaskDetailProps = {
	task: (Task & { category?: Category | null }) | null;
	categories: Category[];
	onUpdate: (
		taskId: string,
		data: {
			title?: string;
			description?: string | null;
			doneCriteria?: string | null;
			until_date?: Date | null;
			categoryId?: string | null;
			check_list?: CheckListItem[] | null;
		},
	) => Promise<void>;
	onSetStatus: (
		task: Task,
		newStatus: "OPEN" | "PENDING" | "COMPLETED",
	) => Promise<void>;
};

export function TaskDetail({
	task,
	categories,
	onUpdate,
	onSetStatus,
}: TaskDetailProps) {
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editDoneCriteria, setEditDoneCriteria] = useState("");
	const [editUntilDate, setEditUntilDate] = useState("");
	const [editCategoryId, setEditCategoryId] = useState("");
	const [editChecklist, setEditChecklist] = useState<CheckListItem[]>([]);
	const [showPreview, setShowPreview] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isTogglingStatus, setIsTogglingStatus] = useState(false);
	const [isGeneratingAI, setIsGeneratingAI] = useState(false);
	const [aiAdvice, setAiAdvice] = useState("");

	useEffect(() => {
		if (task) {
			setEditTitle(task.title);
			setEditDescription(task.description || "");
			setEditDoneCriteria(task.doneCriteria || "");
			setEditUntilDate(
				task.until_date
					? new Date(task.until_date).toISOString().split("T")[0]
					: "",
			);
			setEditCategoryId(task.categoryId || "");
			setEditChecklist(Array.isArray(task.check_list) ? task.check_list : []);
			setShowPreview(true);
		}
	}, [task]);

	if (!task) {
		return (
			<div className="h-full flex flex-col items-center justify-center p-10 text-neutral-400">
				<div className="mb-4">
					<svg
						className="w-16 h-16 opacity-20"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
						/>
					</svg>
				</div>
				<p className="text-lg font-medium">Select a task to see details</p>
				<p className="text-sm mt-2 text-center text-neutral-400">
					Click on any task from the list on the left to view its full
					information and progress.
				</p>
			</div>
		);
	}

	const handleAddChecklistItem = () => {
		setEditChecklist([...editChecklist, { title: "", completed: false, isToday: false }]);
	};

	const handleRemoveChecklistItem = (index: number) => {
		const newChecklist = [...editChecklist];
		newChecklist.splice(index, 1);
		setEditChecklist(newChecklist);
	};

	const handleUpdateChecklistItem = (index: number, title: string) => {
		const newChecklist = [...editChecklist];
		newChecklist[index] = { ...newChecklist[index], title };
		setEditChecklist(newChecklist);
	};

	const handleToggleChecklistItem = async (index: number) => {
		if (!task) return;
		const newChecklist = [...editChecklist];
		const isCompleted = !newChecklist[index].completed;
		newChecklist[index] = {
			...newChecklist[index],
			completed: isCompleted,
		};
		setEditChecklist(newChecklist);

		// 即座に保存する
		try {
			await onUpdate(task.id, { check_list: newChecklist });
			if (isCompleted) {
				await createInboxItem(task.userId, {
					content: `${task.title} - ${newChecklist[index].title}`,
					annotation: "DONE",
				});
			}
		} catch (error) {
			console.error("Failed to update checklist item:", error);
		}
	};

	const handleUpdate = async () => {
		setIsSaving(true);
		try {
			let until_date: Date | null = null;
			if (editUntilDate && editUntilDate.trim() !== "") {
				until_date = new Date(editUntilDate);
			}
			await onUpdate(task.id, {
				title: editTitle,
				description: editDescription.trim() || null,
				doneCriteria: editDoneCriteria.trim() || null,
				until_date,
				categoryId: editCategoryId || null,
				check_list: editChecklist.length > 0 ? editChecklist : null,
			});
			setAiAdvice("");
		} finally {
			setIsSaving(false);
		}
	};

	const handleGenerateChecklist = async () => {
		if (!task) return;
		setIsGeneratingAI(true);
		try {
			const selectedCategory = categories.find((c) => c.id === editCategoryId);
			let baseCategory: (Category & { parent?: Category | null }) | null = null;
			let subCategory: Category | null = null;

			if (selectedCategory) {
				if (selectedCategory.parentId) {
					subCategory = selectedCategory;
					baseCategory =
						categories.find((c) => c.id === selectedCategory.parentId) || null;
				} else {
					baseCategory = selectedCategory;
				}
			}

			const result = await suggestTaskRefinement(
				editTitle,
				editDescription,
				editChecklist,
				baseCategory,
				subCategory,
			);

			if (result.checklist.length > 0) {
				setEditChecklist(result.checklist);
			}
			setAiAdvice(result.advice);
		} catch (error) {
			console.error("Failed to generate checklist:", error);
			alert("AIによるチェックリスト生成に失敗しました。");
		} finally {
			setIsGeneratingAI(false);
		}
	};

	const handleSetStatus = async (
		newStatus: "OPEN" | "PENDING" | "COMPLETED",
	) => {
		if (task.status === newStatus) return;
		setIsTogglingStatus(true);
		try {
			await onSetStatus(task, newStatus);
		} finally {
			setIsTogglingStatus(false);
		}
	};

	const isSubmitting = isSaving || isTogglingStatus;

	return (
		<div className="h-full flex flex-col p-8 overflow-y-auto bg-white">
			<div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-50">
				<div className="flex items-center gap-3">
					<div className="flex bg-neutral-100 p-1 rounded-xl items-center gap-1">
						<button
							type="button"
							onClick={() => handleSetStatus("OPEN")}
							disabled={isSubmitting || task.status === "OPEN"}
							className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
								task.status === "OPEN"
									? "bg-white text-indigo-600 shadow-sm border border-neutral-200"
									: "text-neutral-400 hover:text-indigo-500 hover:bg-neutral-50"
							}`}
						>
							Open
						</button>
						<button
							type="button"
							onClick={() => handleSetStatus("PENDING")}
							disabled={isSubmitting || task.status === "PENDING"}
							className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
								task.status === "PENDING"
									? "bg-amber-400 text-white shadow-sm border border-amber-500"
									: "text-neutral-400 hover:text-amber-500 hover:bg-neutral-50"
							}`}
						>
							Pending
						</button>
						<button
							type="button"
							onClick={() => handleSetStatus("COMPLETED")}
							disabled={isSubmitting || task.status === "COMPLETED"}
							className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
								task.status === "COMPLETED"
									? "bg-green-500 text-white shadow-sm border border-green-600"
									: "text-neutral-400 hover:text-green-500 hover:bg-neutral-50"
							}`}
						>
							Completed
						</button>
					</div>
					<div className="flex flex-col ml-2">
						<span className="text-xs font-medium text-neutral-400">
							Created {new Date(task.createdAt).toLocaleDateString()}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={handleUpdate}
					disabled={isSubmitting}
					className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
				>
					{isSaving ? (
						<svg
							className="animate-spin h-4 w-4 text-white"
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
					) : (
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
								d="M5 13l4 4L19 7"
							/>
						</svg>
					)}
					Update Task
				</button>
			</div>

			<div className="space-y-8">
				<div>
					<label
						htmlFor="edit-title"
						className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1"
					>
						Title
					</label>
					<input
						id="edit-title"
						type="text"
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						className="w-full text-3xl font-extrabold text-neutral-900 border-none focus:ring-0 outline-none pb-2 transition-colors placeholder:text-neutral-100"
						placeholder="Task title..."
						required
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<section>
						<h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
							<svg
								className="w-3.5 h-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2.5}
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							Due Date
						</h3>
						<input
							id="edit-until-date"
							type="date"
							value={editUntilDate}
							onChange={(e) => setEditUntilDate(e.target.value)}
							className="w-full p-4 rounded-2xl bg-neutral-50 border border-neutral-100/50 text-neutral-800 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
						/>
					</section>

					<section>
						<h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
							<svg
								className="w-3.5 h-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2.5}
									d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
								/>
							</svg>
							Category
						</h3>
						<select
							value={editCategoryId}
							onChange={(e) => setEditCategoryId(e.target.value)}
							className="w-full p-4 rounded-2xl bg-neutral-50 border border-neutral-100/50 text-neutral-800 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none"
						>
							<option value="">None</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</section>
				</div>

				<section>
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M4 6h16M4 12h16M4 18h7"
								/>
							</svg>
							Description
						</h3>
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
						<div className="w-full p-5 rounded-2xl bg-neutral-50 border border-neutral-100 min-h-[120px]">
							<div className="markdown-body">
								{editDescription ? (
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{editDescription}
									</ReactMarkdown>
								) : (
									<span className="text-neutral-300 italic">
										No description provided.
									</span>
								)}
							</div>
						</div>
					) : (
						<textarea
							id="edit-description"
							rows={4}
							value={editDescription}
							onChange={(e) => setEditDescription(e.target.value)}
							className="w-full p-5 rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-700 leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-neutral-300"
							placeholder="Add more details about this task... (Markdown supported)"
						/>
					)}
				</section>

				<section>
					<h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-4">
						<svg
							className="w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Done Criteria
					</h3>
					<textarea
						id="edit-done-criteria"
						rows={2}
						value={editDoneCriteria}
						onChange={(e) => setEditDoneCriteria(e.target.value)}
						className="w-full p-5 rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-700 leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-neutral-300"
						placeholder="What are the conditions for this task to be considered complete?"
					/>
				</section>

				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
							<svg
								className="w-4 h-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
								/>
							</svg>
							Checklist
						</h3>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleGenerateChecklist}
								disabled={isGeneratingAI}
								className="text-xs font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50 flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 transition-colors shadow-sm"
								title="Generate checklist using AI"
							>
								{isGeneratingAI ? (
									<svg
										className="animate-spin h-4 w-4"
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
								) : (
									"✨ Generate"
								)}
							</button>
							<button
								type="button"
								onClick={handleAddChecklistItem}
								className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2.5}
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									/>
								</svg>
								Add Item
							</button>
						</div>
					</div>
					{aiAdvice && (
						<div className="p-4 mb-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
							<div className="bg-amber-100 p-2 rounded-xl h-fit">
								<svg
									className="w-5 h-5 text-amber-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2.5}
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
							</div>
							<div className="space-y-1 flex-grow">
								<p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
									AI Advice
								</p>
								<div className="text-sm text-neutral-700 leading-relaxed font-medium markdown-body advice-markdown">
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{aiAdvice}
									</ReactMarkdown>
								</div>
							</div>
						</div>
					)}
					<div className="space-y-3">
						{editChecklist.map((item, index) => (
							<div key={index} className="flex gap-2 items-center">
								<div className="flex-grow flex items-center gap-3 p-3 rounded-xl border border-neutral-100 bg-neutral-50">
									<button
										type="button"
										onClick={() => handleToggleChecklistItem(index)}
										className={`h-5 w-5 rounded border transition-colors flex items-center justify-center ${
											item.completed
												? "bg-indigo-600 border-indigo-600 text-white"
												: "bg-white border-neutral-300 hover:border-indigo-400"
										}`}
									>
										{item.completed && (
											<svg
												className="w-3.5 h-3.5"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={4}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										)}
									</button>
									<input
										type="text"
										value={item.title}
										onChange={(e) =>
											handleUpdateChecklistItem(index, e.target.value)
										}
										placeholder="Checklist item..."
										className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-medium text-neutral-700 p-0"
									/>
									<button
										type="button"
										onClick={async () => {
											const newChecklist = [...editChecklist];
											newChecklist[index].isToday = !newChecklist[index].isToday;
											setEditChecklist(newChecklist);
											if (task) {
												await onUpdate(task.id, { check_list: newChecklist });
											}
										}}
										className={`p-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 ${
											item.isToday
												? "bg-amber-100 text-amber-700 border border-amber-200"
												: "bg-white text-neutral-400 border border-neutral-200 hover:bg-neutral-50 hover:text-neutral-600"
										}`}
										title={item.isToday ? "Remove from Today" : "Add to Today"}
									>
										<svg
											className="w-3 h-3"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2.5}
										>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
										</svg>
										Today
									</button>
								</div>
								<button
									type="button"
									onClick={() => handleRemoveChecklistItem(index)}
									className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
								>
									<svg
										className="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						))}
						{editChecklist.length === 0 && (
							<div className="p-5 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 text-xs text-center bg-neutral-50/20 italic">
								No items in checklist.
							</div>
						)}
					</div>
				</section>
			</div>
		</div>
	);
}
