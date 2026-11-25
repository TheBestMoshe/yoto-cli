import { YotoClient, DEFAULT_SCOPES } from "../api/client.ts";
import {
  loadConfig,
  saveConfig,
  clearConfig,
  getConfigPath,
  type Config,
} from "../utils/config.ts";
import { success, error, info } from "../utils/output.ts";

// Client ID previously bundled with the CLI. It was only set up for the
// now-deprecated device code flow and has no loopback callback URL registered,
// so it can't be used for the PKCE login flow.
const LEGACY_CLIENT_ID = "A1c4Noo77MdN7CB8QjUOvwtdyMZnSwkd";

const DEFAULT_PORT = 8787;
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export interface LoginOptions {
  clientId?: string;
  port?: string;
  browser?: boolean;
}

function base64url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  try {
    Bun.spawn(cmd, { stdout: "ignore", stderr: "ignore" });
  } catch {
    // Ignore; the URL is printed for the user to open manually.
  }
}

async function resolveClientId(flag?: string): Promise<string | undefined> {
  if (flag) return flag;
  if (process.env.YOTO_CLIENT_ID) return process.env.YOTO_CLIENT_ID;
  const config = await loadConfig();
  if (config?.clientId && config.clientId !== LEGACY_CLIENT_ID) {
    return config.clientId;
  }
  return undefined;
}

function htmlPage(message: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Yoto CLI</title><p style="font-family:sans-serif">${message}</p>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function login(options: LoginOptions = {}): Promise<void> {
  const clientId = await resolveClientId(options.clientId);
  if (!clientId) {
    error("A Yoto client ID is required.");
    console.log(`
Yoto no longer supports the device code login this CLI used before, so you
need to register your own (free) app:

  1. Go to https://dashboard.yoto.dev and create a Public Client app
  2. Add this Allowed Callback URL: http://127.0.0.1:${DEFAULT_PORT}/callback
  3. Allow these scopes: ${DEFAULT_SCOPES}
  4. Run: yoto login --client-id <YOUR_CLIENT_ID>
     (or set the YOTO_CLIENT_ID environment variable)

The client ID is saved, so later logins only need 'yoto login'.`);
    process.exit(1);
  }

  const port = options.port ? Number(options.port) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const client = new YotoClient({ clientId });
  const { verifier, challenge } = await createPkcePair();
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)));
  const authUrl = client.buildAuthorizeUrl({
    redirectUri,
    codeChallenge: challenge,
    state,
  });

  let resolveCode!: (code: string) => void;
  let rejectCode!: (err: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  let server: ReturnType<typeof Bun.serve>;
  try {
    server = Bun.serve({
      hostname: "127.0.0.1",
      port,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }
        const err = url.searchParams.get("error");
        if (err) {
          const desc = url.searchParams.get("error_description");
          rejectCode(new Error(desc ? `${err}: ${desc}` : err));
          return htmlPage("Login failed. You can close this tab and check your terminal.");
        }
        if (url.searchParams.get("state") !== state) {
          return new Response("Invalid state", { status: 400 });
        }
        const code = url.searchParams.get("code");
        if (!code) {
          return new Response("Missing code", { status: 400 });
        }
        resolveCode(code);
        return htmlPage("Login complete! You can close this tab and return to your terminal.");
      },
    });
  } catch (err) {
    throw new Error(
      `Could not listen on 127.0.0.1:${port} (${err instanceof Error ? err.message : err}). ` +
        `Use --port <port> and register http://127.0.0.1:<port>/callback in your Yoto app.`
    );
  }

  const timeout = setTimeout(
    () => rejectCode(new Error("Authorization timed out. Please try again.")),
    LOGIN_TIMEOUT_MS
  );

  try {
    console.log("\nTo authorize this CLI, open this URL in your browser:");
    console.log(`  ${authUrl}\n`);
    if (options.browser !== false) openBrowser(authUrl);
    info("Waiting for authorization...");

    const code = await codePromise;
    const tokens = await client.exchangeAuthorizationCode({
      code,
      codeVerifier: verifier,
      redirectUri,
    });

    await saveConfig({
      clientId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    success("Successfully logged in!");
    info(`Config saved to ${getConfigPath()}`);
  } finally {
    clearTimeout(timeout);
    server.stop(true);
  }
}

export async function logout(): Promise<void> {
  await clearConfig();
  success("Logged out. Credentials removed.");
}

export async function status(): Promise<void> {
  const config = await loadConfig();

  if (!config?.accessToken) {
    info("Not logged in. Run 'yoto login' to authenticate.");
    return;
  }

  const client = createClientFromConfig(config);

  try {
    await client.listContent();
    success("Logged in and token is valid.");
  } catch {
    error("Token may be expired. Try 'yoto login' to re-authenticate.");
  }
}

export async function getAuthenticatedClient(): Promise<YotoClient> {
  const config = await loadConfig();

  if (!config?.accessToken) {
    error("Not logged in. Run 'yoto login' first.");
    process.exit(1);
  }

  return createClientFromConfig(config);
}

function createClientFromConfig(config: Config): YotoClient {
  return new YotoClient({
    clientId: config.clientId,
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    onTokensRefreshed: (accessToken, refreshToken) =>
      saveConfig({ ...config, accessToken, refreshToken }),
  });
}
