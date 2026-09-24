import type { Nullable, Optional } from '@silverhand/essentials';
import { z } from 'zod';

const nullishToUndefined = <T = unknown>(input: Nullable<T>): Optional<T> => {
  if (!input) {
    return;
  }

  return input;
};

export const twitchConfigGuard = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  scope: z.string().optional(),
});

export type TwitchConfig = z.infer<typeof twitchConfigGuard>;

export const accessTokenResponseGuard = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.array(z.string()),
});

export type AccessTokenResponse = z.infer<typeof accessTokenResponseGuard>;

export const userInfoResponseGuard = z.object({
  data: z.array(z.object({
    id: z.string(),
    login: z.string().nullish().transform(nullishToUndefined),
    display_name: z.string().nullish().transform(nullishToUndefined),
    type: z.string().nullish().transform(nullishToUndefined),
    broadcaster_type: z.string().nullish().transform(nullishToUndefined),
    // @ts-ignore
    description: z.string().nullish().transform(nullishToUndefined),
    profile_image_url: z.string().nullish().transform(nullishToUndefined),
    offline_image_url: z.string().nullish().transform(nullishToUndefined),
    view_count: z.number().nullish().transform(nullishToUndefined),
    email: z.string().nullish().transform(nullishToUndefined),
    created_at: z.string().nullish().transform(nullishToUndefined),
  })),
});

export type UserInfoResponse = z.infer<typeof userInfoResponseGuard>;

export const authorizationCallbackErrorGuard = z.object({
  error: z.string(),
  error_description: z.string(),
});

export const authResponseGuard = z.object({ code: z.string(), redirectUri: z.string() });
