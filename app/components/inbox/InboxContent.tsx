import { InboxInput } from "./InboxInput";
import { InboxList } from "./InboxList";

export function InboxContent() {
	return (
		<main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
			<div className="max-w-2xl mx-auto flex flex-col gap-8">
				<div>
					<h2 className="text-2xl font-black tracking-tight text-neutral-900 mb-6">
						Inbox
					</h2>
					<InboxInput />
				</div>

				<div className="flex flex-col gap-4">
					<h3 className="text-lg font-bold text-neutral-900">Timeline</h3>
					<InboxList />
				</div>
			</div>
		</main>
	);
}
