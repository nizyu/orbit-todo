import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { suggestResearchPlan } from "../../lib/ai";
import { useAuth } from "../../lib/firebase-auth";
import {
	createResearchPlan,
	type InboxItem,
	updateInboxItem,
} from "../../lib/firestore";

interface IdeaifyModalProps {
	item: InboxItem;
	onClose: () => void;
}

const DEFAULT_PROMPT =
	"このアイデアから、具体的なプロジェクト名を提案し、それをタスク化・実現するまでの確認事項や必要なステップをMarkdown形式のチェックリスト（確認リスト）として整理してください。";

export function IdeaifyModal({ item, onClose }: IdeaifyModalProps) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [generatedTitle, setGeneratedTitle] = useState("");
	const [generatedContent, setGeneratedContent] = useState("");

	const handleGenerate = async () => {
		setIsGenerating(true);
		setError(null);
		try {
			const result = await suggestResearchPlan(item.content, prompt);
			setGeneratedTitle(result.title);
			setGeneratedContent(result.content);
		} catch (err: any) {
			console.error("AI Generation failed:", err);
			setError(
				err.message || "AI生成に失敗しました。時間をおいて再度お試しください。",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSave = async () => {
		if (!user || !generatedTitle || !generatedContent) return;

		setIsSaving(true);
		setError(null);
		try {
			// 1. 調査計画を作成
			const planId = await createResearchPlan(user.uid, {
				title: generatedTitle,
				content: generatedContent,
				inboxItemId: item.id,
			});

			// 2. 元のインボックスアイテムを「対処済・Seed」に更新
			await updateInboxItem(item.id, {
				annotation: "SEED",
				isProcessed: true,
				targetPlanId: planId,
			});

			onClose();
			// 調査計画画面に遷移（クエリパラメータで新規作成したプランIDを渡す）
			navigate({ to: "/plans", search: { planId } });
		} catch (err: any) {
			console.error("Save plan failed:", err);
			setError(err.message || "調査計画の保存に失敗しました。");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
				{/* ヘッダー */}
				<div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
					<h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
						<span>🌱</span> アイデア化 (調査計画の生成)
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-lg hover:bg-neutral-100"
					>
						✕
					</button>
				</div>

				{/* コンテンツ */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{error && (
						<div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-4 py-3 rounded-xl animate-in fade-in duration-250">
							{error}
						</div>
					)}

					{/* 元のアイデア */}
					<div>
						<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
							元のアイデア
						</h4>
						<div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
							{item.content}
						</div>
					</div>

					{/* プロンプト入力 */}
					<div>
						<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
							AIへの指示プロンプト
						</h4>
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={3}
							className="w-full text-sm bg-white border border-neutral-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-neutral-400 resize-none"
							placeholder="AIへの詳細な指示を入力してください..."
							disabled={isGenerating || isSaving}
						/>
					</div>

					{/* 生成ボタン */}
					<div className="flex justify-end">
						<button
							type="button"
							onClick={handleGenerate}
							disabled={isGenerating || isSaving || !prompt.trim()}
							className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
						>
							{isGenerating ? (
								<>
									<svg
										className="animate-spin h-4 w-4 text-white"
										fill="none"
										viewBox="0 0 24 24"
									>
										<title>loading</title>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									生成中...
								</>
							) : (
								<>
									<span>✨</span> 調査計画を生成
								</>
							)}
						</button>
					</div>

					{/* 生成結果 */}
					{(generatedTitle || generatedContent) && (
						<div className="space-y-4 border-t border-neutral-200 pt-6 animate-in fade-in slide-in-from-top-4 duration-300">
							<div>
								<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
									提案されたプロジェクト名 (タイトル)
								</h4>
								<input
									type="text"
									value={generatedTitle}
									onChange={(e) => setGeneratedTitle(e.target.value)}
									className="w-full font-bold text-neutral-900 bg-white border border-neutral-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
									disabled={isSaving}
								/>
							</div>

							<div>
								<h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
									提案された調査計画 (Markdownプレビュー)
								</h4>
								<div className="border border-neutral-200 rounded-xl overflow-hidden">
									<div className="flex bg-neutral-50 border-b border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-500">
										Preview (Markdown)
									</div>
									<div className="p-4 max-h-60 overflow-y-auto text-neutral-700 bg-white leading-relaxed markdown-body">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{generatedContent}
										</ReactMarkdown>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* フッター */}
				<div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-3 font-bold text-sm">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-xl hover:bg-neutral-100 transition-colors"
						disabled={isSaving}
					>
						キャンセル
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !generatedTitle || !generatedContent}
						className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
					>
						{isSaving ? "保存中..." : "調査計画として保存して移動"}
					</button>
				</div>
			</div>
		</div>
	);
}
