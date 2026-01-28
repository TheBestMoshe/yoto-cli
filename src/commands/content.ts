import { readFile } from "fs/promises";
import { basename } from "path";
import { stat } from "fs/promises";
import { getAuthenticatedClient } from "./auth.ts";
import { success, error, info, table, json } from "../utils/output.ts";

// Smart icon resolver: accepts file path or mediaId/hash
async function resolveIcon(icon: string): Promise<string> {
  // If already a yoto:# reference, extract the mediaId
  if (icon.startsWith("yoto:#")) {
    return icon.slice(6); // Remove "yoto:#" prefix
  }

  // Check if it looks like a file path
  const isFilePath = icon.startsWith("./") ||
                     icon.startsWith("../") ||
                     icon.startsWith("/") ||
                     /\.(png|jpg|jpeg|gif)$/i.test(icon);

  if (isFilePath) {
    // Verify file exists
    try {
      await stat(icon);
    } catch {
      error(`Icon file not found: ${icon}`);
      process.exit(1);
    }

    // Upload the icon
    info(`Uploading icon...`);
    const client = await getAuthenticatedClient();
    const file = await readFile(icon);
    const filename = basename(icon);

    const response = await client.uploadIcon(file, {
      filename,
      autoConvert: true,
    });

    const mediaId = response.displayIcon.mediaId;
    success(`Icon uploaded`);
    return mediaId;
  }

  // Assume it's already a mediaId
  return icon;
}

export async function listPlaylists(options: { json?: boolean }): Promise<void> {
  const client = await getAuthenticatedClient();
  const response = await client.listContent();

  if (options.json) {
    json(response.cards);
    return;
  }

  if (response.cards.length === 0) {
    info("No playlists found.");
    return;
  }

  table(
    ["Title", "Card ID", "Updated"],
    response.cards.map((card) => [
      card.title,
      card.cardId,
      card.updatedAt ? new Date(card.updatedAt).toLocaleDateString() : "-",
    ])
  );
}

export async function getPlaylist(
  cardId: string,
  options: { json?: boolean; playable?: boolean }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const response = await client.getContent(cardId, {
    playable: options.playable,
  });

  if (options.json) {
    json(response.card);
    return;
  }

  const card = response.card;
  console.log(`\nTitle: ${card.title}`);
  console.log(`Card ID: ${card.cardId}`);
  if (card.metadata?.author) console.log(`Author: ${card.metadata.author}`);
  if (card.metadata?.description)
    console.log(`Description: ${card.metadata.description}`);
  console.log(`\nChapters (${card.content.chapters.length}):`);

  card.content.chapters.forEach((chapter, i) => {
    console.log(`\n  ${i + 1}. ${chapter.title}`);
    if (chapter.icon) console.log(`     Icon: ${chapter.icon}`);
    console.log(`     Tracks (${chapter.tracks.length}):`);
    chapter.tracks.forEach((track, j) => {
      const duration = track.duration
        ? ` (${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")})`
        : "";
      console.log(`       ${j + 1}. ${track.title}${duration}`);
      if (track.trackUrl) {
        console.log(`          URL: ${track.trackUrl}`);
      }
    });
  });
}

export async function createPlaylist(
  title: string,
  options: { description?: string; author?: string }
): Promise<void> {
  const client = await getAuthenticatedClient();

  const response = await client.createContent({
    title,
    content: {
      chapters: [],
      playbackType: "linear",
      activity: "yoto_Player",
      version: "1",
      restricted: true,
    },
    metadata: {
      description: options.description,
      author: options.author,
    },
  });

  success(`Created playlist: ${response.card.title}`);
  info(`Card ID: ${response.card.cardId}`);
}

export async function deletePlaylist(cardId: string): Promise<void> {
  const client = await getAuthenticatedClient();
  await client.deleteContent(cardId);
  success(`Deleted playlist: ${cardId}`);
}

export async function addChapter(
  cardId: string,
  title: string,
  options: { icon?: string; json?: boolean }
): Promise<void> {
  // Resolve icon (upload if file path, use directly if hash)
  const DEFAULT_ICON = "aUm9i3ex3qqAMYBv-i-O-pYMKuMJGICtR3Vhf289u2Q";
  const mediaId = options.icon ? await resolveIcon(options.icon) : DEFAULT_ICON;
  const iconRef = `yoto:#${mediaId}`;

  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  // Generate a short key (API requires ≤20 chars)
  const nextIndex = card.content.chapters.length;
  const overlayLabel = String(nextIndex + 1); // 1-based for display

  const newChapter = {
    key: String(nextIndex).padStart(2, "0"),
    title,
    tracks: [],
    overlayLabel,
    display: { icon16x16: iconRef },
    availableFrom: null,
    ambient: null,
    defaultTrackDisplay: null,
    defaultTrackAmbient: null,
  };

  card.content.chapters.push(newChapter);

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  if (options.json) {
    json({
      cardId,
      chapterIndex: nextIndex,
      title,
    });
    return;
  }

  success(`Added chapter "${title}" to playlist`);
}

export async function addTrack(
  cardId: string,
  chapterIndex: number,
  title: string,
  trackUrl: string,
  options: { icon?: string; duration?: number }
): Promise<void> {
  // Resolve icon if provided
  const mediaId = options.icon ? await resolveIcon(options.icon) : undefined;

  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const chapter = card.content.chapters[chapterIndex];
  if (!chapter) {
    error(`Chapter ${chapterIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  // Generate a short key (API requires ≤20 chars)
  const nextTrackIndex = chapter.tracks.length + 1;
  const newTrack = {
    key: String(nextTrackIndex).padStart(2, "0"),
    title,
    trackUrl,
    type: "audio",
    duration: options.duration,
    icon: mediaId,
    display: mediaId ? { icon16x16: `yoto:#${mediaId}` } : undefined,
  };

  chapter.tracks.push(newTrack);

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Added track "${title}" to chapter "${chapter.title}"`);
}

// Detect if source is a file path, URL, or yoto:# hash
function isFilePath(source: string): boolean {
  // Check for common file path patterns
  if (source.startsWith("./") || source.startsWith("../") || source.startsWith("/")) {
    return true;
  }
  // Check for file extensions (audio files)
  const audioExtensions = /\.(mp3|m4a|aac|flac|wav|ogg|wma|opus)$/i;
  if (audioExtensions.test(source) && !source.startsWith("http")) {
    return true;
  }
  return false;
}

function isYotoHash(source: string): boolean {
  return source.startsWith("yoto:#");
}

function isUrl(source: string): boolean {
  return source.startsWith("http://") || source.startsWith("https://");
}

export async function addTrackSmart(
  cardId: string,
  chapterIndex: number,
  title: string,
  source: string,
  options: { icon?: string; duration?: number }
): Promise<void> {
  let trackUrl = source;
  let duration = options.duration;

  if (isFilePath(source)) {
    // Upload and transcode the file first
    info(`Uploading ${source}...`);
    const result = await uploadAndTranscode(source, { wait: true });
    if (!result.trackUrl) {
      error(`Failed to get track URL from upload`);
      process.exit(1);
    }
    trackUrl = result.trackUrl;
    duration = duration ?? result.duration;
  } else if (isYotoHash(source)) {
    // Already a yoto:# hash, use directly
    trackUrl = source;
  } else if (isUrl(source)) {
    // External URL, use directly
    trackUrl = source;
  } else {
    // Assume it's a file path without leading ./
    info(`Uploading ${source}...`);
    const result = await uploadAndTranscode(source, { wait: true });
    if (!result.trackUrl) {
      error(`Failed to get track URL from upload`);
      process.exit(1);
    }
    trackUrl = result.trackUrl;
    duration = duration ?? result.duration;
  }

  // Now add the track with the resolved URL
  await addTrack(cardId, chapterIndex, title, trackUrl, {
    icon: options.icon,
    duration,
  });
}

export async function updateTrack(
  cardId: string,
  chapterIndex: number,
  trackIndex: number,
  options: { title?: string; icon?: string; url?: string; onEnd?: string }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const chapter = card.content.chapters[chapterIndex];
  if (!chapter) {
    error(`Chapter ${chapterIndex} not found.`);
    process.exit(1);
  }

  const track = chapter.tracks[trackIndex];
  if (!track) {
    error(`Track ${trackIndex} not found.`);
    process.exit(1);
  }

  if (options.title) track.title = options.title;
  if (options.icon) {
    const mediaId = await resolveIcon(options.icon);
    track.display = { ...track.display, icon16x16: `yoto:#${mediaId}` };
  }
  if (options.url) track.trackUrl = options.url;
  if (options.onEnd !== undefined) {
    // Values: none (continue), stop (pause/wait), repeat (loop)
    track.events = { onEnd: { cmd: options.onEnd } };
  }

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Updated track "${track.title}"`);
}

export async function updatePlaylist(
  cardId: string,
  options: {
    title?: string;
    description?: string;
    author?: string;
    playbackType?: string;
  }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  // Update fields
  const newTitle = options.title ?? card.title;
  if (options.description !== undefined) {
    card.metadata = { ...card.metadata, description: options.description };
  }
  if (options.author !== undefined) {
    card.metadata = { ...card.metadata, author: options.author };
  }
  if (options.playbackType !== undefined) {
    card.content.playbackType = options.playbackType;
  }

  await client.updateContent(cardId, {
    title: newTitle,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Updated playlist "${newTitle}"`);
}

export async function deleteChapter(
  cardId: string,
  chapterIndex: number
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  if (chapterIndex < 0 || chapterIndex >= card.content.chapters.length) {
    error(`Chapter ${chapterIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  const removed = card.content.chapters.splice(chapterIndex, 1)[0];

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Deleted chapter "${removed?.title}"`);
}

export async function deleteTrack(
  cardId: string,
  chapterIndex: number,
  trackIndex: number
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const chapter = card.content.chapters[chapterIndex];
  if (!chapter) {
    error(`Chapter ${chapterIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  if (trackIndex < 0 || trackIndex >= chapter.tracks.length) {
    error(`Track ${trackIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  const removed = chapter.tracks.splice(trackIndex, 1)[0];

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Deleted track "${removed?.title}" from chapter "${chapter.title}"`);
}

export async function updateChapter(
  cardId: string,
  chapterIndex: number,
  options: { title?: string; icon?: string }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const chapter = card.content.chapters[chapterIndex];
  if (!chapter) {
    error(`Chapter ${chapterIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  if (options.title) chapter.title = options.title;
  if (options.icon) {
    const mediaId = await resolveIcon(options.icon);
    chapter.icon = mediaId;
    chapter.display = { ...chapter.display, icon16x16: `yoto:#${mediaId}` };
  }

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Updated chapter "${chapter.title}"`);
}

// Shared helper for uploading and transcoding audio
interface UploadResult {
  uploadId: string;
  trackUrl?: string;
  sha256?: string;
  duration?: number;
}

async function uploadAndTranscode(
  filePath: string,
  options: { wait?: boolean } = { wait: true }
): Promise<UploadResult> {
  const client = await getAuthenticatedClient();
  const file = await readFile(filePath);
  const filename = basename(filePath);

  // Calculate SHA256 hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", file);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Get upload URL
  const uploadResponse = await client.getAudioUploadUrl(sha256, filename);
  const uploadId = uploadResponse.upload.uploadId;

  if (uploadResponse.upload.uploadUrl) {
    info(`Uploading ${filename}...`);
    await client.uploadFile(uploadResponse.upload.uploadUrl, file);
    success(`Uploaded successfully`);
  } else {
    info(`File already exists on server`);
  }

  // Return early if not waiting for transcoding
  if (options.wait === false) {
    return { uploadId };
  }

  // Poll for transcoding to complete
  info(`Waiting for transcoding...`);
  const maxAttempts = 60; // Up to 5 minutes (5s intervals)

  for (let i = 0; i < maxAttempts; i++) {
    const transcodeResponse = await client.getTranscodedAudio(uploadId);
    const transcode = transcodeResponse.transcode;
    const phase = transcode.progress?.phase;

    if (phase === "complete" || transcode.transcodedSha256) {
      success(`Transcoding complete`);
      return {
        uploadId,
        trackUrl: `yoto:#${transcode.transcodedSha256}`,
        sha256: transcode.transcodedSha256,
        duration: transcode.transcodedInfo?.duration,
      };
    }

    if (phase && phase !== "queued" && phase !== "processing" && phase !== "transcoding") {
      error(`Transcoding failed with status: ${phase}`);
      process.exit(1);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  error(`Transcoding timed out after ${maxAttempts * 5} seconds`);
  process.exit(1);
}

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

export async function uploadAudio(
  filePath: string,
  options: { json?: boolean; wait?: boolean }
): Promise<void> {
  const result = await uploadAndTranscode(filePath, { wait: options.wait });

  if (options.wait === false) {
    info(`Upload ID: ${result.uploadId}`);
    info(`Use 'yoto track status ${result.uploadId}' to check status`);
    return;
  }

  if (options.json) {
    json({
      trackUrl: result.trackUrl,
      sha256: result.sha256,
      uploadId: result.uploadId,
      duration: result.duration,
    });
    return;
  }

  info(`Track URL: ${result.trackUrl}`);
  if (result.duration) {
    info(`Duration: ${formatDuration(result.duration)}`);
  }
  info(`Use with: yoto track add <cardId> <chapterIdx> "Title" "${result.trackUrl}"`);
}

export async function getTranscodeStatus(
  uploadId: string,
  options: { json?: boolean; wait?: boolean }
): Promise<void> {
  const client = await getAuthenticatedClient();

  if (options.wait) {
    // Poll until complete
    info(`Waiting for transcoding...`);
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      const transcodeResponse = await client.getTranscodedAudio(uploadId);
      const transcode = transcodeResponse.transcode;
      const phase = transcode.progress?.phase;

      if (phase === "complete" || transcode.transcodedSha256) {
        const trackUrl = `yoto:#${transcode.transcodedSha256}`;
        const duration = transcode.transcodedInfo?.duration;

        if (options.json) {
          json({ trackUrl, sha256: transcode.transcodedSha256, uploadId, duration });
          return;
        }

        success(`Transcoding complete`);
        info(`Track URL: ${trackUrl}`);
        if (duration) {
          info(`Duration: ${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}`);
        }
        info(`Use with: yoto track add <cardId> <chapterIdx> "Title" "${trackUrl}"`);
        return;
      }

      if (phase && phase !== "queued" && phase !== "processing") {
        error(`Transcoding failed with status: ${phase}`);
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    error(`Transcoding timed out after ${maxAttempts * 5} seconds`);
    process.exit(1);
  }

  // Just check status once
  const transcodeResponse = await client.getTranscodedAudio(uploadId);
  const transcode = transcodeResponse.transcode;

  if (options.json) {
    json(transcode);
    return;
  }

  const phase = transcode.progress?.phase || "unknown";
  const percent = transcode.progress?.percent;

  if (phase === "complete" || transcode.transcodedSha256) {
    const trackUrl = `yoto:#${transcode.transcodedSha256}`;
    const duration = transcode.transcodedInfo?.duration;

    success(`Transcoding complete`);
    info(`Track URL: ${trackUrl}`);
    if (duration) {
      info(`Duration: ${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}`);
    }
    info(`Use with: yoto track add <cardId> <chapterIdx> "Title" "${trackUrl}"`);
  } else {
    info(`Status: ${phase}${percent !== undefined ? ` (${percent}%)` : ""}`);
    info(`Run with --wait to poll until complete`);
  }
}
