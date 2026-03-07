"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";

interface Workspace {
  id: string;
  name: string;
}

interface Space {
  id: string;
  name: string;
}

interface Folder {
  id: string;
  name: string;
}

interface ExistingConfig {
  workspace_id: string;
  workspace_name?: string;
  space_id: string;
  space_name?: string;
  folder_id?: string;
  folder_name?: string;
}

export function ClickUpConfigModal({
  open,
  onClose,
  existingConfig,
}: {
  open: boolean;
  onClose: () => void;
  existingConfig?: ExistingConfig | null;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    existingConfig?.workspace_id ?? ""
  );
  const [selectedWorkspaceName, setSelectedWorkspaceName] = useState<string>(
    existingConfig?.workspace_name ?? ""
  );
  const [selectedSpace, setSelectedSpace] = useState<string>(
    existingConfig?.space_id ?? ""
  );
  const [selectedSpaceName, setSelectedSpaceName] = useState<string>(
    existingConfig?.space_name ?? ""
  );
  const [selectedFolder, setSelectedFolder] = useState<string>(
    existingConfig?.folder_id ?? ""
  );
  const [selectedFolderName, setSelectedFolderName] = useState<string>(
    existingConfig?.folder_name ?? ""
  );

  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces on open
  useEffect(() => {
    if (!open) return;
    setLoadingWorkspaces(true);
    fetch("/api/user/connectors/clickup/workspaces")
      .then((r) => r.json())
      .then((data) => {
        const teams = data.teams ?? [];
        setWorkspaces(teams);
        // Auto-select if single workspace
        if (teams.length === 1 && !selectedWorkspace) {
          setSelectedWorkspace(teams[0].id);
          setSelectedWorkspaceName(teams[0].name);
        }
      })
      .catch(() => setError("Failed to load ClickUp workspaces"))
      .finally(() => setLoadingWorkspaces(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on existingConfig change
  useEffect(() => {
    if (existingConfig) {
      setSelectedWorkspace(existingConfig.workspace_id);
      setSelectedWorkspaceName(existingConfig.workspace_name ?? "");
      setSelectedSpace(existingConfig.space_id);
      setSelectedSpaceName(existingConfig.space_name ?? "");
      setSelectedFolder(existingConfig.folder_id ?? "");
      setSelectedFolderName(existingConfig.folder_name ?? "");
    }
  }, [existingConfig]);

  // Fetch spaces when workspace selected
  useEffect(() => {
    if (!selectedWorkspace) {
      setSpaces([]);
      return;
    }
    setLoadingSpaces(true);
    fetch(`/api/user/connectors/clickup/spaces?workspaceId=${selectedWorkspace}`)
      .then((r) => r.json())
      .then((data) => setSpaces(data.spaces ?? []))
      .catch(() => setError("Failed to load spaces"))
      .finally(() => setLoadingSpaces(false));
  }, [selectedWorkspace]);

  // Fetch folders when space selected
  useEffect(() => {
    if (!selectedSpace) {
      setFolders([]);
      return;
    }
    setLoadingFolders(true);
    fetch(`/api/user/connectors/clickup/folders?spaceId=${selectedSpace}`)
      .then((r) => r.json())
      .then((data) => setFolders(data.folders ?? []))
      .catch(() => setError("Failed to load folders"))
      .finally(() => setLoadingFolders(false));
  }, [selectedSpace]);

  async function handleSave() {
    if (!selectedWorkspace || !selectedSpace) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/connectors/clickup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: selectedWorkspace,
          workspace_name: selectedWorkspaceName,
          space_id: selectedSpace,
          space_name: selectedSpaceName,
          folder_id: selectedFolder || undefined,
          folder_name: selectedFolderName || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onClose();
      window.location.reload();
    } catch {
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  // Build breadcrumb
  const breadcrumb = [selectedWorkspaceName, selectedSpaceName, selectedFolderName]
    .filter(Boolean)
    .join(" > ");

  return (
    <Modal open={open} onClose={onClose} title="Configure ClickUp">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red/10 px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}

        {/* Workspace Selector */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-text">
            Workspace
          </label>
          <select
            value={selectedWorkspace}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              setSelectedWorkspace(e.target.value);
              setSelectedWorkspaceName(ws?.name ?? "");
              setSelectedSpace("");
              setSelectedSpaceName("");
              setSelectedFolder("");
              setSelectedFolderName("");
              setSpaces([]);
              setFolders([]);
            }}
            disabled={loadingWorkspaces}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
          >
            <option value="">
              {loadingWorkspaces ? "Loading..." : "Select a workspace"}
            </option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        {/* Space Selector */}
        {selectedWorkspace && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-text">
              Space
            </label>
            <select
              value={selectedSpace}
              onChange={(e) => {
                const sp = spaces.find((s) => s.id === e.target.value);
                setSelectedSpace(e.target.value);
                setSelectedSpaceName(sp?.name ?? "");
                setSelectedFolder("");
                setSelectedFolderName("");
                setFolders([]);
              }}
              disabled={loadingSpaces}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
            >
              <option value="">
                {loadingSpaces ? "Loading..." : "Select a space"}
              </option>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Folder Selector (Optional) */}
        {selectedSpace && folders.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-text">
              Folder{" "}
              <span className="font-normal text-muted2">(optional)</span>
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => {
                const fl = folders.find((f) => f.id === e.target.value);
                setSelectedFolder(e.target.value);
                setSelectedFolderName(fl?.name ?? "");
              }}
              disabled={loadingFolders}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
            >
              <option value="">No folder (Space root)</option>
              {folders.map((fl) => (
                <option key={fl.id} value={fl.id}>
                  {fl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Breadcrumb Preview */}
        {breadcrumb && (
          <div className="rounded-lg border border-brand/20 bg-brand-lt px-3 py-2.5 text-[13px]">
            <span className="font-medium text-brand">Docs will be created in: </span>
            <span className="text-text">{breadcrumb}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-[9px] border border-border px-4 py-2 text-xs font-medium text-muted2 transition-colors hover:bg-bg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedWorkspace || !selectedSpace}
            className="rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
