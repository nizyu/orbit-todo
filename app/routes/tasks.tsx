import { createFileRoute } from "@tanstack/react-router";
import { AuthGuard } from "../components/AuthGuard";
import { TasksContent } from "../components/tasks/TasksContent";

export const Route = createFileRoute("/tasks")({
	component: TasksPage,
});

export function TasksPage() {
	return (
		<AuthGuard>
			<TasksContent />
		</AuthGuard>
	);
}
