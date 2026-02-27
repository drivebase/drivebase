import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "drivebase",
  repo: "drivebase",
  branch: "main",
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <Image
          src="https://raw.githubusercontent.com/drivebase/drivebase/main/drivebase.svg"
          alt="Drivebase Logo"
          width={32}
          height={32}
        />
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
