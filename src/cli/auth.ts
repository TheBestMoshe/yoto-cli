import { Command } from "commander";
import { login, logout, status } from "../commands/auth.ts";

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate with your Yoto account using device flow")
    .addHelpText(
      "after",
      `
Opens a browser to authenticate with your Yoto account.
Credentials are stored locally in ~/.yoto-cli/config.json.

Examples:
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
