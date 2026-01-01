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
    .option("--tag <tag>", "Filter by tag")
    .option("--json", "Output as JSON")
    .action((options) =>
      listPublicIcons({ json: options.json, tag: options.tag })
    );

  program
    .command("icons:mine")
    .description("List your custom icons")
    .option("--json", "Output as JSON")
    .action((options) => listUserIcons({ json: options.json }));

  program
    .command("icons:upload <file>")
    .description("Upload a custom icon")
    .option("--no-convert", "Don't auto-resize (must be 16x16 PNG)")
    .option("--json", "Output as JSON")
    .action((file, options) =>
      uploadIcon(file, { autoConvert: options.convert, json: options.json })
    );
}
