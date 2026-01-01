import { getAuthenticatedClient } from "./auth.ts";
import { success, error, info, table, json } from "../utils/output.ts";

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
      if (options.playable && track.trackUrl) {
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
  options: { icon?: string }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const newChapter = {
    key: `chapter-${Date.now()}`,
    title,
    icon: options.icon,
    tracks: [],
  };

  card.content.chapters.push(newChapter);

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Added chapter "${title}" to playlist`);
}

export async function addTrack(
  cardId: string,
  chapterIndex: number,
  title: string,
  trackUrl: string,
  options: { icon?: string; duration?: number }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const existing = await client.getContent(cardId);
  const card = existing.card;

  const chapter = card.content.chapters[chapterIndex];
  if (!chapter) {
    error(`Chapter ${chapterIndex} not found. Use 0-based index.`);
    process.exit(1);
  }

  const newTrack = {
    key: `track-${Date.now()}`,
    title,
    trackUrl,
    icon: options.icon,
    duration: options.duration,
  };

  chapter.tracks.push(newTrack);

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Added track "${title}" to chapter "${chapter.title}"`);
}

export async function updateTrack(
  cardId: string,
  chapterIndex: number,
  trackIndex: number,
  options: { title?: string; icon?: string; url?: string }
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
  if (options.icon) track.icon = options.icon;
  if (options.url) track.trackUrl = options.url;

  await client.updateContent(cardId, {
    title: card.title,
    content: card.content,
    metadata: card.metadata,
  });

  success(`Updated track "${track.title}"`);
}
