import React from "react";

type SettingsPanelProps = {
	isExpanded: boolean;
	startDateStr: string;
	setStartDateStr: (val: string) => void;
	endDateStr: string;
	setEndDateStr: (val: string) => void;
	limit: number;
	setLimit: (val: number) => void;
	tasksCount: number;
};

export function SettingsPanel({
	isExpanded,
	startDateStr,
	setStartDateStr,
	endDateStr,
	setEndDateStr,
	limit,
	setLimit,
	tasksCount,
}: SettingsPanelProps) {
	return (
		<div
			className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
				isExpanded
					? "max-h-[200px] border-b border-neutral-100/50 px-6 py-4 sm:px-8 opacity-100 bg-amber-50/20"
					: "max-h-0 opacity-0"
			}`}
		>
			<div className="flex flex-wrap items-center gap-6">
				<div className="flex flex-col gap-1.5">
					<label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
						Range: Start
					</label>
					<input
						type="date"
						value={startDateStr}
						onChange={(e) => setStartDateStr(e.target.value)}
						className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
						Range: End
					</label>
					<input
						type="date"
						value={endDateStr}
						onChange={(e) => setEndDateStr(e.target.value)}
						className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-1">
						Max Items
					</label>
					<select
						value={limit}
						onChange={(e) => setLimit(Number(e.target.value))}
						className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all min-w-[80px]"
					>
						<option value="50">50</option>
						<option value="100">100</option>
						<option value="200">200</option>
						<option value="500">500</option>
					</select>
				</div>
				<div className="flex flex-col gap-1.5 ml-auto">
					<span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 text-right">
						Fetched
					</span>
					<span className="text-sm font-bold text-neutral-700 text-right">
						{tasksCount} {tasksCount >= limit ? "(Limit hit)" : "tasks"}
					</span>
				</div>
			</div>
		</div>
	);
}
