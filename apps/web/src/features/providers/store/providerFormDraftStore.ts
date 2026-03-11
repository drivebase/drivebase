import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProviderFormDrafts = Record<string, Record<string, unknown>>;

type ProviderFormDraftState = {
	drafts: ProviderFormDrafts;
	setDraft: (providerId: string, values: Record<string, unknown>) => void;
	clearDraft: (providerId: string) => void;
};

function areDraftValuesEqual(
	current: Record<string, unknown> | undefined,
	next: Record<string, unknown>,
) {
	if (!current) {
		return Object.keys(next).length === 0;
	}

	const currentKeys = Object.keys(current);
	const nextKeys = Object.keys(next);
	if (currentKeys.length !== nextKeys.length) {
		return false;
	}

	for (const key of nextKeys) {
		if (current[key] !== next[key]) {
			return false;
		}
	}

	return true;
}

export const useProviderFormDraftStore = create<ProviderFormDraftState>()(
	persist(
		(set) => ({
			drafts: {},
			setDraft: (providerId, values) =>
				set((state) => {
					if (areDraftValuesEqual(state.drafts[providerId], values)) {
						return state;
					}

					return {
						drafts: { ...state.drafts, [providerId]: values },
					};
				}),
			clearDraft: (providerId) =>
				set((state) => {
					const next = { ...state.drafts };
					delete next[providerId];
					return { drafts: next };
				}),
		}),
		{
			name: "drivebase-provider-form-drafts",
			storage: createJSONStorage(() => localStorage),
		},
	),
);
