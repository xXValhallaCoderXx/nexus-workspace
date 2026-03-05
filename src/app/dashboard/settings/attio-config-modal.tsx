"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";

interface AttioObject {
  id: { object_id: string };
  api_slug: string;
  singular_noun: string;
  plural_noun: string;
}

interface AttioRecord {
  id: { record_id: string };
  values: {
    name?: Array<{ value: string }>;
    [key: string]: unknown;
  };
}

interface ExistingConfig {
  parent_object: string;
  parent_record_id: string;
  parent_record_name?: string;
}

export function AttioConfigModal({
  open,
  onClose,
  existingConfig,
}: {
  open: boolean;
  onClose: () => void;
  existingConfig?: ExistingConfig | null;
}) {
  const [objects, setObjects] = useState<AttioObject[]>([]);
  const [records, setRecords] = useState<AttioRecord[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>(
    existingConfig?.parent_object ?? ""
  );
  const [selectedRecord, setSelectedRecord] = useState<string>(
    existingConfig?.parent_record_id ?? ""
  );
  const [selectedRecordName, setSelectedRecordName] = useState<string>(
    existingConfig?.parent_record_name ?? ""
  );
  const [search, setSearch] = useState("");
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch objects on open
  useEffect(() => {
    if (!open) return;
    setLoadingObjects(true);
    fetch("/api/user/connectors/attio/objects")
      .then((r) => r.json())
      .then((data) => setObjects(data.data ?? []))
      .catch(() => setError("Failed to load Attio objects"))
      .finally(() => setLoadingObjects(false));
  }, [open]);

  // Reset on existingConfig change
  useEffect(() => {
    if (existingConfig) {
      setSelectedObject(existingConfig.parent_object);
      setSelectedRecord(existingConfig.parent_record_id);
      setSelectedRecordName(existingConfig.parent_record_name ?? "");
    }
  }, [existingConfig]);

  // Search records when object selected and search has >= 2 chars
  const searchRecords = useCallback(
    async (objectSlug: string, query: string) => {
      if (!objectSlug || query.length < 2) {
        setRecords([]);
        return;
      }
      setLoadingRecords(true);
      try {
        const res = await fetch("/api/user/connectors/attio/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ object: objectSlug, query }),
        });
        const data = await res.json();
        setRecords(data.data ?? []);
      } catch {
        setError("Failed to search records");
      } finally {
        setLoadingRecords(false);
      }
    },
    []
  );

  // Debounce search
  useEffect(() => {
    if (!selectedObject || search.length < 2) return;
    const timer = setTimeout(() => searchRecords(selectedObject, search), 300);
    return () => clearTimeout(timer);
  }, [selectedObject, search, searchRecords]);

  async function handleSave() {
    if (!selectedObject || !selectedRecord) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/connectors/attio/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_object: selectedObject,
          parent_record_id: selectedRecord,
          parent_record_name: selectedRecordName,
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

  const objectLabel =
    objects.find((o) => o.api_slug === selectedObject)?.singular_noun ??
    selectedObject;

  return (
    <Modal open={open} onClose={onClose} title="Configure Attio">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red/10 px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}

        {/* Object Type Selector */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-text">
            Object Type
          </label>
          <select
            value={selectedObject}
            onChange={(e) => {
              setSelectedObject(e.target.value);
              setSelectedRecord("");
              setSelectedRecordName("");
              setRecords([]);
              setSearch("");
            }}
            disabled={loadingObjects}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
          >
            <option value="">
              {loadingObjects ? "Loading..." : "Select an object type"}
            </option>
            {objects.map((obj) => (
              <option key={obj.id.object_id} value={obj.api_slug}>
                {obj.plural_noun}
              </option>
            ))}
          </select>
        </div>

        {/* Record Search */}
        {selectedObject && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-text">
              Default Record
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${objectLabel}s (min 2 characters)...`}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
            />
            {loadingRecords && (
              <div className="mt-1 text-xs text-muted2">Searching...</div>
            )}
            {records.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-bg">
                {records.map((rec) => {
                  const name =
                    rec.values.name?.[0]?.value ?? rec.id.record_id;
                  const isSelected = rec.id.record_id === selectedRecord;
                  return (
                    <button
                      key={rec.id.record_id}
                      onClick={() => {
                        setSelectedRecord(rec.id.record_id);
                        setSelectedRecordName(name);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-brand-lt ${
                        isSelected
                          ? "bg-brand-lt font-medium text-brand"
                          : "text-text"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {selectedRecord && selectedRecordName && (
          <div className="rounded-lg border border-brand/20 bg-brand-lt px-3 py-2.5 text-[13px]">
            <span className="font-medium text-brand">
              Meeting notes will be attached to:{" "}
            </span>
            <span className="text-text">{selectedRecordName}</span>
            <span className="text-muted2"> ({objectLabel})</span>
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
            disabled={saving || !selectedObject || !selectedRecord}
            className="rounded-[9px] bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#4A3CE0] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
