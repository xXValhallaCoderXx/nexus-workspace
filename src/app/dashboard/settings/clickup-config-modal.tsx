"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import {
  SettingsMetaPill,
  SettingsNote,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "./settings-ui";

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

  useEffect(() => {
    if (!open) return;
    setSelectedWorkspace(existingConfig?.workspace_id ?? "");
    setSelectedWorkspaceName(existingConfig?.workspace_name ?? "");
    setSelectedSpace(existingConfig?.space_id ?? "");
    setSelectedSpaceName(existingConfig?.space_name ?? "");
    setSelectedFolder(existingConfig?.folder_id ?? "");
    setSelectedFolderName(existingConfig?.folder_name ?? "");
    setError(null);
  }, [existingConfig, open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadWorkspaces() {
      setLoadingWorkspaces(true);
      try {
        const res = await fetch("/api/user/connectors/clickup/workspaces");
        const data = (await res.json()) as {
          teams?: Workspace[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(
            data.error ?? data.message ?? "Failed to load ClickUp workspaces"
          );
        }
        if (cancelled) return;
        const teams = data.teams ?? [];
        setWorkspaces(teams);
        if (teams.length === 1 && !(existingConfig?.workspace_id ?? "")) {
          setSelectedWorkspace(teams[0].id);
          setSelectedWorkspaceName(teams[0].name);
        }
      } catch (workspaceError) {
        if (!cancelled) {
          setError(
            workspaceError instanceof Error
              ? workspaceError.message
              : "Failed to load ClickUp workspaces"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingWorkspaces(false);
        }
      }
    }

    void loadWorkspaces();

    return () => {
      cancelled = true;
    };
  }, [existingConfig?.workspace_id, open]);

  useEffect(() => {
    if (!open) return;
    if (!selectedWorkspace) {
      setSpaces([]);
      setLoadingSpaces(false);
      return;
    }

    let cancelled = false;

    async function loadSpaces() {
      setLoadingSpaces(true);
      try {
        const res = await fetch(
          `/api/user/connectors/clickup/spaces?workspaceId=${selectedWorkspace}`
        );
        const data = (await res.json()) as {
          spaces?: Space[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? data.message ?? "Failed to load spaces");
        }
        if (!cancelled) {
          setSpaces(data.spaces ?? []);
        }
      } catch (spaceError) {
        if (!cancelled) {
          setError(
            spaceError instanceof Error
              ? spaceError.message
              : "Failed to load spaces"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSpaces(false);
        }
      }
    }

    void loadSpaces();

    return () => {
      cancelled = true;
    };
  }, [open, selectedWorkspace]);

  useEffect(() => {
    if (!open) return;
    if (!selectedSpace) {
      setFolders([]);
      setLoadingFolders(false);
      return;
    }

    let cancelled = false;

    async function loadFolders() {
      setLoadingFolders(true);
      try {
        const res = await fetch(
          `/api/user/connectors/clickup/folders?spaceId=${selectedSpace}`
        );
        const data = (await res.json()) as {
          folders?: Folder[];
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? data.message ?? "Failed to load folders");
        }
        if (!cancelled) {
          setFolders(data.folders ?? []);
        }
      } catch (folderError) {
        if (!cancelled) {
          setError(
            folderError instanceof Error
              ? folderError.message
              : "Failed to load folders"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingFolders(false);
        }
      }
    }

    void loadFolders();

    return () => {
      cancelled = true;
    };
  }, [open, selectedSpace]);

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
      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Failed to save configuration")
        );
      }
      onClose();
      window.location.reload();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save configuration"
      );
    } finally {
      setSaving(false);
    }
  }

  const breadcrumb = [selectedWorkspaceName, selectedSpaceName, selectedFolderName]
    .filter(Boolean)
    .join(" > ");
  const selectClassName =
    "mt-3 w-full rounded-[16px] border border-border bg-white px-4 py-3 text-sm text-text outline-none transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configure ClickUp"
      className="max-w-[720px] rounded-[28px]"
      bodyClassName="p-6"
    >
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[#DBD8FF] bg-brand-lt p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#DBD8FF] bg-white shadow-sm">
              <span className="text-sm font-black text-[#4F46E5]">C</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand">
                Destination path
              </div>
              <h3 className="mt-2 text-xl font-black tracking-tight text-text">
                Choose where new ClickUp docs should land.
              </h3>
              <p className="mt-2 text-[14px] leading-7 text-muted">
                Select a workspace and space, then optionally narrow delivery to
                a folder. Toggle doc delivery from the settings page once this is
                configured.
              </p>
            </div>
          </div>
        </div>

        {error ? <SettingsNote tone="red">{error}</SettingsNote> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <ConfigField
            fieldId="clickup-workspace"
            label="Workspace"
            description="Pick the ClickUp workspace that owns the destination space."
            status={
              loadingWorkspaces
                ? "Loading..."
                : workspaces.length > 0
                  ? `${workspaces.length} available`
                  : "No workspaces"
            }
            statusTone={loadingWorkspaces ? "brand" : "neutral"}
          >
            <select
              id="clickup-workspace"
              value={selectedWorkspace}
              onChange={(e) => {
                const ws = workspaces.find(
                  (workspace) => workspace.id === e.target.value
                );
                setSelectedWorkspace(e.target.value);
                setSelectedWorkspaceName(ws?.name ?? "");
                setSelectedSpace("");
                setSelectedSpaceName("");
                setSelectedFolder("");
                setSelectedFolderName("");
                setSpaces([]);
                setFolders([]);
                setError(null);
              }}
              disabled={loadingWorkspaces}
              className={selectClassName}
            >
              <option value="">
                {loadingWorkspaces ? "Loading workspaces..." : "Select a workspace"}
              </option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </ConfigField>

          <ConfigField
            fieldId="clickup-space"
            label="Space"
            description={
              selectedWorkspace
                ? "Select the space where new docs should be created."
                : "Choose a workspace first to load spaces."
            }
            status={
              !selectedWorkspace
                ? "Waiting"
                : loadingSpaces
                  ? "Loading..."
                  : spaces.length > 0
                    ? `${spaces.length} available`
                    : "No spaces"
            }
            statusTone={
              !selectedWorkspace
                ? "amber"
                : loadingSpaces
                  ? "brand"
                  : "neutral"
            }
          >
            <select
              id="clickup-space"
              value={selectedSpace}
              onChange={(e) => {
                const sp = spaces.find((space) => space.id === e.target.value);
                setSelectedSpace(e.target.value);
                setSelectedSpaceName(sp?.name ?? "");
                setSelectedFolder("");
                setSelectedFolderName("");
                setFolders([]);
                setError(null);
              }}
              disabled={!selectedWorkspace || loadingSpaces}
              className={selectClassName}
            >
              <option value="">
                {!selectedWorkspace
                  ? "Choose a workspace first"
                  : loadingSpaces
                    ? "Loading spaces..."
                    : "Select a space"}
              </option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </ConfigField>
        </div>

        {selectedSpace && (
          <ConfigField
            fieldId="clickup-folder"
            label="Folder"
            optional
            description="Optional. Leave this empty when you want docs created at the space root."
            status={
              loadingFolders
                ? "Loading..."
                : folders.length > 0
                  ? `${folders.length} available`
                  : "Space root"
            }
            statusTone={loadingFolders ? "brand" : "neutral"}
          >
            <select
              id="clickup-folder"
              value={selectedFolder}
              onChange={(e) => {
                const fl = folders.find((folder) => folder.id === e.target.value);
                setSelectedFolder(e.target.value);
                setSelectedFolderName(fl?.name ?? "");
                setError(null);
              }}
              disabled={loadingFolders}
              className={selectClassName}
            >
              <option value="">
                {loadingFolders ? "Loading folders..." : "No folder (Space root)"}
              </option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </ConfigField>
        )}

        {breadcrumb ? (
          <SettingsNote tone="brand">
            Docs will be created in{" "}
            <span className="font-semibold text-text">{breadcrumb}</span>.
          </SettingsNote>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button onClick={onClose} className={secondaryButtonClassName}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedWorkspace || !selectedSpace}
            className={primaryButtonClassName}
          >
            {saving ? "Saving..." : "Save destination"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ConfigField({
  fieldId,
  label,
  description,
  status,
  statusTone,
  optional,
  children,
}: {
  fieldId: string;
  label: string;
  description: string;
  status: string;
  statusTone: "neutral" | "brand" | "amber";
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border bg-bg p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-semibold text-text">
          {label}
          {optional ? (
            <span className="ml-1 font-normal text-muted2">(optional)</span>
          ) : null}
        </label>
        <SettingsMetaPill tone={statusTone}>{status}</SettingsMetaPill>
      </div>
      <p className="mt-2 text-[13px] leading-6 text-muted">{description}</p>
      {children}
    </div>
  );
}

async function readErrorMessage(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    return data.error ?? data.message ?? fallback;
  } catch {
    return fallback;
  }
}
