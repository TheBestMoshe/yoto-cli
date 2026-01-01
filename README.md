# yoto-cli

CLI for interacting with the Yoto API. Manage playlists, tracks, icons, and devices.

## Installation

### Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/TheBestMoshe/yoto-cli/main/install.sh | bash
```

This installs to `~/.local/bin`. Make sure it's in your PATH:

```bash
export PATH="$PATH:$HOME/.local/bin"
```

### Manual Download

Download the latest tarball for your platform from [GitHub Releases](https://github.com/TheBestMoshe/yoto-cli/releases) and extract it.

### Install from GitHub Package Registry

```bash
npm install -g @thebestmoshe/yoto-cli --registry=https://npm.pkg.github.com
```

## Usage

```bash
# Authenticate
yoto login

# Playlists
yoto playlists
yoto playlist <cardId>
yoto playlist:create "My Playlist" --description "Description"
yoto playlist:edit <cardId> --title "New Title" --description "New desc" --author "Author"
yoto playlist:delete <cardId>

# Chapters
yoto chapter:add <cardId> "Chapter Title" --icon <iconId>
yoto chapter:update <cardId> <chapterIdx> --title "New Title" --icon <iconId>
yoto chapter:delete <cardId> <chapterIdx>

# Tracks (easy way - creates chapter + track in one command)
yoto track:import <cardId> "Title" ./audio.mp3

# Tracks (manual way - more control)
yoto track:upload ./audio.mp3              # upload audio, get track URL
yoto track:upload ./audio.mp3 --no-wait    # upload without waiting for transcoding
yoto track:transcode-status <uploadId>     # check transcoding status
yoto track:add <cardId> <chapterIdx> "Track Title" <trackUrl>
yoto track:update <cardId> <chapterIdx> <trackIdx> --title "New Title"
yoto track:update <cardId> <chapterIdx> <trackIdx> --icon <mediaId>
yoto track:update <cardId> <chapterIdx> <trackIdx> --on-end repeat  # loop track
yoto track:update <cardId> <chapterIdx> <trackIdx> --on-end stop    # pause after track
yoto track:delete <cardId> <chapterIdx> <trackIdx>

# Icons
yoto icons                        # list public icons
yoto icons --tag music            # filter by tag
yoto icons:mine                   # list your custom icons
yoto icons:upload my-icon.png     # upload custom icon (auto-resizes to 16x16)

# Devices
yoto devices
yoto device <deviceId>
yoto device:cmd <deviceId> play|pause|stop|next|previous
yoto device:cmd <deviceId> volume <0-100>
```

Run `yoto --help` for full command list.


## Playlist Structure

Yoto playlists have a hierarchical structure:

```
Playlist (Card)
├── Chapter 1          ← Button press 1 on Yoto player
│   ├── Track 1        ← Audio files play sequentially
│   ├── Track 2
│   └── ...
├── Chapter 2          ← Button press 2
│   └── Track 1
└── ...
```

- **Playlist (Card)**: The top-level container, linked to a physical Yoto card
- **Chapter**: Corresponds to button presses on the Yoto player. Each chapter can contain one or more tracks.
- **Track**: An audio file. Tracks within a chapter play sequentially.

**Most MYO cards use a simple 1:1 pattern** - one chapter per audio file. To add audio:
1. Create a chapter: `yoto chapter:add <cardId> "Title"`
2. Add the track: `yoto track:add <cardId> <chapterIdx> "Title" <trackUrl>`

Or use the helper: `yoto track:import <cardId> "Title" ./audio.mp3` (uploads, transcodes, creates chapter & track)

## Development

```bash
bun dev <command>        # Run without compiling
bun run typecheck        # Type check
bun run build            # Build binary
```

## Build from Source

```bash
git clone https://github.com/TheBestMoshe/yoto-cli.git
cd yoto-cli
bun install
bun run build
```

The compiled binary will be at `./dist/yoto`.
