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
yoto logout
yoto status
```

### Playlists

```bash
yoto playlist list
yoto playlist show <cardId>
yoto playlist create "My Playlist" --description "Description" --author "Author"
yoto playlist edit <cardId> --title "New Title"
yoto playlist delete <cardId>
```

### Chapters

```bash
# Add chapter (with optional audio file and icon)
yoto chapter add <cardId> "Chapter Title"
yoto chapter add <cardId> "Chapter Title" --file ./audio.mp3
yoto chapter add <cardId> "Chapter Title" --file ./audio.mp3 --icon ./cover.png

# Edit and delete
yoto chapter edit <cardId> <chapterIdx> --title "New Title" --icon ./icon.png
yoto chapter delete <cardId> <chapterIdx>
```

### Tracks

```bash
# Add track (accepts file path, yoto:# hash, or URL)
yoto track add <cardId> <chapterIdx> "Track Title" ./audio.mp3
yoto track add <cardId> <chapterIdx> "Track Title" "yoto:#abc123"
yoto track add <cardId> <chapterIdx> "Track Title" ./audio.mp3 --icon ./cover.png

# Edit track
yoto track edit <cardId> <chapterIdx> <trackIdx> --title "New Title"
yoto track edit <cardId> <chapterIdx> <trackIdx> --icon ./cover.png
yoto track edit <cardId> <chapterIdx> <trackIdx> --on-end repeat  # loop track
yoto track edit <cardId> <chapterIdx> <trackIdx> --on-end stop    # pause after track

# Delete track
yoto track delete <cardId> <chapterIdx> <trackIdx>

# Upload audio without adding to playlist
yoto track upload ./audio.mp3
yoto track upload ./audio.mp3 --no-wait
yoto track status <uploadId>
```

### Icons

```bash
yoto icon list                    # list public icons
yoto icon list --tag music        # filter by tag
yoto icon list --mine             # list your custom icons
yoto icon upload ./my-icon.png    # upload custom icon (auto-resizes to 16x16)
```

### Devices

```bash
yoto device list
yoto device show <deviceId>
yoto device play <deviceId>
yoto device pause <deviceId>
yoto device stop <deviceId>
yoto device next <deviceId>
yoto device previous <deviceId>
yoto device volume <deviceId> <0-100>
```

Run `yoto --help` for full command list.

## Smart File Detection

The CLI automatically detects whether you're providing a file path or an existing ID:

**Audio sources** (for `track add`):
- `./song.mp3` or `/path/to/audio.m4a` → uploads and transcodes automatically
- `yoto:#abc123` → uses existing uploaded audio
- `https://...` → uses external URL

**Icons** (for `--icon` option):
- `./cover.png` or `/path/to/icon.jpg` → uploads automatically
- `abc123def456` → uses existing mediaId

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
- **Chapter**: Corresponds to button presses on the Yoto player
- **Track**: An audio file. Tracks within a chapter play sequentially

**Quick add**: Use `yoto chapter add <cardId> "Title" --file ./audio.mp3` to create a chapter with a track in one command.

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
