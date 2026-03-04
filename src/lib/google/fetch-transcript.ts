import { getDriveClient } from "./get-drive-client";

const MAX_CONTENT_LENGTH = 100_000;

const TRANSCRIPT_PATTERNS = [/transcript/i, /meeting/i, /notes/i];

export interface TranscriptFile {
  fileId: string;
  fileName: string;
  content: string;
  mimeType: string;
  createdTime: string;
}

export function isLikelyTranscript(fileName: string, mimeType: string): boolean {
  if (mimeType === "application/vnd.google-apps.document") {
    return TRANSCRIPT_PATTERNS.some((p) => p.test(fileName));
  }
  return false;
}

export async function fetchTranscriptContent(
  userId: string,
  fileId: string
): Promise<TranscriptFile> {
  const drive = await getDriveClient(userId);

  const metadata = await drive.files.get({
    fileId,
    fields: "name,mimeType,createdTime",
  });

  const { name, mimeType, createdTime } = metadata.data;

  let content: string;

  if (mimeType === "application/vnd.google-apps.document") {
    const exported = await drive.files.export({
      fileId,
      mimeType: "text/plain",
    });
    content = String(exported.data);
  } else {
    const downloaded = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "text" }
    );
    content = String(downloaded.data);
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH) + "\n\n[Truncated]";
  }

  return {
    fileId,
    fileName: name ?? "Unknown",
    content,
    mimeType: mimeType ?? "unknown",
    createdTime: createdTime ?? new Date().toISOString(),
  };
}

export async function detectChangedFiles(
  userId: string,
  pageToken?: string | null
): Promise<{ files: Array<{ id: string; name: string; mimeType: string }>; newPageToken: string }> {
  const drive = await getDriveClient(userId);

  if (!pageToken) {
    const startToken = await drive.changes.getStartPageToken();
    return { files: [], newPageToken: startToken.data.startPageToken! };
  }

  const changes = await drive.changes.list({
    pageToken,
    fields: "nextPageToken,newStartPageToken,changes(fileId,file(name,mimeType,trashed))",
    spaces: "drive",
  });

  const files = (changes.data.changes ?? [])
    .filter((c) => c.file && !c.file.trashed && c.fileId)
    .filter((c) => isLikelyTranscript(c.file!.name ?? "", c.file!.mimeType ?? ""))
    .map((c) => ({
      id: c.fileId!,
      name: c.file!.name ?? "Unknown",
      mimeType: c.file!.mimeType ?? "unknown",
    }));

  const newPageToken = changes.data.newStartPageToken ?? changes.data.nextPageToken ?? pageToken;

  return { files, newPageToken };
}
