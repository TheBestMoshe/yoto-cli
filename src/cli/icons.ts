import { Command } from "commander";
import {
  listPublicIcons,
  listUserIcons,
  uploadIcon,
} from "../commands/icons.ts";

export function registerIconCommands(program: Command): void {
  program
    .command("icons")
    .description("List public Yoto icons")
    .option("--tag <tag>", "Filter icons by tag (e.g., music, animals)")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
  $ yoto icons
  $ yoto icons --tag music
  $ yoto icons --tag animals --json
`
    )
    .action((options) =>
      listPublicIcons({ json: options.json, tag: options.tag })
    );

  program
    .command("icons:mine")
    .description("List your uploaded custom icons")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
  $ yoto icons:mine
  $ yoto icons:mine --json
`
    )
    .action((options) => listUserIcons({ json: options.json }));

  program
    .command("icons:upload <file>")
    .description("Upload a custom icon image")
    .option("--no-convert", "Skip auto-resize (image must be exactly 16x16 PNG)")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Arguments:
  file    Path to image file (PNG, JPEG, or GIF)

The uploaded icon's mediaId can be used with track:update --icon or chapter:update --icon.

By default, images are automatically resized to 16x16 pixels.
Use --no-convert if your image is already 16x16 PNG.

Examples:
  $ yoto icons:upload ./my-icon.png
  $ yoto icons:upload ./my-icon.png --json
  $ yoto icons:upload ./16x16-icon.png --no-convert
`
    )
    .action((file, options) =>
      uploadIcon(file, { autoConvert: options.convert, json: options.json })
    );
}
