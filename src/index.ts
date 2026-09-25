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
import type { TwitchConfig } from './types.js';
import {
  accessTokenResponseGuard,
  authResponseGuard,
  twitchConfigGuard,
  userInfoResponseGuard,
} from './types.js';

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
  codeObject: { code: string; redirectUri: string }
): Promise<TokenResponse> => {
  const { code, redirectUri } = codeObject;

  const { clientId: client_id, clientSecret: client_secret, customConfig } = config;

  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id,
      client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      ...customConfig,
    },
    timeout: { request: defaultTimeout },
  });

  const result = accessTokenResponseGuard.safeParse(parseJson(httpResponse.body));

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }

  if (!result.data.access_token){
    assert(result.data.access_token, new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid));
  }

  return {
    access_token: result.data.access_token,
    refresh_token: result.data.refresh_token,
    expires_in: result.data.expires_in,
    scope: result.data.scope.join(','),
    token_type: result.data.token_type,
  };
};

const getUserInfo =
  (getConfig: GetConnectorConfig): GetUserInfo =>
  async (data, getSession: GetSession): Promise<SocialUserInfo> => {
    const { userInfo } = await getTokenResponseAndUserInfo(getConfig)(data, getSession);
    return userInfo;
  };

const getTokenResponseAndUserInfo =
  (getConfig: GetConnectorConfig): GetTokenResponseAndUserInfo =>
  async (
    data,
    getSession: GetSession
  ): Promise<{
    tokenResponse?: TokenResponse;
    userInfo: SocialUserInfo;
  }> => {
    const { code, redirectUri } = await authorizationCallbackHandler(data);
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);
    const tokenResponse: TokenResponse = await getAccessToken(config, { code, redirectUri });

    try {
      const httpResponse = await got.get(userInfoEndpoint, {
        headers: {
          authorization: `Bearer ${tokenResponse.access_token}`,
          'Client-Id': config.clientId,
        },
        timeout: { request: defaultTimeout },
      });
      const rawData = parseJson(httpResponse.body);
      const result = userInfoResponseGuard.safeParse(rawData);

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
          console.log(
            `Unauthorized access token: ${tokenResponse.access_token}, clientId: ${config.clientId}`
          );
          throw new ConnectorError(ConnectorErrorCodes.SocialAccessTokenInvalid);
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

const authorizationCallbackHandler = async (parameterObject: unknown) => {
  const result = authResponseGuard.safeParse(parameterObject);

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(parameterObject));
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
