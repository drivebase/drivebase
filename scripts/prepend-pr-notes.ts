#!/usr/bin/env bun
/**
 * Prepend human-written PR release notes to CHANGELOG.md.
 *
 * Usage: bun scripts/prepend-pr-notes.ts <latestTag>
 *   latestTag — the previous release tag (e.g. v1.1.0). Pass empty string for first release.
 *
 * Called via release-it's `after:bump` hook:
 *   "after:bump": "bun scripts/prepend-pr-notes.ts ${latestTag}"
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

interface LabelCategory {
	label: string;
	emoji: string;
	title: string;
}

interface PR {
	number: number;
	title: string;
	body: string | null;
	html_url: string;
	labels: string[];
	user: string;
}

interface Commit {
	sha: string;
	message: string;
	html_url: string;
	author: string;
}

interface ChangelogItem {
	title: string;
	body: string | null;
	url: string;
	labels: string[];
	kind: "pr" | "commit";
	number?: number;
	sha?: string;
}

type AreaKey = "api" | "web" | "providers" | "db" | "others";

interface CategoryGroup extends LabelCategory {
	areas: Record<AreaKey, string[]>;
}

// Label → changelog category mapping (order = priority in output)
const LABEL_CATEGORIES: LabelCategory[] = [
	{ label: "breaking change", emoji: "💥", title: "Breaking Changes" },
	{ label: "type: feature", emoji: "✨", title: "Features" },
	{ label: "type: bug", emoji: "🐛", title: "Bug Fixes" },
	{ label: "type: enhancement", emoji: "🔧", title: "Improvements" },
	{ label: "type: documentation", emoji: "📚", title: "Documentation" },
	{ label: "type: dependencies", emoji: "📦", title: "Dependencies" },
];

const AREA_MAP: Record<string, AreaKey> = {
	"area: api": "api",
	"area: web": "web",
	"area: providers": "providers",
	"area: database": "db",
};

const AREA_ALIASES: Record<string, AreaKey> = {
	api: "api",
	web: "web",
	provider: "providers",
	providers: "providers",
	db: "db",
	database: "db",
	others: "others",
	other: "others",
};

const AREA_ORDER: Array<{ key: AreaKey; title: string }> = [
	{ key: "api", title: "API" },
	{ key: "web", title: "Web" },
	{ key: "providers", title: "Providers" },
	{ key: "db", title: "Database" },
	{ key: "others", title: "Others" },
];

function run(cmd: string): string {
	return execSync(cmd, {
		encoding: "utf8",
		stdio: ["pipe", "pipe", "pipe"],
	}).trim();
}

function getTagDate(tag: string): string | null {
	try {
		return run(`git log -1 --format=%cI "${tag}"`);
	} catch {
		return null;
	}
}

function getRepo(): string {
	return run("gh repo view --json nameWithOwner -q .nameWithOwner");
}

function fetchMergedPRs(repo: string, sinceDate: string | null): PR[] {
	const queryParts = [
		`repo:${repo}`,
		"is:pr",
		"is:merged",
		"base:main",
		sinceDate ? `merged:>${sinceDate}` : "",
	].filter(Boolean);

	const query = encodeURIComponent(queryParts.join(" "));
	const jq =
		"[.items[] | {number,title,body,html_url,labels:[.labels[].name],user:.user.login}]";

	const json = run(
		`gh api "search/issues?q=${query}&sort=updated&order=desc&per_page=100" --jq '${jq}'`,
	);

	return JSON.parse(json) as PR[];
}

function fetchCommits(repo: string, sinceDate: string | null): Commit[] {
	const sincePart = sinceDate ? `&since=${encodeURIComponent(sinceDate)}` : "";
	const jq =
		"[.[] | {sha,message:.commit.message,html_url,author:(.author.login // .commit.author.name)}]";

	const json = run(
		`gh api "repos/${repo}/commits?sha=main&per_page=100${sincePart}" --jq '${jq}'`,
	);

	return JSON.parse(json) as Commit[];
}

function fetchPrCommitShas(repo: string, prs: PR[]): Set<string> {
	const shas = new Set<string>();

	for (const pr of prs) {
		try {
			const output = run(
				`gh api --paginate "repos/${repo}/pulls/${pr.number}/commits?per_page=100" --jq '.[].sha'`,
			);

			if (!output) continue;

			for (const sha of output.split("\n")) {
				const normalized = sha.trim();
				if (!normalized) continue;
				shas.add(normalized);
			}
		} catch (err) {
			console.warn(
				`Failed to fetch commit SHAs for PR #${pr.number}: ${(err as Error).message}`,
			);
		}
	}

	return shas;
}

function extractBullets(body: string | null): string[] | null {
	if (!body) return null;

	const match = body.match(
		/##\s+Release Notes?\s*\n([\s\S]*?)(?=\n##\s|\s*$)/i,
	);
	if (!match) return null;

	const bullets = match[1]
		.split("\n")
		.filter((l) => /^\s*[-*]\s+\S/.test(l))
		.map((l) => l.trim().replace(/^[-*]\s+/, ""));

	return bullets.length > 0 ? bullets : null;
}

function buildEntries(pr: PR): string[] {
	const link = `([#${pr.number}](${pr.html_url}))`;
	const bullets = extractBullets(pr.body);

	if (bullets) {
		return bullets.map((b) => `- ${b} ${link}`);
	}

	// Fallback to PR title — shouldn't reach here if the CI gate is enforced
	return [`- ${pr.title} ${link}`];
}

function buildCommitEntries(commit: Commit): string[] {
	const shortSha = commit.sha.slice(0, 7);
	const link = `([${shortSha}](${commit.html_url}))`;
	const bullets = extractBullets(commit.message);

	if (bullets) {
		return bullets.map((b) => `- ${b} ${link}`);
	}

	const title = commit.message.split("\n")[0]?.trim() || "Unnamed commit";
	return [`- ${title} ${link}`];
}

function extractCommitType(title: string): string | null {
	const conventionalType = title.match(/^([a-z]+)(?:\([^)]+\))?\s*!?\s*:/i);
	return conventionalType ? conventionalType[1].toLowerCase() : null;
}

function isDependencyCommit(title: string): boolean {
	const lower = title.toLowerCase();
	return lower.includes("deps") || lower.includes("dependenc");
}

function inferCategoryLabelFromTitle(title: string): string | null {
	if (isDependencyCommit(title)) return "type: dependencies";

	const commitType = extractCommitType(title);
	if (!commitType) return null;

	if (commitType === "feat") return "type: feature";
	if (commitType === "fix") return "type: bug";
	if (commitType === "docs") return "type: documentation";
	if (
		["refactor", "perf", "chore", "style", "test", "build", "ci"].includes(
			commitType,
		)
	) {
		return "type: enhancement";
	}

	return null;
}

function extractReferencedPrNumbers(text: string): number[] {
	const regex = /#(\d+)/g;
	const seen: Record<string, true> = {};
	const result: number[] = [];

	let match: RegExpExecArray | null = regex.exec(text);
	while (match) {
		const value = Number.parseInt(match[1], 10);
		const key = String(value);
		if (!seen[key]) {
			seen[key] = true;
			result.push(value);
		}
		match = regex.exec(text);
	}

	return result;
}

function isMergeCommit(message: string): boolean {
	const firstLine = message.split("\n")[0]?.trim().toLowerCase() ?? "";
	return (
		firstLine.startsWith("merge pull request #") ||
		firstLine.startsWith("merge branch ")
	);
}

function normalizeAreaCandidate(value: string): AreaKey | null {
	const normalized = value.trim().toLowerCase();
	return AREA_ALIASES[normalized] ?? null;
}

function extractAreaFromTitle(title: string): AreaKey | null {
	const conventionalScope = title.match(/^[a-z]+\(([^)]+)\)\s*!?\s*:/i);
	if (!conventionalScope) return null;

	const scope = conventionalScope[1];
	for (const token of scope.split(/[\s,/|+]+/)) {
		if (!token) continue;
		const area = normalizeAreaCandidate(token);
		if (area) return area;
	}

	return null;
}

function pickAreaFromItem(item: ChangelogItem): AreaKey {
	const areaLabel = item.labels.find((l) => AREA_MAP[l]);
	if (areaLabel) return AREA_MAP[areaLabel];

	const titleArea = extractAreaFromTitle(item.title);
	if (titleArea) return titleArea;

	return "others";
}

function createEmptyAreas(): Record<AreaKey, string[]> {
	return {
		api: [],
		web: [],
		providers: [],
		db: [],
		others: [],
	};
}

function generateSection(items: ChangelogItem[]): string {
	const groups = new Map<string, CategoryGroup>();
	const uncategorized = createEmptyAreas();
	const seenEntries = new Set<string>();

	const pushUniqueEntries = (target: string[], entries: string[]) => {
		for (const entry of entries) {
			if (seenEntries.has(entry)) continue;
			seenEntries.add(entry);
			target.push(entry);
		}
	};

	for (const item of items) {
		const entries =
			item.kind === "pr"
				? buildEntries({
						body: item.body,
						html_url: item.url,
						labels: item.labels,
						number: item.number ?? 0,
						title: item.title,
						user: "",
					})
				: buildCommitEntries({
						author: "",
						html_url: item.url,
						message: item.body ?? item.title,
						sha: item.sha ?? "",
					});

		const area = pickAreaFromItem(item);
		const inferredCategoryLabel =
			item.kind === "commit" ? inferCategoryLabelFromTitle(item.title) : null;
		const category = LABEL_CATEGORIES.find(
			(c) => item.labels.includes(c.label) || c.label === inferredCategoryLabel,
		);

		if (category) {
			if (!groups.has(category.label)) {
				groups.set(category.label, { ...category, areas: createEmptyAreas() });
			}
			const categoryGroup = groups.get(category.label);
			if (!categoryGroup) continue;
			pushUniqueEntries(categoryGroup.areas[area], entries);
		} else {
			pushUniqueEntries(uncategorized[area], entries);
		}
	}

	const lines: string[] = [];

	for (const cat of LABEL_CATEGORIES) {
		if (!groups.has(cat.label)) continue;
		const g = groups.get(cat.label);
		if (!g) continue;
		lines.push(`### ${g.title}`);

		for (const area of AREA_ORDER) {
			const entries = g.areas[area.key];
			if (entries.length === 0) continue;
			lines.push(`#### ${area.title}`);
			lines.push(...entries);
			lines.push("");
		}
	}

	const hasUncategorized = AREA_ORDER.some(
		(area) => uncategorized[area.key].length > 0,
	);

	if (hasUncategorized) {
		for (const area of AREA_ORDER) {
			const entries = uncategorized[area.key];
			if (entries.length === 0) continue;
			lines.push(`#### ${area.title}`);
			lines.push(...entries);
			lines.push("");
		}
	}

	return lines.join("\n").trimEnd();
}

function prependToChangelog(section: string): void {
	const changelog = readFileSync("CHANGELOG.md", "utf8");

	// Match the first `## [version]...` line written by conventional-changelog
	const headerMatch = changelog.match(/^(##\s+\[.*?\n)/m);
	if (!headerMatch) {
		console.warn(
			"Could not find a version header in CHANGELOG.md — skipping prepend.",
		);
		return;
	}

	if (typeof headerMatch.index !== "number") {
		console.warn(
			"Could not determine version header position in CHANGELOG.md — skipping prepend.",
		);
		return;
	}

	const insertAfter = headerMatch.index + headerMatch[0].length;
	const before = changelog.slice(0, insertAfter);
	const after = changelog.slice(insertAfter);
	const block = `\n\n${section}\n\n---\n\n`;

	writeFileSync("CHANGELOG.md", before + block + after, "utf8");
	console.log("✓ Prepended PR release notes to CHANGELOG.md");
}

// --- Main ---

const fromTag = process.argv[2];

if (!fromTag) {
	console.log("No previous tag provided, including all merged PRs.");
}

const tagDate = fromTag ? getTagDate(fromTag) : null;
if (tagDate) {
	console.log(`Fetching PRs merged after ${tagDate} (since tag: ${fromTag})`);
} else {
	console.log("Fetching all merged PRs (no baseline tag date found).");
}

let repo: string;
try {
	repo = getRepo();
} catch (err) {
	console.error(
		"Failed to detect repository from gh CLI:",
		(err as Error).message,
	);
	process.exit(1);
}

let prs: PR[];
try {
	prs = fetchMergedPRs(repo, tagDate);
} catch (err) {
	console.error("Failed to fetch PRs from GitHub:", (err as Error).message);
	process.exit(1);
}

let commits: Commit[];
try {
	commits = fetchCommits(repo, tagDate);
} catch (err) {
	console.error("Failed to fetch commits from GitHub:", (err as Error).message);
	process.exit(1);
}

const prNumbers = new Set(prs.map((pr) => pr.number));
const prCommitShas = fetchPrCommitShas(repo, prs);
const standaloneCommits = commits.filter((commit) => {
	if (prCommitShas.has(commit.sha)) return false;
	if (isMergeCommit(commit.message)) return false;
	const referencedPrNumbers = extractReferencedPrNumbers(commit.message);
	return !referencedPrNumbers.some((number) => prNumbers.has(number));
});

console.log(
	`Found ${prs.length} merged PR(s) and ${standaloneCommits.length} standalone commit(s)`,
);

if (prs.length === 0 && standaloneCommits.length === 0) {
	console.log("Nothing to prepend.");
	process.exit(0);
}

const items: ChangelogItem[] = [
	...prs.map((pr) => ({
		body: pr.body,
		kind: "pr" as const,
		labels: pr.labels,
		number: pr.number,
		title: pr.title,
		url: pr.html_url,
	})),
	...standaloneCommits.map((commit) => ({
		body: commit.message,
		kind: "commit" as const,
		labels: [],
		sha: commit.sha,
		title: commit.message.split("\n")[0]?.trim() || "Unnamed commit",
		url: commit.html_url,
	})),
];

const section = generateSection(items);
prependToChangelog(section);
