import { getAuthenticatedClient } from "./auth.ts";
import { info, table, json, success } from "../utils/output.ts";

export async function listDevices(options: { json?: boolean }): Promise<void> {
  const client = await getAuthenticatedClient();
  const response = await client.getDevices();

  if (options.json) {
    json(response.devices);
    return;
  }

  if (response.devices.length === 0) {
    info("No devices found.");
    return;
  }

  table(
    ["Name", "Device ID", "Type", "Online"],
    response.devices.map((device) => [
      device.name,
      device.deviceId,
      device.deviceType || "-",
      device.online ? "Yes" : "No",
    ])
  );
}

export async function getDeviceStatus(
  deviceId: string,
  options: { json?: boolean }
): Promise<void> {
  const client = await getAuthenticatedClient();
  const status = await client.getDeviceStatus(deviceId);

  if (options.json) {
    json(status);
    return;
  }

  console.log(`\nDevice Status: ${deviceId}`);
  if (status.playerStatus) console.log(`  Status: ${status.playerStatus}`);
  if (status.cardId) console.log(`  Playing Card: ${status.cardId}`);
  if (status.chapterKey) console.log(`  Chapter: ${status.chapterKey}`);
  if (status.trackKey) console.log(`  Track: ${status.trackKey}`);
  if (status.volume !== undefined) console.log(`  Volume: ${status.volume}%`);
  if (status.batteryLevel !== undefined)
    console.log(`  Battery: ${status.batteryLevel}%`);
}

export async function sendCommand(
  deviceId: string,
  command: string,
  value?: string
): Promise<void> {
  const client = await getAuthenticatedClient();

  const commandMap: Record<string, Record<string, unknown>> = {
    play: { command: "play" },
    pause: { command: "pause" },
    stop: { command: "stop" },
    next: { command: "next" },
    previous: { command: "previous" },
    volume: { command: "volume", value: parseInt(value || "50", 10) },
  };

  const cmd = commandMap[command.toLowerCase()];
  if (!cmd) {
    console.error(
      `Unknown command: ${command}. Available: play, pause, stop, next, previous, volume`
    );
    process.exit(1);
  }

  await client.sendDeviceCommand(deviceId, cmd);
  success(`Sent ${command} command to device`);
}
