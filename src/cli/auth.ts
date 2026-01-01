import { Command } from "commander";
import { login, logout, status } from "../commands/auth.ts";

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authenticate with your Yoto account")
    .action(login);

  program
    .command("logout")
    .description("Remove stored credentials")
    .action(logout);

  program
    .command("status")
    .description("Check authentication status")
    .action(status);
}
