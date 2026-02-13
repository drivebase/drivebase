/**
 * @filename: lint-staged.config.ts
 * @type {import('lint-staged').Configuration}
 */
export default {
	"*": "biome format --write",
};
