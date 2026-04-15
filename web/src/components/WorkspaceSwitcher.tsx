import { SwitchWorkspaceMutation } from "@/features/workspaces/mutations";
import { MyWorkspacesQuery } from "@/features/workspaces/queries";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { ListBox, Select, Separator } from "@heroui/react";
import { ChevronsUpDown, Plus } from "lucide-react";
import type { Key } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "urql";

export function WorkspaceSwitcher() {
  const workspace = useWorkspaceStore((s) => s.workspace);
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace);
  const setToken = useAuthStore((s) => s.setToken);
  const navigate = useNavigate();
  const [{ data }] = useQuery({ query: MyWorkspacesQuery });
  const [, switchWorkspace] = useMutation(SwitchWorkspaceMutation);

  async function handleChange(id: Key) {
    const ws = data?.myWorkspaces.find((w) => w.id === id);
    if (!ws || ws.id === workspace?.id) return;

    const result = await switchWorkspace({ workspaceID: ws.id });
    if (result.error || !result.data) return;

    // Persist new scoped token and workspace before full reload
    setToken(result.data.switchWorkspace.accessToken);
    setWorkspace({ id: ws.id, name: ws.name, slug: ws.slug });
    window.location.href = "/";
  }

  return (
    <Select
      className="w-full"
      placeholder="Select workspace"
      value={workspace?.id ?? null}
      onChange={id => handleChange(id as Key)}
      variant="secondary"
    >
      <Select.Trigger>
        <span className="truncate text-sm">{workspace?.name}</span>
        <Select.Indicator className="size-3">
          <ChevronsUpDown />
        </Select.Indicator>
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {(data?.myWorkspaces ?? []).map((ws) => (
            <ListBox.Item key={ws.id} id={ws.id} textValue={ws.name}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-accent flex items-center justify-center shrink-0">
                  <span className="text-accent-foreground text-[9px] font-bold">
                    {ws.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {ws.name}
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
        <Separator />
        <div className="p-1">
          <button
            type="button"
            onClick={() => navigate({ to: "/workspaces/create" })}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted rounded hover:bg-default transition-colors"
          >
            <Plus size={14} />
            New workspace
          </button>
        </div>
      </Select.Popover>
    </Select>
  );
}
