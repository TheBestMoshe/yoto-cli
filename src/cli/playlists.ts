import { Command } from "commander";
import {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  deletePlaylist,
  addChapter,
  addTrack,
  updateTrack,
} from "../commands/content.ts";

export function registerPlaylistCommands(program: Command): void {
  program
    .command("playlists")
    .description("List your MYO playlists")
    .option("--json", "Output as JSON")
    .action((options) => listPlaylists({ json: options.json }));

  program
    .command("playlist <cardId>")
    .description("Get playlist details")
    .option("--playable", "Include playable URLs")
    .option("--json", "Output as JSON")
    .action((cardId, options) =>
      getPlaylist(cardId, { json: options.json, playable: options.playable })
    );

  program
    .command("playlist:create <title>")
    .description("Create a new playlist")
    .option("--description <desc>", "Set description")
    .option("--author <author>", "Set author")
    .action((title, options) =>
      createPlaylist(title, {
        description: options.description,
        author: options.author,
      })
    );

  program
    .command("playlist:delete <cardId>")
    .description("Delete a playlist")
    .action(deletePlaylist);

  program
    .command("chapter:add <cardId> <title>")
    .description("Add chapter to playlist")
    .option("--icon <iconId>", "Set chapter icon")
    .action((cardId, title, options) =>
      addChapter(cardId, title, { icon: options.icon })
    );

  program
    .command("track:add <cardId> <chapterIdx> <title> <url>")
    .description("Add track to chapter")
    .option("--icon <iconId>", "Set track icon")
    .option("--duration <seconds>", "Set duration")
    .action((cardId, chapterIdx, title, url, options) =>
      addTrack(cardId, parseInt(chapterIdx, 10), title, url, {
        icon: options.icon,
        duration: options.duration ? parseInt(options.duration, 10) : undefined,
      })
    );

  program
    .command("track:update <cardId> <chapterIdx> <trackIdx>")
    .description("Update a track")
    .option("--title <title>", "Update title")
    .option("--icon <iconId>", "Update icon")
    .option("--url <url>", "Update URL")
    .action((cardId, chapterIdx, trackIdx, options) =>
      updateTrack(cardId, parseInt(chapterIdx, 10), parseInt(trackIdx, 10), {
        title: options.title,
        icon: options.icon,
        url: options.url,
      })
    );
}
