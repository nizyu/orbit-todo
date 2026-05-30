import type { Category } from "../../lib/firestore";

export function CategoryItem({
	category,
	onEdit,
}: {
	category: Category & { parent?: Category | null };
	onEdit: () => void;
}) {
	return (
		<div
			onClick={onEdit}
			className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer"
		>
			<div className="flex items-center gap-4">
				<div
					className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
						category.parentId
							? "bg-amber-50 text-amber-600"
							: "bg-indigo-50 text-indigo-600"
					}`}
				>
					{category.name.charAt(0).toUpperCase()}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h4 className="text-sm font-bold text-neutral-800">
							{category.name}
						</h4>
					</div>
				</div>
			</div>
			<div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<button className="p-2 text-neutral-300 hover:text-indigo-600 transition-colors">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M12 20h9" />
						<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 9.5-9.5z" />
					</svg>
				</button>
			</div>
		</div>
	);
}
