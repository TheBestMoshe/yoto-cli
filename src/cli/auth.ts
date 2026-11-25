import { Command } from "commander";
import { login, logout, status } from "../commands/auth.ts";

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate with your Yoto account in your browser")
    .option("--client-id <id>", "Client ID of your app from https://dashboard.yoto.dev (or set YOTO_CLIENT_ID)")
    .option("--port <port>", "Local callback port (default: 8787)")
    .option("--no-browser", "Print the login URL without opening a browser")
    .addHelpText(
      "after",
      `
Opens a browser to authenticate with your Yoto account (OAuth + PKCE),
and receives the result on http://127.0.0.1:<port>/callback.

Requires your own app registered at https://dashboard.yoto.dev:
  - Application type: Public Client
  - Allowed Callback URL: http://127.0.0.1:8787/callback
The client ID is saved after the first login.
Credentials are stored locally in ~/.yoto-cli/config.json.

Examples:
  $ yoto login --client-id <YOUR_CLIENT_ID>
  $ yoto login
`
    )
    .action(login);

  program
    .command("logout")
    .description("Remove stored credentials")
    .addHelpText(
      "after",
      `
Removes stored authentication tokens from ~/.yoto-cli/config.json.

Examples:
  $ yoto logout
`
    )
    .action(logout);

  program
    .command("status")
    .description("Check if you are authenticated")
    .addHelpText(
      "after",
      `
Shows whether you have valid stored credentials.

Examples:
  $ yoto status
`
    )
    .action(status);
}
