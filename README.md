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
yoto login --client-id <YOUR_CLIENT_ID>   # first time; the client ID is saved
yoto login
yoto logout
yoto status
```

#### Setting up login

Yoto has [deprecated the device code flow](https://yoto.dev/authentication/device-code-migration/),
so `yoto login` signs you in through your browser (OAuth + PKCE) and needs a
client ID for your own app:

1. Create an app at [dashboard.yoto.dev](https://dashboard.yoto.dev) as a **Public Client**
2. Add `http://127.0.0.1:8787/callback` as an Allowed Callback URL
   (use `--port` if you change the port, and register the matching URL)
3. Allow the scopes `offline_access`, `user:content:view`, `user:content:manage`, `family:library:view`, `user:icons:manage`,
   `family:devices:view` and `family:devices:control`
4. Run `yoto login --client-id <YOUR_CLIENT_ID>` (or set `YOTO_CLIENT_ID`)

### Playlists

```bash
yoto playlist list
yoto playlist show <cardId>
yoto playlist create "My Playlist" --description "Description" --author "Author"
yoto playlist update <cardId> --title "New Title"
yoto playlist delete <cardId>
```

### Entries

Entries are the main way to add content to playlists. Each entry creates a chapter with an audio track.

```bash
# Add entry (chapter + track)
yoto entry add <cardId> "Song Title" --file ./audio.mp3
yoto entry add <cardId> "Song Title" --file ./audio.mp3 --icon ./cover.png

# Update entry (updates both chapter and track)
yoto entry update <cardId> <entryIdx> --title "New Title"
yoto entry update <cardId> <entryIdx> --icon ./cover.png

# Delete entry
yoto entry delete <cardId> <entryIdx>
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

**Audio files** (for `--file` option):
- `./song.mp3` or `/path/to/audio.m4a` → uploads and transcodes automatically

**Icons** (for `--icon` option):
- `./cover.png` or `/path/to/icon.jpg` → uploads automatically
- `abc123def456` → uses existing mediaId

## Advanced: Chapters and Tracks

Under the hood, Yoto playlists have a hierarchical structure:

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

The `entry` command treats chapter + track as one unit (like the Yoto app). For advanced use cases where you need to work with chapters and tracks separately:

### Chapter Commands

```bash
yoto chapter add <cardId> "Chapter Title"              # Empty chapter
yoto chapter add <cardId> "Chapter Title" --icon ./icon.png
yoto chapter update <cardId> <chapterIdx> --title "New Title"
yoto chapter update <cardId> <chapterIdx> --icon ./icon.png
yoto chapter delete <cardId> <chapterIdx>
```

### Track Commands

```bash
# Add track to existing chapter (accepts file path, yoto:# hash, or URL)
yoto track add <cardId> <chapterIdx> "Track Title" ./audio.mp3
yoto track add <cardId> <chapterIdx> "Track Title" "yoto:#abc123"
yoto track add <cardId> <chapterIdx> "Track Title" ./audio.mp3 --icon ./cover.png

# Update track
yoto track update <cardId> <chapterIdx> <trackIdx> --title "New Title"
yoto track update <cardId> <chapterIdx> <trackIdx> --icon ./cover.png
yoto track update <cardId> <chapterIdx> <trackIdx> --on-end repeat  # loop track
yoto track update <cardId> <chapterIdx> <trackIdx> --on-end stop    # pause after track

# Delete track
yoto track delete <cardId> <chapterIdx> <trackIdx>

# Upload audio without adding to playlist
yoto track upload ./audio.mp3
yoto track upload ./audio.mp3 --no-wait
yoto track status <uploadId>
```

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
