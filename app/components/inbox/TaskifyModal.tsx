import { useEffect, useState } from "react";
import { type SuggestForNewTask, suggestTaskFromInbox } from "../../lib/ai";
import { useAuth } from "../../lib/firebase-auth";
import {
	type Category,
	createTodo,
	type InboxItem,
	subscribeCategories,
	updateInboxItem,
} from "../../lib/firestore";
import { TaskForm } from "../tasks/TaskForm";

type Props = {
	item: InboxItem;
	onClose: () => void;
};

export function TaskifyModal({ item, onClose }: Props) {
	const { user } = useAuth();
	const [categories, setCategories] = useState<Category[]>([]);
	const [step, setStep] = useState<"prompt" | "generating" | "form">("prompt");
	const [prompt, setPrompt] = useState("");
	const [draftTask, setDraftTask] = useState<SuggestForNewTask | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;
		const unsub = subscribeCategories(user.uid, (data) => {
			const activeCategories = data.filter((c) => c.status === "ACTIVE");
			setCategories(activeCategories);
		});
		return () => unsub();
	}, [user]);

	const handleGenerate = async () => {
		setStep("generating");
		setError(null);
		try {
			const draft = await suggestTaskFromInbox(item.content, prompt);
			setDraftTask(draft);
			setStep("form");
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to generate task.");
			setStep("prompt");
		}
	};

	const handleSubmitTask = async (data: any) => {
		if (!user) return;
		try {
			await createTodo(user.uid, data);
			await updateInboxItem(item.id, { isProcessed: true, annotation: "DO" });
			onClose();
		} catch (err: any) {
			console.error(err);
			setError(err.message || "Failed to create task.");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
				<div className="p-6 border-b border-neutral-100 flex justify-between items-center sticky top-0 bg-white z-10">
					<h2 className="text-xl font-bold text-neutral-900">
						{step === "prompt"
							? "タスク化の準備"
							: step === "generating"
								? "AIがタスクを生成中..."
								: "タスクの作成"}
					</h2>
					<button
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600 p-2"
					>
						✕
					</button>
				</div>

				<div className="p-6">
					{error && (
						<div className="mb-4 p-4 text-sm text-red-600 bg-red-50 rounded-xl">
							{error}
						</div>
					)}

					{step === "prompt" && (
						<div className="space-y-4">
							<div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
								<h3 className="text-sm font-bold text-neutral-700 mb-2">
									対象のアイテム
								</h3>
								<p className="text-sm text-neutral-600 whitespace-pre-wrap">
									{item.content}
								</p>
							</div>

							<div>
								<label className="block text-sm font-semibold text-neutral-700 mb-2">
									補足指示 (オプション)
								</label>
								<textarea
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="例: フロントエンドの実装タスクとして作成して"
									rows={3}
									className="block w-full rounded-xl border-neutral-300 bg-neutral-50 px-4 py-3 text-neutral-900 shadow-sm focus:border-indigo-500 focus:bg-white focus:ring-indigo-500 sm:text-sm border"
								/>
							</div>

							<div className="flex justify-end pt-4">
								<button
									onClick={handleGenerate}
									className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-colors"
								>
									AIでドラフトを生成
								</button>
							</div>
						</div>
					)}

					{step === "generating" && (
						<div className="py-12 flex flex-col items-center justify-center space-y-4">
							<svg
								className="animate-spin h-8 w-8 text-indigo-600"
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
							<p className="text-neutral-500 font-medium">
								アイテムと指示からタスクを生成しています...
							</p>
						</div>
					)}

					{step === "form" && draftTask && (
						<TaskForm
							categories={categories}
							onSubmit={handleSubmitTask}
							initialData={{
								title: draftTask.title,
								description: draftTask.description,
								doneCriteria: draftTask.doneCriteria,
								checklist: draftTask.checklist.map((c) => c.title),
							}}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
