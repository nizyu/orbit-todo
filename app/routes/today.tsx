import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/firebase-auth";
import {
	type Todo as Task,
	subscribeTodos,
	updateTodo,
	createInboxItem,
} from "../lib/firestore";

export const Route = createFileRoute("/today")({
	component: TodayPage,
});

function TodayPage() {
	const { user } = useAuth();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		const today = new Date();
		today.setHours(23, 59, 59, 999);
		const past = new Date(0);

		const unsub = subscribeTodos(
			user.uid,
			{
				startDate: past,
				endDate: today,
				maxLimit: 1000,
			},
			(data) => {
				setTasks(data);
				setIsLoading(false);
			},
			(err) => {
				console.error(err);
				setIsLoading(false);
			},
		);
		return () => unsub();
	}, [user]);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	const todayTasks = tasks.filter((task) => {
		if (task.status === "COMPLETED") return false;
		const hasTodayChecklist = task.check_list?.some(
			(item) => item.isToday && !item.completed,
		);
		const isDueToday =
			task.until_date &&
			task.until_date <= new Date(new Date().setHours(23, 59, 59, 999));
		return hasTodayChecklist || isDueToday;
	});

	const todayChecklists = todayTasks.flatMap((task) => {
		return (task.check_list || [])
			.map((item, index) => ({ ...item, task, index }))
			.filter((item) => item.isToday && !item.completed);
	});

	const dueTasks = todayTasks.filter(
		(task) =>
			task.until_date &&
			task.until_date <= new Date(new Date().setHours(23, 59, 59, 999)),
	);

	const handleCompleteChecklist = async (
		taskId: string,
		index: number,
		title: string,
	) => {
		const task = tasks.find((t) => t.id === taskId);
		if (!task || !task.check_list) return;

		const newChecklist = [...task.check_list];
		newChecklist[index].completed = true;

		await updateTodo(taskId, { check_list: newChecklist });
		await createInboxItem(task.userId, {
			content: `${task.title} - ${title}`,
			annotation: "DONE",
			isProcessed: true,
		});
	};

	return (
		<div className="flex-1 overflow-y-auto bg-neutral-50 p-8">
			<div className="max-w-4xl mx-auto space-y-12">
				<header>
					<h1 className="text-3xl font-black text-neutral-900 tracking-tight">
						Today's Plan
					</h1>
					<p className="text-neutral-500 mt-2 font-medium">
						{new Date().toLocaleDateString(undefined, {
							weekday: "long",
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</p>
				</header>

				{todayTasks.length === 0 ? (
					<div className="text-center py-20 bg-white rounded-3xl border border-neutral-100 shadow-sm">
						<svg
							className="mx-auto h-12 w-12 text-neutral-300 mb-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<h3 className="text-lg font-bold text-neutral-900">
							You're all caught up!
						</h3>
						<p className="text-neutral-500 mt-1">
							No tasks or checklist items scheduled for today.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<section className="space-y-6">
							<h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
								<svg
									className="w-5 h-5 text-indigo-500"
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
								Today's Action Items
							</h2>
							<div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
								{todayChecklists.length > 0 ? (
									<ul className="divide-y divide-neutral-100">
										{todayChecklists.map((item) => (
											<li
												key={`${item.task.id}-${item.index}`}
												className="p-5 flex items-start gap-4 hover:bg-neutral-50 transition-colors group"
											>
												<button
													type="button"
													onClick={() =>
														handleCompleteChecklist(
															item.task.id,
															item.index,
															item.title,
														)
													}
													className="mt-0.5 h-6 w-6 rounded-md border-2 border-neutral-300 bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-colors flex items-center justify-center flex-shrink-0"
												>
													<span className="sr-only">Mark as done</span>
												</button>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-bold text-neutral-900 group-hover:text-indigo-900 transition-colors">
														{item.title}
													</p>
													<Link
														to={`/tasks`}
														search={{
															categoryId: undefined,
															taskId: item.task.id,
														}}
														className="text-xs font-medium text-neutral-500 hover:text-indigo-600 transition-colors flex items-center gap-1 mt-1 truncate block"
													>
														<span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
														{item.task.title}
													</Link>
												</div>
											</li>
										))}
									</ul>
								) : (
									<div className="p-8 text-center text-neutral-400 text-sm font-medium">
										No specific checklist items marked for today.
									</div>
								)}
							</div>
						</section>

						<section className="space-y-6">
							<h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
								<svg
									className="w-5 h-5 text-rose-500"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								Due Today (or Overdue)
							</h2>
							<div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
								{dueTasks.length > 0 ? (
									<ul className="divide-y divide-neutral-100">
										{dueTasks.map((task) => (
											<li
												key={task.id}
												className="p-5 hover:bg-neutral-50 transition-colors group"
											>
												<Link
													to={`/tasks`}
													search={{ categoryId: undefined, taskId: task.id }}
													className="block"
												>
													<p className="text-sm font-bold text-neutral-900 group-hover:text-indigo-600 transition-colors">
														{task.title}
													</p>
													<p className="text-xs font-medium text-rose-500 mt-1">
														Due:{" "}
														{task.until_date
															? new Date(task.until_date).toLocaleDateString()
															: "Unknown"}
													</p>
												</Link>
											</li>
										))}
									</ul>
								) : (
									<div className="p-8 text-center text-neutral-400 text-sm font-medium">
										No tasks due today!
									</div>
								)}
							</div>
						</section>
					</div>
				)}
			</div>
		</div>
	);
}
