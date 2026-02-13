/**
 * @filename: lint-staged.config.ts
 * @type {import('lint-staged').Configuration}
 */
export default {
	"*.ts": "biome format --write",
};
