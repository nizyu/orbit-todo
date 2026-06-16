import { useEffect, useState } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { refineResearchPlan } from "../../lib/ai";
import { useAuth } from "../../lib/firebase-auth";
import {
	createResearchPlan,
	deleteResearchPlan,
	type ResearchPlan,
	subscribeResearchPlans,
	updateResearchPlan,
} from "../../lib/firestore";

export function PlansContent() {
	const { user } = useAuth();
	const { planId } = useSearch({ from: "/plans" });
	const navigate = useNavigate({ from: "/plans" });

	const [plans, setPlans] = useState<ResearchPlan[]>([]);
	const selectedPlanId = planId || null;

	const setSelectedPlanId = (id: string | null) => {
		navigate({
			search: (prev) => ({
				...prev,
				planId: id || undefined,
			}),
		});
	};
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	// 編集用の一時的な状態
	const [editTitle, setEditTitle] = useState("");
	const [editContent, setEditContent] = useState("");
	const [isModified, setIsModified] = useState(false);

	// AI改善用の状態
	const [aiPrompt, setAiPrompt] = useState("");
	const [isRefining, setIsRefining] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);

	// タブ状態 ("EDIT" | "PREVIEW")
	const [activeTab, setActiveTab] = useState<"PREVIEW" | "EDIT">("PREVIEW");

	const selectedPlan = plans.find((p) => p.id === selectedPlanId);

	// リアルタイム購読
	useEffect(() => {
		if (!user) return;
		const unsubscribe = subscribeResearchPlans(
			user.uid,
			(data) => {
				setPlans(data);
				setIsLoading(false);
			},
			(err) => {
				console.error("Failed to subscribe plans:", err);
				setIsLoading(false);
			},
		);
		return () => unsubscribe();
	}, [user]);

	// 選択されたプランが変わった時に編集用状態を同期
	useEffect(() => {
		if (selectedPlan) {
			setEditTitle(selectedPlan.title);
			setEditContent(selectedPlan.content);
			setIsModified(false);
			setAiPrompt("");
			setAiError(null);
		} else {
			setEditTitle("");
			setEditContent("");
			setIsModified(false);
		}
	}, [selectedPlanId, selectedPlan]);

	const handleTitleChange = (val: string) => {
		setEditTitle(val);
		setIsModified(true);
	};

	const handleContentChange = (val: string) => {
		setEditContent(val);
		setIsModified(true);
	};

	// 保存
	const handleSave = async () => {
		if (!selectedPlanId || !editTitle.trim()) return;
		try {
			await updateResearchPlan(selectedPlanId, {
				title: editTitle.trim(),
				content: editContent,
			});
			setIsModified(false);
		} catch (err) {
			console.error("Failed to save plan:", err);
			alert("保存に失敗しました。");
		}
	};

	// 削除
	const handleDelete = async () => {
		if (!selectedPlanId) return;
		if (!confirm("この調査計画を削除してもよろしいですか？")) return;

		try {
			await deleteResearchPlan(selectedPlanId);
			setSelectedPlanId(null);
		} catch (err) {
			console.error("Failed to delete plan:", err);
			alert("削除に失敗しました。");
		}
	};

	// 新規作成
	const handleCreateNew = async () => {
		if (!user) return;
		try {
			const newId = await createResearchPlan(user.uid, {
				title: "新規調査計画",
				content:
					"# 新規調査計画\n\nここに計画の内容やAIで生成したMarkdownを記述します。\n\n## タスク化への確認リスト\n- [ ] 要件の定義\n- [ ] 調査の実行",
			});
			setSelectedPlanId(newId);
			setActiveTab("EDIT");
		} catch (err) {
			console.error("Failed to create plan:", err);
			alert("作成に失敗しました。");
		}
	};

	// AIでの改善
	const handleRefine = async () => {
		if (!aiPrompt.trim() || isRefining) return;
		setIsRefining(true);
		setAiError(null);
		try {
			const result = await refineResearchPlan(editTitle, editContent, aiPrompt);
			setEditTitle(result.title);
			setEditContent(result.content);
			setIsModified(true);
			setAiPrompt("");
			setActiveTab("PREVIEW"); // 改善後はプレビューで見せる
		} catch (err: any) {
			console.error("Refine failed:", err);
			setAiError(err.message || "AIによる改善に失敗しました。");
		} finally {
			setIsRefining(false);
		}
	};

	// フィルタリングされたプラン一覧
	const filteredPlans = plans.filter((p) =>
		p.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<main className="flex-1 overflow-hidden flex flex-row bg-neutral-100">
			{/* 左ペイン: 計画リスト */}
			<div className="w-80 border-r border-neutral-200 bg-white flex flex-col shrink-0 overflow-hidden">
				{/* 検索 & 新規作成 */}
				<div className="p-4 border-b border-neutral-200 flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-bold text-neutral-900">
							調査計画 (Plans)
						</h2>
						<button
							type="button"
							onClick={handleCreateNew}
							className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
							title="新規調査計画を作成"
						>
							<span>＋</span> 新規作成
						</button>
					</div>

					<div className="relative">
						<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400 text-sm">
							🔍
						</span>
						<input
							type="text"
							placeholder="計画を検索..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-8 pr-4 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
						/>
					</div>
				</div>

				{/* リスト */}
				<div className="flex-1 overflow-y-auto divide-y divide-neutral-150">
					{isLoading ? (
						<div className="text-center py-8 text-neutral-400 text-xs font-medium">
							読み込み中...
						</div>
					) : filteredPlans.length === 0 ? (
						<div className="text-center py-8 text-neutral-400 text-xs font-medium">
							調査計画がありません
						</div>
					) : (
						filteredPlans.map((plan) => (
							<button
								type="button"
								key={plan.id}
								onClick={() => setSelectedPlanId(plan.id)}
								className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 cursor-pointer ${
									selectedPlanId === plan.id
										? "bg-indigo-50/70 border-l-4 border-indigo-600 pl-3"
										: "hover:bg-neutral-50 border-l-4 border-transparent"
								}`}
							>
								<span className="font-bold text-sm text-neutral-900 line-clamp-1">
									{plan.title || "無題の調査計画"}
								</span>
								<span className="text-[10px] text-neutral-400 font-medium">
									更新: {plan.updatedAt.toLocaleString()}
								</span>
							</button>
						))
					)}
				</div>
			</div>

			{/* 右ペイン: 詳細編集 */}
			<div className="flex-1 overflow-y-auto bg-neutral-50 p-6 flex flex-col">
				{selectedPlan ? (
					<div className="max-w-4xl w-full mx-auto bg-white rounded-2xl border border-neutral-200 shadow-sm flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
						{/* 詳細ヘッダー */}
						<div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/50">
							<div className="flex-1 min-w-0">
								<input
									type="text"
									value={editTitle}
									onChange={(e) => handleTitleChange(e.target.value)}
									placeholder="調査計画のタイトル"
									className="w-full text-xl font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-indigo-600 focus:outline-none transition-colors py-1"
								/>
							</div>

							<div className="flex items-center gap-3 shrink-0">
								<button
									type="button"
									onClick={handleDelete}
									className="px-3 py-1.5 text-xs font-bold text-neutral-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-neutral-200 rounded-lg transition-colors cursor-pointer"
								>
									削除
								</button>
								<button
									type="button"
									onClick={handleSave}
									disabled={!isModified || !editTitle.trim()}
									className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-colors shadow-sm ${
										isModified
											? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
											: "bg-neutral-300 cursor-not-allowed opacity-80"
									}`}
								>
									{isModified ? "変更を保存" : "保存済"}
								</button>
							</div>
						</div>

						{/* エディタとプレビューのタブ */}
						<div className="border-b border-neutral-200 flex items-center justify-between px-6 py-2 bg-neutral-50/20">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => setActiveTab("PREVIEW")}
									className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
										activeTab === "PREVIEW"
											? "bg-indigo-600 text-white"
											: "text-neutral-600 hover:bg-neutral-100"
									}`}
								>
									プレビュー
								</button>
								<button
									type="button"
									onClick={() => setActiveTab("EDIT")}
									className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
										activeTab === "EDIT"
											? "bg-indigo-600 text-white"
											: "text-neutral-600 hover:bg-neutral-100"
									}`}
								>
									編集 (Markdown)
								</button>
							</div>
							<span className="text-[10px] font-bold text-neutral-400">
								{activeTab === "EDIT"
									? "Markdown形式で編集可能"
									: "Markdownプレビュー"}
							</span>
						</div>

						{/* メインエリア (タブで切り替え) */}
						<div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-200">
							{/* 本文エリア */}
							<div className="flex-1 overflow-y-auto p-6">
								{activeTab === "EDIT" ? (
									<textarea
										value={editContent}
										onChange={(e) => handleContentChange(e.target.value)}
										placeholder="ここにMarkdown形式で調査計画を記述します..."
										className="w-full h-full min-h-[300px] resize-none bg-neutral-50 rounded-xl p-4 text-sm text-neutral-800 border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition-all font-mono leading-relaxed"
									/>
								) : (
									<div className="p-4 overflow-y-auto text-neutral-700 bg-white leading-relaxed markdown-body">
										<ReactMarkdown remarkPlugins={[remarkGfm]}>
											{editContent ||
												"*本文がありません。編集タブから入力してください。*"}
										</ReactMarkdown>
									</div>
								)}
							</div>

							{/* AI改善用サイドバー */}
							<div className="w-full md:w-80 shrink-0 bg-neutral-50/50 p-6 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-neutral-200">
								<div>
									<h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
										<span>✨</span> AIで計画をブラッシュアップ
									</h4>
									<p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
										プロンプトを入力して、計画内容をさらに詳しく書き直したり、新しい検証項目を追加できます。
									</p>
								</div>

								{aiError && (
									<div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium p-2.5 rounded-lg animate-in fade-in">
										{aiError}
									</div>
								)}

								<textarea
									value={aiPrompt}
									onChange={(e) => setAiPrompt(e.target.value)}
									placeholder="例: この計画に競合調査のステップを追加して。 / リスク管理についてより詳細に解説を加えて。"
									rows={4}
									className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
									disabled={isRefining}
								/>

								<button
									type="button"
									onClick={handleRefine}
									disabled={isRefining || !aiPrompt.trim()}
									className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
								>
									{isRefining ? (
										<>
											<svg
												className="animate-spin h-3.5 w-3.5 text-white"
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
											改善中...
										</>
									) : (
										<>
											<span>✨</span> AIに改善を指示
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				) : (
					<div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border border-neutral-200 rounded-2xl">
						<span className="text-4xl mb-4">📋</span>
						<h3 className="font-bold text-neutral-700 text-base">
							調査計画が選択されていません
						</h3>
						<p className="text-xs text-neutral-400 mt-1 max-w-xs">
							左のリストから既存の計画を選択するか、新規作成ボタンから新しい調査計画を作成してください。
						</p>
						<button
							type="button"
							onClick={handleCreateNew}
							className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
						>
							新しい調査計画を作成
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
