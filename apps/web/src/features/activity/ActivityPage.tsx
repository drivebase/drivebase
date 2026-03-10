import { ActivityTable } from "./components/ActivityTable";
import { useActivities } from "./hooks/useActivities";

export function ActivityPage() {
	const {
		activities,
		fetching,
		page,
		setPage,
		hasNextPage,
		totalPages,
		total,
		clearActivities,
	} = useActivities();

	return (
		<div className="flex flex-col h-full overflow-y-auto">
			<div className="flex-1 p-8">
				<ActivityTable
					activities={activities}
					fetching={fetching}
					page={page}
					hasNextPage={hasNextPage}
					totalPages={totalPages}
					total={total}
					onPageChange={setPage}
					onClear={clearActivities}
				/>
			</div>
		</div>
	);
}
