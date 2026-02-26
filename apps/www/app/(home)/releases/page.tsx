import {
  type GitHubRelease,
  ReleaseList,
} from "@/components/release/release-list";

export const revalidate = 3600;

export const metadata = {
  title: "Releases",
  description:
    "Stay up to date with the latest features and improvements in Drivebase.",
};

async function getReleases(): Promise<GitHubRelease[]> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/drivebase/drivebase/releases",
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch releases");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching releases:", error);
    return [];
  }
}

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <main className="min-h-screen pb-16 sm:pb-24 lg:pb-32 bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-l border-r border-border">
        <div className="pt-16">
          <div className="px-6 py-12 sm:py-16">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Releases
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Stay up to date with the latest features, improvements, and bug
                fixes in Drivebase.
              </p>
            </div>
          </div>
          <div className="h-px w-full bg-border" />

          <div className="px-6 py-10 sm:py-12">
            {releases.length > 0 ? (
              <ReleaseList items={releases} />
            ) : (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  No releases found or failed to load from GitHub.
                </p>
                <a
                  href="https://github.com/drivebase/drivebase/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-primary hover:underline"
                >
                  View on GitHub
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
