import { describe, expect, it } from "vitest";
import { canApplyToAll, getPauseActions } from "./jobPauseUi";

describe("jobPauseUi", () => {
	it("limits root-folder pauses to duplicate and skip", () => {
		expect(
			getPauseActions({
				conflictKind: "folder-root",
				allowedResolutions: ["duplicate", "skip"],
				allowApplyToAll: false,
			}),
		).toEqual(["duplicate", "skip"]);
		expect(
			canApplyToAll({
				conflictKind: "folder-root",
				allowedResolutions: ["duplicate", "skip"],
				allowApplyToAll: false,
			}),
		).toBe(false);
	});

	it("keeps file conflict actions and apply-to-all enabled", () => {
		expect(
			getPauseActions({
				conflictKind: "file",
				allowedResolutions: ["duplicate", "overwrite", "skip"],
				allowApplyToAll: true,
			}),
		).toEqual(["duplicate", "overwrite", "skip"]);
		expect(
			canApplyToAll({
				conflictKind: "file",
				allowedResolutions: ["duplicate", "overwrite", "skip"],
				allowApplyToAll: true,
			}),
		).toBe(true);
	});
});
