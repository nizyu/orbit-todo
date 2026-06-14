import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthGuard } from "../components/AuthGuard";
import { TasksContent } from "../components/tasks/TasksContent";

const tasksSearchSchema = z.object({
	showCompleted: z.boolean().optional().catch(false),
	selectedType: z
		.enum(["task", "category", "new-task", "new-category"])
		.optional(),
	selectedId: z.string().optional(),
	parentId: z.string().optional(),
});

export const Route = createFileRoute("/tasks")({
	validateSearch: (search) => tasksSearchSchema.parse(search),
	component: TasksPage,
});

export function TasksPage() {
	return (
		<AuthGuard>
			<TasksContent />
		</AuthGuard>
	);
}
