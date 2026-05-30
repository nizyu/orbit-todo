import { useState } from "react";
import { useAuth } from "../../lib/firebase-auth";
import { createInboxItem, type InboxAnnotation } from "../../lib/firestore";

const ANNOTATIONS: {
	value: InboxAnnotation;
	label: string;
	emoji: string;
	color: string;
}[] = [
	{
		value: "NONE",
		label: "None",
		emoji: "➖",
		color: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
	},
	{
		value: "DO",
		label: "Do",
		emoji: "✅",
		color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
	},
	{
		value: "WAIT",
		label: "Wait",
		emoji: "⏳",
		color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
	},
	{
		value: "MEMO",
		label: "Memo",
		emoji: "📝",
		color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
	},
	{
		value: "SEED",
		label: "Seed",
		emoji: "🌱",
		color: "bg-rose-50 text-rose-700 hover:bg-rose-100",
	},
];

export function InboxInput() {
	const { user } = useAuth();
	const [content, setContent] = useState("");
	const [annotation, setAnnotation] = useState<InboxAnnotation>("NONE");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !content.trim()) return;

		setIsSubmitting(true);
		try {
			await createInboxItem(user.uid, {
				content: content.trim(),
				annotation,
			});
			setContent("");
			setAnnotation("NONE");
		} catch (error) {
			console.error("Failed to create inbox item:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-sm">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="What's on your mind?"
					className="w-full resize-none bg-neutral-50 rounded-xl p-4 min-h-[100px] text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow text-base sm:text-lg"
					disabled={isSubmitting}
				/>

				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div className="flex flex-wrap items-center gap-2">
						{ANNOTATIONS.map((ann) => (
							<button
								key={ann.value}
								type="button"
								onClick={() => setAnnotation(ann.value)}
								className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
									${annotation === ann.value ? "ring-2 ring-indigo-500 ring-offset-1 " + ann.color : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100"}
								`}
							>
								<span>{ann.emoji}</span>
								<span>{ann.label}</span>
							</button>
						))}
					</div>

					<button
						type="submit"
						disabled={!content.trim() || isSubmitting}
						className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
					>
						Post
					</button>
				</div>
			</form>
		</div>
	);
}
