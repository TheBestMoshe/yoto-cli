import { z } from "zod";
import {
  TokenResponseSchema,
  AuthErrorSchema,
  GetContentResponseSchema,
  ListContentResponseSchema,
  DeleteContentResponseSchema,
  GetPublicIconsResponseSchema,
  GetUserIconsResponseSchema,
  UploadIconResponseSchema,
  UploadUrlResponseSchema,
  TranscodedAudioResponseSchema,
  GetDevicesResponseSchema,
  DeviceStatusSchema,
  type TokenResponse,
  type GetContentResponse,
  type ListContentResponse,
  type CreateContentRequest,
  type UpdateContentRequest,
  type DeleteContentResponse,
  type GetPublicIconsResponse,
  type GetUserIconsResponse,
  type UploadIconResponse,
  type UploadUrlResponse,
  type TranscodedAudioResponse,
  type GetDevicesResponse,
  type DeviceStatus,
} from "./schemas.ts";

const AUTH_BASE_URL = "https://login.yotoplay.com";
const API_BASE_URL = "https://api.yotoplay.com";
const API_AUDIENCE = "https://api.yotoplay.com";

// Scopes needed by the CLI's commands (https://yoto.dev/authentication/scopes/).
// Your app at https://dashboard.yoto.dev must allow these.
export const DEFAULT_SCOPES = [
  "offline_access", // refresh token
  "user:content:view", // read playlists (not implied by user:content:manage)
  "user:content:manage", // create/update playlists, entries, chapters, tracks, uploads
  "family:library:view", // required alongside user:content:view to read cards
  "user:icons:manage", // icons
  "family:devices:view", // devices list/status
  "family:devices:control", // device commands
].join(" ");

function describeAuthError(data: unknown, fallback: string): string {
  const parsed = AuthErrorSchema.safeParse(data);
  if (!parsed.success) return fallback;
  const { error, error_description } = parsed.data;
  return error_description ? `${error}: ${error_description}` : error;
}

export interface YotoClientConfig {
  clientId: string;
  accessToken?: string;
  refreshToken?: string;
  /** Called after tokens are refreshed so they can be persisted (refresh tokens are single-use). */
  onTokensRefreshed?: (accessToken: string, refreshToken: string) => void | Promise<void>;
}

export class YotoClient {
  private clientId: string;
  private accessToken?: string;
  private refreshToken?: string;
  private onTokensRefreshed?: YotoClientConfig["onTokensRefreshed"];

  constructor(config: YotoClientConfig) {
    this.clientId = config.clientId;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.onTokensRefreshed = config.onTokensRefreshed;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  getTokens() {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
    };
  }

  // ============ Authentication ============
  //
  // Yoto deprecated the OAuth device code flow for CLIs
  // (https://yoto.dev/authentication/device-code-migration/). Logins now use
  // the Authorization Code flow with PKCE over a loopback redirect
  // (https://yoto.dev/authentication/headless-cli-auth/).

  buildAuthorizeUrl(params: {
    redirectUri: string;
    codeChallenge: string;
    state: string;
    scope?: string;
  }): string {
    const url = new URL(`${AUTH_BASE_URL}/authorize`);
    url.search = new URLSearchParams({
      audience: API_AUDIENCE,
      scope: params.scope ?? DEFAULT_SCOPES,
      response_type: "code",
      client_id: this.clientId,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: params.redirectUri,
      state: params.state,
    }).toString();
    return url.toString();
  }

  async exchangeAuthorizationCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenResponse> {
    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        code_verifier: params.codeVerifier,
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(describeAuthError(data, "Token exchange failed"));
    }

    const tokens = TokenResponseSchema.parse(data);
    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token returned. Make sure your Yoto app allows the offline_access scope."
      );
    }
    this.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  }

  async refreshAccessToken(): Promise<TokenResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(describeAuthError(data, "Failed to refresh token"));
    }

    const tokens = TokenResponseSchema.parse(data);
    // Yoto refresh tokens are single-use; keep the old one only if no new one is issued.
    this.setTokens(tokens.access_token, tokens.refresh_token ?? this.refreshToken);
    await this.onTokensRefreshed?.(this.accessToken!, this.refreshToken!);
    return tokens;
  }

  // ============ API Request Helper ============

  private async apiRequest<T>(
    path: string,
    schema: z.ZodType<T>,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Please login first.");
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      if (this.refreshToken) {
        await this.refreshAccessToken();
        return this.apiRequest(path, schema, options);
      }
      throw new Error("Authentication expired. Please login again.");
    }

    const data: unknown = await response.json();

    if (!response.ok) {
      const apiError = data as { error?: { message?: string } } | null;
      const message =
        apiError?.error?.message || `API request failed: ${response.status}`;
      throw new Error(message);
    }

    return schema.parse(data);
  }

  // ============ Content/Playlists ============

  async listContent(showDeleted = false): Promise<ListContentResponse> {
    const params = new URLSearchParams();
    if (showDeleted) params.set("showdeleted", "true");
    const query = params.toString() ? `?${params}` : "";
    return this.apiRequest(
      `/content/mine${query}`,
      ListContentResponseSchema
    );
  }

  async getContent(
    cardId: string,
    options?: { timezone?: string; playable?: boolean }
  ): Promise<GetContentResponse> {
    const params = new URLSearchParams();
    if (options?.timezone) params.set("timezone", options.timezone);
    if (options?.playable) {
      params.set("playable", "true");
      params.set("signingType", "s3");
    }
    const query = params.toString() ? `?${params}` : "";
    return this.apiRequest(
      `/content/${cardId}${query}`,
      GetContentResponseSchema
    );
  }

  async createContent(data: CreateContentRequest): Promise<GetContentResponse> {
    return this.apiRequest("/content", GetContentResponseSchema, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateContent(
    cardId: string,
    data: Omit<UpdateContentRequest, "cardId">
  ): Promise<GetContentResponse> {
    return this.apiRequest("/content", GetContentResponseSchema, {
      method: "POST",
      body: JSON.stringify({ ...data, cardId }),
    });
  }

  async deleteContent(cardId: string): Promise<DeleteContentResponse> {
    return this.apiRequest(`/content/${cardId}`, DeleteContentResponseSchema, {
      method: "DELETE",
    });
  }

  // ============ Icons ============

  async getPublicIcons(): Promise<GetPublicIconsResponse> {
    return this.apiRequest(
      "/media/displayIcons/user/yoto",
      GetPublicIconsResponseSchema
    );
  }

  async getUserIcons(userId?: string): Promise<GetUserIconsResponse> {
    const id = userId || "me";
    return this.apiRequest(
      `/media/displayIcons/user/${id}`,
      GetUserIconsResponseSchema
    );
  }

  async uploadIcon(
    file: Buffer | Uint8Array,
    options?: { filename?: string; autoConvert?: boolean }
  ): Promise<UploadIconResponse> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Please login first.");
    }

    const params = new URLSearchParams();
    if (options?.autoConvert !== undefined) {
      params.set("autoConvert", String(options.autoConvert));
    }
    if (options?.filename) {
      params.set("filename", options.filename);
    }
    const query = params.toString() ? `?${params}` : "";

    const filename = options?.filename || "icon.png";
    const mimeType = filename.endsWith(".png") ? "image/png"
      : filename.endsWith(".gif") ? "image/gif"
      : "image/jpeg";

    const response = await fetch(
      `${API_BASE_URL}/media/displayIcons/user/me/upload${query}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": mimeType,
        },
        body: file,
      }
    );

    if (!response.ok) {
      const data: unknown = await response.json().catch(() => ({}));
      const apiError = data as { error?: { message?: string } } | null;
      throw new Error(
        apiError?.error?.message || `Upload failed: ${response.status}`
      );
    }

    const data: unknown = await response.json();
    return UploadIconResponseSchema.parse(data);
  }

  // ============ Media Upload ============

  async getAudioUploadUrl(
    sha256: string,
    filename?: string
  ): Promise<UploadUrlResponse> {
    const params = new URLSearchParams({ sha256 });
    if (filename) params.set("filename", filename);
    return this.apiRequest(
      `/media/transcode/audio/uploadUrl?${params}`,
      UploadUrlResponseSchema
    );
  }

  async uploadFile(
    uploadUrl: string,
    file: Buffer | Uint8Array
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.status}`);
    }
  }

  async getTranscodedAudio(uploadId: string): Promise<TranscodedAudioResponse> {
    return this.apiRequest(
      `/media/upload/${uploadId}/transcoded?loudnorm=false`,
      TranscodedAudioResponseSchema
    );
  }

  // ============ Devices ============

  async getDevices(): Promise<GetDevicesResponse> {
    return this.apiRequest("/device-v2/devices/mine", GetDevicesResponseSchema);
  }

  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    return this.apiRequest(
      `/device-v2/${deviceId}/status`,
      DeviceStatusSchema
    );
  }

  async sendDeviceCommand(
    deviceId: string,
    command: Record<string, unknown>
  ): Promise<void> {
    await this.apiRequest(`/device-v2/${deviceId}/command`, z.unknown(), {
      method: "POST",
      body: JSON.stringify(command),
    });
  }
}
