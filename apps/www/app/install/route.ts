export async function GET() {
  const url =
    "https://raw.githubusercontent.com/drivebase/drivebase/main/scripts/install.sh";

  const response = await fetch(url);

  return new Response(response.body, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": "attachment; filename=install.sh",
    },
  });
}
