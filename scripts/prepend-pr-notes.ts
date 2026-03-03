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

interface CategoryGroup extends LabelCategory {
	entries: string[];
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

const AREA_MAP: Record<string, string> = {
	"area: api": "api",
	"area: web": "web",
	"area: providers": "providers",
	"area: database": "db",
};

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
	const areas = pr.labels.filter((l) => AREA_MAP[l]).map((l) => AREA_MAP[l]);
	const areaTag = areas.length > 0 ? ` **[${areas.join(", ")}]**` : "";
	const link = `([#${pr.number}](${pr.html_url}))`;
	const bullets = extractBullets(pr.body);

	if (bullets) {
		return bullets.map((b) => `- ${b}${areaTag} ${link}`);
	}

	// Fallback to PR title — shouldn't reach here if the CI gate is enforced
	return [`- ${pr.title}${areaTag} ${link}`];
}

function generateSection(prs: PR[]): string {
	const groups = new Map<string, CategoryGroup>();
	const other: string[] = [];

	for (const pr of prs) {
		const entries = buildEntries(pr);
		const category = LABEL_CATEGORIES.find((c) => pr.labels.includes(c.label));

		if (category) {
			if (!groups.has(category.label)) {
				groups.set(category.label, { ...category, entries: [] });
			}
			groups.get(category.label)!.entries.push(...entries);
		} else {
			other.push(...entries);
		}
	}

	const lines: string[] = [];

	for (const cat of LABEL_CATEGORIES) {
		if (!groups.has(cat.label)) continue;
		const g = groups.get(cat.label)!;
		lines.push(`#### ${g.emoji} ${g.title}`);
		lines.push(...g.entries);
		lines.push("");
	}

	if (other.length > 0) {
		lines.push("#### 📋 Other");
		lines.push(...other);
		lines.push("");
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

	const insertAfter = headerMatch.index! + headerMatch[0].length;
	const before = changelog.slice(0, insertAfter);
	const after = changelog.slice(insertAfter);
	const block = `\n### Release Notes\n\n${section}\n\n---\n\n`;

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

console.log(`Found ${prs.length} merged PR(s)`);

if (prs.length === 0) {
	console.log("Nothing to prepend.");
	process.exit(0);
}

const section = generateSection(prs);
prependToChangelog(section);
