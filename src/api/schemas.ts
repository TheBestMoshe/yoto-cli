import { z } from "zod";

// ============ Authentication Schemas ============

export const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string(),
  expires_in: z.number(),
  interval: z.number(),
});

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  id_token: z.string().optional(),
  expires_at: z.number().optional(),
});

export const AuthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

// ============ Content Schemas ============

const DisplaySchema = z.object({
  icon16x16: z.string().optional(),
}).nullable().optional();

const TrackEventsSchema = z.object({
  onEnd: z.object({
    cmd: z.string().optional(), // "none" (continue), "stop" (pause/wait), "repeat" (loop)
  }).optional(),
}).optional();

export const TrackSchema = z.object({
  key: z.string(),
  title: z.string(),
  duration: z.number().optional().nullable(),
  format: z.string().optional(),
  channels: z.string().optional(), // e.g. "stereo"
  type: z.string().optional(),
  trackUrl: z.string().optional(),
  icon: z.string().optional(),
  overlayLabel: z.string().optional(),
  display: DisplaySchema,
  fileSize: z.number().optional().nullable(),
  ambient: z.unknown().optional().nullable(),
  events: TrackEventsSchema,
});

export const ChapterSchema = z.object({
  key: z.string(),
  title: z.string(),
  duration: z.number().optional(),
  icon: z.string().optional(),
  tracks: z.array(TrackSchema),
  overlayLabel: z.string().optional(),
  display: DisplaySchema,
  fileSize: z.number().optional(),
  _originalFileName: z.string().optional(),
  availableFrom: z.unknown().optional().nullable(),
  ambient: z.unknown().optional().nullable(),
  defaultTrackDisplay: z.unknown().optional().nullable(),
  defaultTrackAmbient: z.unknown().optional().nullable(),
});

export const ContentConfigSchema = z.object({
  resumeTimeout: z.number().optional(),
});

export const ContentMetadataSchema = z.object({
  author: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const ContentSchema = z.object({
  chapters: z.array(ChapterSchema),
  config: ContentConfigSchema.optional(),
  playbackType: z.string().optional(),
  activity: z.string().optional(),
  version: z.string().optional(),
  hidden: z.boolean().optional(),
  restricted: z.boolean().optional(),
});

export const CardSchema = z.object({
  _id: z.string().optional(),
  cardId: z.string(),
  title: z.string(),
  content: ContentSchema,
  metadata: ContentMetadataSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  userId: z.string().optional(),
  availability: z.string().optional(),
  deleted: z.boolean().optional(),
});

// For list responses, content may not include chapters
export const CardSummarySchema = CardSchema.extend({
  content: ContentSchema.partial(),
});

export const GetContentResponseSchema = z.object({
  card: CardSchema,
});

export const ListContentResponseSchema = z.object({
  cards: z.array(CardSummarySchema),
});

export const DeleteContentResponseSchema = z.object({
  status: z.string(),
});

// ============ Icons Schemas ============

// Public icons (from getPublicIcons)
// Note: API sometimes omits `new` and `title` despite documentation
export const PublicIconSchema = z.object({
  createdAt: z.string(),
  displayIconId: z.string(),
  mediaId: z.string(),
  new: z.boolean().optional(),
  public: z.boolean(),
  publicTags: z.array(z.string()),
  title: z.string().optional(),
  url: z.string(),
  userId: z.string(),
});

// User icons (from getUserIcons) don't have new, publicTags, or title
export const UserIconSchema = z.object({
  createdAt: z.string(),
  displayIconId: z.string(),
  mediaId: z.string(),
  public: z.boolean(),
  url: z.string(),
  userId: z.string(),
});

export const GetPublicIconsResponseSchema = z.object({
  displayIcons: z.array(PublicIconSchema),
});

export const GetUserIconsResponseSchema = z.object({
  displayIcons: z.array(UserIconSchema),
});

export const UploadIconResponseSchema = z.object({
  displayIcon: z.object({
    displayIconId: z.string(),
    mediaId: z.string(),
    new: z.boolean().optional(),
    url: z.union([z.string(), z.object({})]), // empty object if duplicate
    userId: z.string(),
  }),
});

// ============ Media Schemas ============

export const UploadUrlResponseSchema = z.object({
  upload: z.object({
    uploadId: z.string(),
    uploadUrl: z.string().nullable(),
  }),
});

export const TranscodedAudioResponseSchema = z.object({
  transcode: z.object({
    uploadId: z.string(),
    uploadSha256: z.string(),
    progress: z.object({
      phase: z.string(), // "queued", "processing", "complete"
      percent: z.number().optional(),
    }).passthrough().optional(),
    transcodedSha256: z.string().optional(),
    transcodedInfo: z.object({
      duration: z.number().optional(),
      codec: z.string().optional(),
      format: z.string().optional(),
      channels: z.string().optional(),
      metadata: z.object({
        title: z.string().optional(),
        artist: z.string().optional(),
      }).optional(),
    }).passthrough().optional(),
  }).passthrough(),
});

// ============ Device Schemas ============

export const DeviceSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  deviceType: z.string().optional(),
  online: z.boolean().optional(),
});

export const DeviceStatusSchema = z.object({
  playerId: z.string().optional(),
  playerStatus: z.string().optional(),
  cardId: z.string().optional(),
  chapterKey: z.string().optional(),
  trackKey: z.string().optional(),
  volume: z.number().optional(),
  batteryLevel: z.number().optional(),
});

export const GetDevicesResponseSchema = z.object({
  devices: z.array(DeviceSchema),
});

// ============ API Error Schema ============

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ============ Inferred Types ============

export type DeviceCodeResponse = z.infer<typeof DeviceCodeResponseSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type AuthError = z.infer<typeof AuthErrorSchema>;
export type Track = z.infer<typeof TrackSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type ContentConfig = z.infer<typeof ContentConfigSchema>;
export type ContentMetadata = z.infer<typeof ContentMetadataSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type Card = z.infer<typeof CardSchema>;
export type CardSummary = z.infer<typeof CardSummarySchema>;
export type GetContentResponse = z.infer<typeof GetContentResponseSchema>;
export type ListContentResponse = z.infer<typeof ListContentResponseSchema>;
export type DeleteContentResponse = z.infer<typeof DeleteContentResponseSchema>;
export type PublicIcon = z.infer<typeof PublicIconSchema>;
export type UserIcon = z.infer<typeof UserIconSchema>;
export type GetPublicIconsResponse = z.infer<typeof GetPublicIconsResponseSchema>;
export type GetUserIconsResponse = z.infer<typeof GetUserIconsResponseSchema>;
export type UploadIconResponse = z.infer<typeof UploadIconResponseSchema>;
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
export type TranscodedAudioResponse = z.infer<typeof TranscodedAudioResponseSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
export type GetDevicesResponse = z.infer<typeof GetDevicesResponseSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ============ Request Types (not validated, just for typing) ============

export interface CreateContentRequest {
  cardId?: string;
  title: string;
  content: Content;
  metadata?: ContentMetadata;
}

export interface UpdateContentRequest {
  cardId?: string;
  title: string;
  content?: Partial<Content>;
  metadata?: Partial<ContentMetadata>;
}
