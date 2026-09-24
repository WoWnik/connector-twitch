import { assert } from '@silverhand/essentials';
import { got, HTTPError } from 'got';

import type {
  CreateConnector,
  GetAuthorizationUri,
  GetConnectorConfig,
  GetUserInfo,
  SocialConnector,
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
  async ({ state, redirectUri, scope }) => {
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);

    const queryParameters = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope ?? config.scope ?? defaultScope,
      state,
    });

    return `${authorizationEndpoint}?${queryParameters.toString()}`;
  };

export const getAccessToken = async (
  config: TwitchConfig,
  codeObject: { code: string; redirectUri: string }
) => {
  const { code, redirectUri } = codeObject;

  const { clientId: client_id, clientSecret: client_secret } = config;

  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id,
      client_secret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    },
    timeout: { request: defaultTimeout },
  });

  const result = accessTokenResponseGuard.safeParse(parseJson(httpResponse.body));

  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }

  const { access_token: accessToken } = result.data;

  assert(accessToken, new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid));

  return { accessToken };
};

const getUserInfo =
  (getConfig: GetConnectorConfig): GetUserInfo =>
  async (data) => {
    const { code, redirectUri } = await authorizationCallbackHandler(data);
    const config = await getConfig(defaultMetadata.id);
    validateConfig(config, twitchConfigGuard);
    const { accessToken } = await getAccessToken(config, { code, redirectUri });

    try {
      const httpResponse = await got.get(userInfoEndpoint, {
        headers: {
          authorization: `Bearer ${accessToken}`,
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

      return { ...userInfoResult.data, rawData };
    } catch (error: unknown) {
      if (error instanceof HTTPError) {
        // @ts-ignore
        const { statusCode, body: rawBody } = error.response;

        if (statusCode === 401) {
          throw new ConnectorError(ConnectorErrorCodes.SocialAccessTokenInvalid);
        }

        throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(rawBody));
      }

      throw error;
    }
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
  };
};

export default createTwitchConnector;
