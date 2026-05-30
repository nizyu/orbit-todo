import { useEffect, useState } from "react";
import { useAuth } from "../../lib/firebase-auth";
import {
	deleteInboxItem,
	type InboxItem,
	subscribeInboxItems,
} from "../../lib/firestore";
import { IdeaifyModal } from "./IdeaifyModal";
import { TaskifyModal } from "./TaskifyModal";

const ANNOTATION_CONFIG: Record<
	string,
	{ emoji: string; color: string; label: string }
> = {
	NONE: { emoji: "➖", color: "text-neutral-400 bg-neutral-50", label: "None" },
	DO: { emoji: "✅", color: "text-indigo-600 bg-indigo-50", label: "Do" },
	WAIT: { emoji: "⏳", color: "text-amber-600 bg-amber-50", label: "Wait" },
	MEMO: { emoji: "📝", color: "text-emerald-600 bg-emerald-50", label: "Memo" },
	SEED: { emoji: "🌱", color: "text-rose-600 bg-rose-50", label: "Seed" },
	DONE: { emoji: "🎉", color: "text-green-600 bg-green-50", label: "Done" },
};
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text: string) {
	return text.split(URL_REGEX).map((part, index) => {
		if (part.match(URL_REGEX)) {
			return (
				<a
					key={index}
					href={part}
					target="_blank"
					rel="noopener noreferrer"
					className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 hover:decoration-indigo-600 underline-offset-2 transition-colors"
					onClick={(e) => e.stopPropagation()}
				>
					{part}
				</a>
			);
		}
		return part;
	});
}

export function InboxList() {
	const { user } = useAuth();
	const [items, setItems] = useState<InboxItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [showUnprocessedOnly, setShowUnprocessedOnly] = useState(false);
	const [showMemoOnly, setShowMemoOnly] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [taskifyingItem, setTaskifyingItem] = useState<InboxItem | null>(null);
	const [ideaifyingItem, setIdeaifyingItem] = useState<InboxItem | null>(null);

	useEffect(() => {
		if (!user) return;
		const unsubscribe = subscribeInboxItems(
			user.uid,
			(data) => {
				setItems(data);
				setIsLoading(false);
				setError(null);
			},
			(err) => {
				console.error("Failed to subscribe to inbox items:", err);
				setIsLoading(false);
				setError(err);
			},
		);
		return () => unsubscribe();
	}, [user]);

	const handleDelete = async (id: string) => {
		if (confirm("Are you sure you want to delete this item?")) {
			await deleteInboxItem(id);
		}
	};

	const handleIdeaify = (item: InboxItem) => {
		setIdeaifyingItem(item);
	};

	const filteredItems = items.filter((item) => {
		if (showUnprocessedOnly && item.isProcessed) {
			return false;
		}
		if (showMemoOnly && item.annotation !== "MEMO") {
			return false;
		}
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			if (!item.content.toLowerCase().includes(query)) {
				return false;
			}
		}
		return true;
	});

	if (isLoading) {
		return (
			<div className="text-center py-8 text-neutral-400 font-medium">
				Loading timeline...
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-8 text-rose-500 font-medium">
				Failed to load inbox items: {error.message}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed">
				<p className="text-neutral-500 font-medium">Your inbox is empty.</p>
				<p className="text-sm text-neutral-400 mt-1">
					Capture your thoughts, ideas, and tasks here.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral-50 p-4 rounded-xl border border-neutral-200">
				<div className="relative w-full md:w-72">
					<span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
						🔍
					</span>
					<input
						type="text"
						placeholder="Search items..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow placeholder-neutral-400"
					/>
					{searchQuery && (
						<button
							onClick={() => setSearchQuery("")}
							className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600"
						>
							✕
						</button>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-end">
					<label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors">
						<input
							type="checkbox"
							checked={showUnprocessedOnly}
							onChange={(e) => setShowUnprocessedOnly(e.target.checked)}
							className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300"
						/>
						未対処のみ表示
					</label>
					<label className="flex items-center gap-2 text-sm font-medium text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors">
						<input
							type="checkbox"
							checked={showMemoOnly}
							onChange={(e) => setShowMemoOnly(e.target.checked)}
							className="rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300"
						/>
						Memoのみ表示
					</label>
				</div>
			</div>

			{filteredItems.length === 0 ? (
				<div className="text-center py-8 text-neutral-500 text-sm">
					No items match the current filter.
				</div>
			) : (
				filteredItems.map((item) => {
					const config =
						ANNOTATION_CONFIG[item.annotation] || ANNOTATION_CONFIG.NONE;

					return (
						<div
							key={item.id}
							className={`bg-white border rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow group ${item.isProcessed ? "border-neutral-200/60 opacity-80" : "border-neutral-200"}`}
						>
							<div className="flex items-start gap-3">
								<div
									className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base ${config.color}`}
								>
									{config.emoji}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2 mb-1">
										<div className="flex items-center gap-2">
											<span className="text-xs font-bold text-neutral-900">
												{config.label}
											</span>
										</div>
										<span className="text-xs font-medium text-neutral-400 shrink-0">
											{item.createdAt
												? item.createdAt.toLocaleString()
												: "Just now"}
										</span>
									</div>

									<p className="text-neutral-800 whitespace-pre-wrap break-words leading-relaxed text-sm">
										{renderTextWithLinks(item.content)}
									</p>

									<div className="mt-2 flex flex-wrap gap-2 items-center justify-end">
										{!item.isProcessed ? (
											<div className="flex gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
												<button
													type="button"
													onClick={() => setTaskifyingItem(item)}
													className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
												>
													タスク化
												</button>
												<button
													type="button"
													onClick={() => handleIdeaify(item)}
													className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
												>
													アイデア化
												</button>
											</div>
										) : (
											<div className="text-[10px] font-bold flex gap-1">
												{item.annotation === "TODO" && (
													<span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
														タスク化済み
													</span>
												)}
												{item.annotation === "SEED" && (
													<span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
														アイデア化済み
													</span>
												)}
											</div>
										)}
										<button
											type="button"
											onClick={() => handleDelete(item.id)}
											className="text-xs font-bold text-neutral-400 hover:text-rose-600 bg-neutral-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 cursor-pointer"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
						</div>
					);
				})
			)}
			{taskifyingItem && (
				<TaskifyModal
					item={taskifyingItem}
					onClose={() => setTaskifyingItem(null)}
				/>
			)}
			{ideaifyingItem && (
				<IdeaifyModal
					item={ideaifyingItem}
					onClose={() => setIdeaifyingItem(null)}
				/>
			)}
		</div>
	);
}
