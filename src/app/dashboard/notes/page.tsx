import { Topbar } from "@/components/layout/topbar";
import { PageHeader } from "@/components/layout/page-header";
import { DriveFilesPanel } from "@/components/dashboard/drive-files-panel";

export default function NotesPage() {
  return (
    <>
      <Topbar title="Notes" subtitle="— Google Drive transcripts" />
      <div className="flex-1 p-7">
        <PageHeader
          title="Meeting Notes"
          subtitle="Browse and process your Google Meet transcripts"
        />
        <DriveFilesPanel />
      </div>
    </>
  );
}
