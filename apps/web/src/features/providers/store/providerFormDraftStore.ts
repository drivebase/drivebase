import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ProviderFormDrafts = Record<string, Record<string, unknown>>;

type ProviderFormDraftState = {
	drafts: ProviderFormDrafts;
	setDraft: (providerId: string, values: Record<string, unknown>) => void;
	clearDraft: (providerId: string) => void;
};

export const useProviderFormDraftStore = create<ProviderFormDraftState>()(
	persist(
		(set) => ({
			drafts: {},
			setDraft: (providerId, values) =>
				set((state) => ({
					drafts: { ...state.drafts, [providerId]: values },
				})),
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
