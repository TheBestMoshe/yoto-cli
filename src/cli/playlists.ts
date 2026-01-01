import { Command } from "commander";
import {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  deletePlaylist,
  addChapter,
  addTrack,
  updateTrack,
  updatePlaylist,
  updateChapter,
  deleteChapter,
  deleteTrack,
  importTrack,
  uploadAudio,
  getTranscodeStatus,
} from "../commands/content.ts";

export function registerPlaylistCommands(program: Command): void {
  program
    .command("playlists")
    .description("List your MYO playlists")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
  $ yoto playlists
  $ yoto playlists --json
`
    )
    .action((options) => listPlaylists({ json: options.json }));

  program
    .command("playlist <cardId>")
    .description("Get playlist details including chapters and tracks")
    .option("--playable", "Include playable URLs for tracks")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Arguments:
  cardId    The playlist card ID (e.g., 5ukMR)

Examples:
  $ yoto playlist 5ukMR
  $ yoto playlist 5ukMR --playable
  $ yoto playlist 5ukMR --json
`
    )
    .action((cardId, options) =>
      getPlaylist(cardId, { json: options.json, playable: options.playable })
    );

  program
    .command("playlist:create <title>")
    .description("Create a new empty playlist")
    .option("--description <desc>", "Set playlist description")
    .option("--author <author>", "Set playlist author")
    .addHelpText(
      "after",
      `
Arguments:
  title    The playlist title

Examples:
  $ yoto playlist:create "My Playlist"
  $ yoto playlist:create "Bedtime Stories" --description "Relaxing stories" --author "Mom"
`
    )
    .action((title, options) =>
      createPlaylist(title, {
        description: options.description,
        author: options.author,
      })
    );

  program
    .command("playlist:edit <cardId>")
    .description("Edit playlist properties (title, description, author)")
    .option("--title <title>", "Update playlist title")
    .option("--description <desc>", "Update playlist description")
    .option("--author <author>", "Update playlist author")
    .option("--playback-type <type>", "Update playback type (e.g., linear)")
    .addHelpText(
      "after",
      `
Arguments:
  cardId    The playlist card ID

Examples:
  $ yoto playlist:edit 5ukMR --title "New Title"
  $ yoto playlist:edit 5ukMR --description "Updated description"
  $ yoto playlist:edit 5ukMR --title "Stories" --author "Dad"
`
    )
    .action((cardId, options) =>
      updatePlaylist(cardId, {
        title: options.title,
        description: options.description,
        author: options.author,
        playbackType: options.playbackType,
      })
    );

  program
    .command("playlist:delete <cardId>")
    .description("Delete a playlist")
    .addHelpText(
      "after",
      `
Arguments:
  cardId    The playlist card ID

Examples:
  $ yoto playlist:delete 5ukMR
`
    )
    .action(deletePlaylist);

  program
    .command("chapter:add <cardId> <title>")
    .description("Add a new chapter to a playlist")
    .option("--icon <iconId>", "Set chapter icon (mediaId or yoto:#mediaId)")
    .addHelpText(
      "after",
      `
Arguments:
  cardId    The playlist card ID
  title     The chapter title

Examples:
  $ yoto chapter:add 5ukMR "Chapter 1"
  $ yoto chapter:add 5ukMR "Morning Songs" --icon abc123def456
`
    )
    .action((cardId, title, options) =>
      addChapter(cardId, title, { icon: options.icon })
    );

  program
    .command("chapter:update <cardId> <chapterIdx>")
    .description("Update a chapter's title or icon")
    .option("--title <title>", "Update chapter title")
    .option("--icon <iconId>", "Update chapter icon (mediaId or yoto:#mediaId)")
    .addHelpText(
      "after",
      `
Arguments:
  cardId       The playlist card ID
  chapterIdx   Chapter index (0-based)

Examples:
  $ yoto chapter:update 5ukMR 0 --title "New Chapter Title"
  $ yoto chapter:update 5ukMR 1 --icon abc123def456
`
    )
    .action((cardId, chapterIdx, options) =>
      updateChapter(cardId, parseInt(chapterIdx, 10), {
        title: options.title,
        icon: options.icon,
      })
    );

  program
    .command("chapter:delete <cardId> <chapterIdx>")
    .description("Delete a chapter from a playlist")
    .addHelpText(
      "after",
      `
Arguments:
  cardId       The playlist card ID
  chapterIdx   Chapter index (0-based)

Examples:
  $ yoto chapter:delete 5ukMR 2
`
    )
    .action((cardId, chapterIdx) =>
      deleteChapter(cardId, parseInt(chapterIdx, 10))
    );

  program
    .command("track:add <cardId> <chapterIdx> <title> <url>")
    .description("Add a new track to a chapter")
    .option("--icon <iconId>", "Set track icon (mediaId or yoto:#mediaId)")
    .option("--duration <seconds>", "Set track duration in seconds")
    .addHelpText(
      "after",
      `
Arguments:
  cardId       The playlist card ID
  chapterIdx   Chapter index (0-based)
  title        The track title
  url          Track URL (yoto:#hash or https://...)

Examples:
  $ yoto track:add 5ukMR 0 "Track 1" "yoto:#abc123"
  $ yoto track:add 5ukMR 0 "Song" "yoto:#abc123" --icon def456 --duration 180
`
    )
    .action((cardId, chapterIdx, title, url, options) =>
      addTrack(cardId, parseInt(chapterIdx, 10), title, url, {
        icon: options.icon,
        duration: options.duration ? parseInt(options.duration, 10) : undefined,
      })
    );

  program
    .command("track:update <cardId> <chapterIdx> <trackIdx>")
    .description("Update a track's properties (title, icon, URL, playback behavior)")
    .option("--title <title>", "Update track title")
    .option("--icon <mediaId>", "Update track icon (mediaId from icons:upload)")
    .option("--url <url>", "Update track URL")
    .option("--on-end <action>", "Action when track ends: none (continue), stop (pause), repeat (loop)")
    .addHelpText(
      "after",
      `
Arguments:
  cardId       The playlist card ID
  chapterIdx   Chapter index (0-based)
  trackIdx     Track index within chapter (0-based)

On-End Actions:
  none      Continue to next track (default behavior)
  stop      Pause playback, wait for button press
  repeat    Loop this track continuously

Examples:
  $ yoto track:update 5ukMR 0 0 --title "New Track Title"
  $ yoto track:update 5ukMR 0 0 --icon abc123def456
  $ yoto track:update 5ukMR 0 0 --on-end repeat    # loop track
  $ yoto track:update 5ukMR 0 0 --on-end stop      # pause after track
  $ yoto track:update 5ukMR 1 2 --title "Song" --on-end none
`
    )
    .action((cardId, chapterIdx, trackIdx, options) =>
      updateTrack(cardId, parseInt(chapterIdx, 10), parseInt(trackIdx, 10), {
        title: options.title,
        icon: options.icon,
        url: options.url,
        onEnd: options.onEnd,
      })
    );

  program
    .command("track:delete <cardId> <chapterIdx> <trackIdx>")
    .description("Delete a track from a chapter")
    .addHelpText(
      "after",
      `
Arguments:
  cardId       The playlist card ID
  chapterIdx   Chapter index (0-based)
  trackIdx     Track index within chapter (0-based)

Examples:
  $ yoto track:delete 5ukMR 0 1
`
    )
    .action((cardId, chapterIdx, trackIdx) =>
      deleteTrack(cardId, parseInt(chapterIdx, 10), parseInt(trackIdx, 10))
    );

  program
    .command("track:import <cardId> <title> <file>")
    .description("Import audio file as a new chapter with track (upload + transcode + create)")
    .option("--icon <iconId>", "Set chapter/track icon")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Arguments:
  cardId    The playlist card ID
  title     Title for the chapter and track
  file      Path to audio file (MP3, M4A, FLAC, WAV, etc.)

This is the easiest way to add audio to a playlist. It:
1. Uploads the audio file
2. Waits for transcoding to complete
3. Creates a new chapter
4. Adds the track to the chapter

Examples:
  $ yoto track:import 5ukMR "Chapter 1" ./audio.mp3
  $ yoto track:import 5ukMR "Song Title" ./song.m4a --icon abc123
  $ yoto track:import 5ukMR "Track" ./audio.mp3 --json
`
    )
    .action((cardId, title, file, options) =>
      importTrack(cardId, title, file, { icon: options.icon, json: options.json })
    );

  program
    .command("track:upload <file>")
    .description("Upload an audio file and get a track URL")
    .option("--json", "Output as JSON")
    .option("--no-wait", "Don't wait for transcoding to complete")
    .addHelpText(
      "after",
      `
Arguments:
  file    Path to audio file (MP3, M4A, FLAC, WAV, etc.)

Uploads an audio file to Yoto's servers. The file is transcoded to AAC format.
Returns a track URL (yoto:#hash) that can be used with track:add or track:update.

By default, waits for transcoding to complete before returning. Use --no-wait
to return immediately after upload and check status later with track:transcode-status.

Supported formats: MP3, M4A, AAC, FLAC, WAV, OGG, and more.
Max file size: 1GB

Examples:
  $ yoto track:upload ./song.mp3
  $ yoto track:upload ./audiobook-chapter1.m4a --json
  $ yoto track:upload ./large-file.mp3 --no-wait

  # Upload and add to playlist in one go:
  $ URL=$(yoto track:upload ./song.mp3 --json | jq -r .trackUrl)
  $ yoto track:add 5ukMR 0 "My Song" "$URL"
`
    )
    .action((file, options) => uploadAudio(file, { json: options.json, wait: options.wait }));

  program
    .command("track:transcode-status <uploadId>")
    .description("Check transcoding status for an uploaded audio file")
    .option("--json", "Output as JSON")
    .option("--wait", "Wait for transcoding to complete")
    .addHelpText(
      "after",
      `
Arguments:
  uploadId    The upload ID (from track:upload --no-wait)

Check the transcoding status of a previously uploaded audio file.
Use --wait to poll until transcoding is complete.

Examples:
  $ yoto track:transcode-status f459ae09377fff45...
  $ yoto track:transcode-status f459ae09377fff45... --wait
  $ yoto track:transcode-status f459ae09377fff45... --json
`
    )
    .action((uploadId, options) =>
      getTranscodeStatus(uploadId, { json: options.json, wait: options.wait })
    );
}
