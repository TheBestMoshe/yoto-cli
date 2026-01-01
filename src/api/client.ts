import { z } from "zod";
import {
  DeviceCodeResponseSchema,
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
  type DeviceCodeResponse,
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

export interface YotoClientConfig {
  clientId: string;
  accessToken?: string;
  refreshToken?: string;
}

export class YotoClient {
  private clientId: string;
  private accessToken?: string;
  private refreshToken?: string;

  constructor(config: YotoClientConfig) {
    this.clientId = config.clientId;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
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

  async initDeviceFlow(): Promise<DeviceCodeResponse> {
    const response = await fetch(`${AUTH_BASE_URL}/oauth/device/code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        scope: "profile offline_access openid",
        audience: "https://api.yotoplay.com",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = AuthErrorSchema.safeParse(data);
      throw new Error(
        error.success
          ? error.data.error_description || error.data.error
          : "Failed to init device flow"
      );
    }

    return DeviceCodeResponseSchema.parse(data);
  }

  async pollForToken(deviceCode: string): Promise<TokenResponse> {
    const response = await fetch(`${AUTH_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = AuthErrorSchema.safeParse(data);
      throw new Error(error.success ? error.data.error : "authorization_pending");
    }

    const tokens = TokenResponseSchema.parse(data);
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

    const data = await response.json();

    if (!response.ok) {
      const error = AuthErrorSchema.safeParse(data);
      throw new Error(
        error.success
          ? error.data.error_description || error.data.error
          : "Failed to refresh token"
      );
    }

    const tokens = TokenResponseSchema.parse(data);
    this.setTokens(tokens.access_token, tokens.refresh_token);
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
