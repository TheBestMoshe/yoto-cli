# yoto-cli

CLI for interacting with the Yoto API. Manage playlists, tracks, icons, and devices.

## Installation

```bash
bun install
bun run build
```

The compiled binary will be at `./dist/yoto`.

## Usage

```bash
# Authenticate
yoto login

# Playlists
yoto playlists
yoto playlist <cardId>
yoto playlist:create "My Playlist" --description "Description"
yoto playlist:delete <cardId>

# Chapters & Tracks
yoto chapter:add <cardId> "Chapter Title"
yoto track:add <cardId> <chapterIdx> "Track Title" <url>
yoto track:update <cardId> <chapterIdx> <trackIdx> --icon <iconId>

# Icons
yoto icons
yoto icons:mine
yoto icons:upload my-icon.png

# Devices
yoto devices
yoto device <deviceId>
yoto device:cmd <deviceId> play|pause|stop|volume <value>
```

Run `yoto --help` for full command list.

## Development

```bash
bun dev <command>        # Run without compiling
bun run typecheck        # Type check
bun run build            # Build binary
```
