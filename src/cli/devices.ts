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
    .action((options) => listDevices({ json: options.json }));

  program
    .command("device <deviceId>")
    .description("Get device status")
    .option("--json", "Output as JSON")
    .action((deviceId, options) =>
      getDeviceStatus(deviceId, { json: options.json })
    );

  program
    .command("device:cmd <deviceId> <command> [value]")
    .description("Send command to device (play, pause, stop, next, previous, volume)")
    .action(sendCommand);
}
