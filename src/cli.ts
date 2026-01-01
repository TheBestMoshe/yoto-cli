#!/usr/bin/env bun

import { Command } from "commander";
import { registerAuthCommands } from "./cli/auth.ts";
import { registerPlaylistCommands } from "./cli/playlists.ts";
import { registerIconCommands } from "./cli/icons.ts";
import { registerDeviceCommands } from "./cli/devices.ts";
import { error } from "./utils/output.ts";

const program = new Command();

program
  .name("yoto")
  .description("CLI for the Yoto API")
  .version("0.1.0");

registerAuthCommands(program);
registerPlaylistCommands(program);
registerIconCommands(program);
registerDeviceCommands(program);

program.parseAsync(process.argv).catch((err) => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
