import { useEffect, useMemo, useState } from "react";
import { useQuery } from "urql";
import { APP_METADATA_QUERY } from "@/shared/api/metadata";

const LOCAL_VERSION_KEY = "drivebase.local_version";
const LATEST_GITHUB_VERSION_KEY = "drivebase.latest_github_version";
const DEFAULT_GITHUB_REPO = "drivebase/drivebase";

function normalizeVersion(value?: string | null) {
	if (!value) return "";
	return value.trim().replace(/^v/i, "");
}

export function useAppUpdate() {
	const [{ data, fetching }] = useQuery({
		query: APP_METADATA_QUERY,
	});
	const [latestGithubVersion, setLatestGithubVersion] = useState<string | null>(
		null,
	);
	const [isCheckingLatest, setIsCheckingLatest] = useState(false);

	const currentVersion = data?.appMetadata?.version ?? null;
	const githubRepo = import.meta.env.VITE_GITHUB_REPO || DEFAULT_GITHUB_REPO;

	useEffect(() => {
		if (!currentVersion) return;

		let cancelled = false;
		const run = async () => {
			setIsCheckingLatest(true);
			try {
				const currentNormalized = normalizeVersion(currentVersion);
				const storedLocal =
					normalizeVersion(localStorage.getItem(LOCAL_VERSION_KEY)) ||
					currentNormalized;

				const response = await fetch(
					`https://api.github.com/repos/${githubRepo}/releases/latest`,
					{
						headers: {
							Accept: "application/vnd.github+json",
						},
					},
				);

				if (!response.ok) {
					return;
				}

				const payload = (await response.json()) as {
					tag_name?: string;
					name?: string;
				};
				const latest = normalizeVersion(payload.tag_name || payload.name || "");
				if (!latest || cancelled) {
					return;
				}

				setLatestGithubVersion(latest);
				localStorage.setItem(LATEST_GITHUB_VERSION_KEY, latest);
				localStorage.setItem(LOCAL_VERSION_KEY, currentNormalized);

				if (storedLocal !== currentNormalized) {
					localStorage.setItem(LOCAL_VERSION_KEY, currentNormalized);
				}
			} catch (_error) {
				const cachedLatest = normalizeVersion(
					localStorage.getItem(LATEST_GITHUB_VERSION_KEY),
				);
				if (cachedLatest && !cancelled) {
					setLatestGithubVersion(cachedLatest);
				}
			} finally {
				if (!cancelled) {
					setIsCheckingLatest(false);
				}
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [currentVersion, githubRepo]);

	const isUpdateAvailable = useMemo(() => {
		if (!currentVersion || !latestGithubVersion) return false;

		const localVersion =
			normalizeVersion(localStorage.getItem(LOCAL_VERSION_KEY)) ||
			normalizeVersion(currentVersion);
		return normalizeVersion(latestGithubVersion) !== localVersion;
	}, [currentVersion, latestGithubVersion]);

	return {
		currentVersion,
		latestGithubVersion,
		isChecking: fetching || isCheckingLatest,
		isUpdateAvailable,
		githubRepo,
	};
}
