export async function GET() {
  const url =
    "https://raw.githubusercontent.com/drivebase/drivebase/main/docker/compose.prod.yaml";

  const response = await fetch(url);

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/yaml",
      "Content-Disposition": "attachment; filename=compose.yml",
    },
  });
}
