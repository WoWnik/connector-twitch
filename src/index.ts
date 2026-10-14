import { assert } from '@silverhand/essentials';
import { got, HTTPError } from 'got';

import type {
  CreateConnector,
  GetAccessTokenByRefreshToken,
  GetAuthorizationUri,
  GetConnectorConfig,
  GetSession,
  GetTokenResponseAndUserInfo,
  GetUserInfo,
  SocialConnector,
  SocialUserInfo,
  TokenResponse,
} from '@logto/connector-kit';
import {
  ConnectorError,
  ConnectorErrorCodes,
  ConnectorType,
  parseJson,
  socialUserInfoGuard,
  validateConfig,
} from '@logto/connector-kit';

import {
  accessTokenEndpoint,
  authorizationEndpoint,
  defaultMetadata,
  defaultTimeout,
  scope as defaultScope,
  userInfoEndpoint,
} from './constant.js';
import { AccessTokenResponse, AuthResponse, TwitchConfig, UserInfoResponse } from './types.js';
import {
  accessTokenResponseGuard,
  authResponseGuard,
  twitchConfigGuard,
  userInfoResponseGuard,
} from './types.js';
import { SafeParseReturnType } from 'zod';

const getAuthorizationUri =
  (getConfig: GetConnectorConfig): GetAuthorizationUri =>
  async ({ state, redirectUri, scope }): Promise<string> => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);

    const queryParameters = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: scope ?? config.scope ?? defaultScope,
      state,
    });

    return `${authorizationEndpoint}?${queryParameters.toString()}`;
  };

export const getAccessToken = async (
  config: TwitchConfig,
  codeObject: AuthResponse
): Promise<TokenResponse> => {
  const { code, redirectUri } = codeObject;
  const { clientId, clientSecret, customConfig } = config;

  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      ...customConfig,
    },
    timeout: { request: defaultTimeout },
  });

  const result: SafeParseReturnType<any, AccessTokenResponse> = accessTokenResponseGuard.safeParse(
    parseJson(httpResponse.body)
  );

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }

  assert(
    result.data.access_token,
    new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid, result.data)
  );

  return {
    access_token: result.data.access_token,
    refresh_token: result.data.refresh_token,
    expires_in: result.data.expires_in,
    scope: result.data.scope.join(' '),
    token_type: result.data.token_type,
  };
};

const getUserInfo =
  (getConfig: GetConnectorConfig): GetUserInfo =>
  async (data: unknown, getSession: GetSession): Promise<SocialUserInfo> => {
    const { userInfo } = await getTokenResponseAndUserInfo(getConfig)(data, getSession);
    return userInfo;
  };

const getTokenResponseAndUserInfo =
  (getConfig: GetConnectorConfig): GetTokenResponseAndUserInfo =>
  async (
    data: unknown,
    getSession: GetSession
  ): Promise<{
    tokenResponse?: TokenResponse;
    userInfo: SocialUserInfo;
  }> => {
    const authResponse: AuthResponse = await authorizationCallbackHandler(data);
    const config: TwitchConfig = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);
    const tokenResponse: TokenResponse = await getAccessToken(config, authResponse);

    try {
      const httpResponse = await got.get(userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
          'Client-Id': config.clientId,
        },
        timeout: { request: defaultTimeout },
      });
      const rawData = parseJson(httpResponse.body);
      const result: SafeParseReturnType<any, UserInfoResponse> =
        userInfoResponseGuard.safeParse(rawData);

      if (!result.success) {
        throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
      }

      const { id, login: name, profile_image_url: avatar, email } = result.data.data[0];

      const rawUserInfo = {
        id,
        name,
        avatar,
        email,
      };

      const userInfoResult = socialUserInfoGuard.safeParse(rawUserInfo);

      if (!userInfoResult.success) {
        throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, userInfoResult.error);
      }

      const userInfo: SocialUserInfo = { ...userInfoResult.data, rawData };

      return {
        tokenResponse,
        userInfo,
      };
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        // @ts-ignore
        const { statusCode, body: rawBody } = error.response;

        if (statusCode === 401) {
          throw new ConnectorError(
            ConnectorErrorCodes.SocialAccessTokenInvalid,
            `Unauthorized access token: ${tokenResponse.access_token}, clientId: ${config.clientId}`
          );
        }

        throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(rawBody));
      }

      throw error;
    }
  };

const getAccessTokenByRefreshToken =
  (getConfig: GetConnectorConfig): GetAccessTokenByRefreshToken =>
  async (refreshToken: string): Promise<TokenResponse> => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);
    const { clientId: client_id, clientSecret: client_secret, customConfig } = config;

    const httpResponse = await got.post(accessTokenEndpoint, {
      form: {
        client_id,
        client_secret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      timeout: { request: defaultTimeout },
    });

    const result = accessTokenResponseGuard.safeParse(parseJson(httpResponse.body));

    if (!result.success) {
      throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
    }

    return {
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
      expires_in: result.data.expires_in,
      scope: result.data.scope.join(','),
      token_type: result.data.token_type,
    };
  };

const authorizationCallbackHandler = async (data: unknown): Promise<AuthResponse> => {
  const result: SafeParseReturnType<any, AuthResponse> = authResponseGuard.safeParse(data);

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(data));
  }

  return result.data;
};

const createTwitchConnector: CreateConnector<SocialConnector> = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: twitchConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig),
    getTokenResponseAndUserInfo: getTokenResponseAndUserInfo(getConfig),
    getAccessTokenByRefreshToken: getAccessTokenByRefreshToken(getConfig),
  };
};

export default createTwitchConnector;
