import type { ActionContext, ActionSurface, FileAction } from "./types";

export function createActionRegistry(actions: FileAction[]) {
	return {
		getAll: () => actions,

		getById: (id: string) => actions.find((a) => a.id === id),

		getForSurface: (surface: ActionSurface, ctx: ActionContext) =>
			actions.filter((a) => a.surfaces.includes(surface) && a.enabled(ctx)),

		getGrouped: (surface: ActionSurface, ctx: ActionContext) => {
			const applicable = actions.filter(
				(a) => a.surfaces.includes(surface) && a.enabled(ctx),
			);

			const groups = new Map<string, FileAction[]>();
			for (const action of applicable) {
				const group = groups.get(action.group) ?? [];
				group.push(action);
				groups.set(action.group, group);
			}

			const order = ["quick", "organize", "library", "danger"];
			return order
				.filter((g) => groups.has(g))
				.map((g) => ({ group: g, actions: groups.get(g) ?? [] }));
		},

		execute: async (id: string, ctx: ActionContext) => {
			const action = actions.find((a) => a.id === id);
			if (action?.enabled(ctx)) {
				await action.execute(ctx);
			}
		},
	};
}

export type ActionRegistry = ReturnType<typeof createActionRegistry>;
