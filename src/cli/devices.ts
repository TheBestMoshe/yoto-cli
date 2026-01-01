import { Command } from "commander";
import {
  listDevices,
  getDeviceStatus,
  sendCommand,
} from "../commands/devices.ts";

export function registerDeviceCommands(program: Command): void {
  program
    .command("devices")
    .description("List your Yoto devices")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Examples:
  $ yoto devices
  $ yoto devices --json
`
    )
    .action((options) => listDevices({ json: options.json }));

  program
    .command("device <deviceId>")
    .description("Get device status (playback state, volume, battery)")
    .option("--json", "Output as JSON")
    .addHelpText(
      "after",
      `
Arguments:
  deviceId    The device ID (from 'yoto devices')

Examples:
  $ yoto device Y12345678
  $ yoto device Y12345678 --json
`
    )
    .action((deviceId, options) =>
      getDeviceStatus(deviceId, { json: options.json })
    );

  program
    .command("device:cmd <deviceId> <command> [value]")
    .description("Send a command to a Yoto device")
    .addHelpText(
      "after",
      `
Arguments:
  deviceId    The device ID (from 'yoto devices')
  command     Command to send: play, pause, stop, next, previous, volume
  value       Value for command (required for 'volume': 0-100)

Commands:
  play        Start/resume playback
  pause       Pause playback
  stop        Stop playback
  next        Skip to next track
  previous    Go to previous track
  volume      Set volume level (requires value 0-100)

Examples:
  $ yoto device:cmd Y12345678 play
  $ yoto device:cmd Y12345678 pause
  $ yoto device:cmd Y12345678 volume 50
  $ yoto device:cmd Y12345678 next
`
    )
    .action(sendCommand);
}
