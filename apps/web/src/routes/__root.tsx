import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

import appCss from "@drivebase/ui/globals.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Drivebase",
      },
      {
        name: "description",
        content:
          "Drivebase is a desktop-style file workspace for browsing, moving, and managing files across connected storage providers.",
      },
      {
        name: "theme-color",
        content: "#111318",
      },
    ],
    links: [
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

// Runs before React hydration and before the body paints. Dark is the product
// default; persisted state may explicitly switch back to light.
const themeBootScript = `(function(){try{document.documentElement.classList.add('dark');var r=localStorage.getItem('drivebase:theme');if(!r)return;var s=JSON.parse(r);if(s&&s.state&&s.state.theme==='light')document.documentElement.classList.remove('dark')}catch(e){document.documentElement.classList.add('dark')}})();`

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
