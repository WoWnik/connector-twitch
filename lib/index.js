// src/index.ts
import { assert } from "@silverhand/essentials";
import { got, HTTPError } from "got";
import {
  ConnectorError,
  ConnectorErrorCodes,
  ConnectorType,
  parseJson,
  socialUserInfoGuard,
  validateConfig
} from "@logto/connector-kit";

// src/constant.ts
import { ConnectorConfigFormItemType, ConnectorPlatform } from "@logto/connector-kit";
var authorizationEndpoint = "https://id.twitch.tv/oauth2/authorize";
var accessTokenEndpoint = "https://id.twitch.tv/oauth2/token";
var userInfoEndpoint = "https://api.twitch.tv/helix/users";
var scope = "user:read:email user:read:chat user:bot channel:bot";
var defaultMetadata = {
  id: "twitch-web",
  target: "twitch",
  platform: ConnectorPlatform.Web,
  name: {
    en: "Twitch"
  },
  logo: "./logo.svg",
  logoDark: null,
  description: {
    en: "Twitch is an interactive livestreaming service for content spanning gaming, entertainment, sports, music, and more.",
    ru: "Twitch \u2014 \u044D\u0442\u043E \u0438\u043D\u0442\u0435\u0440\u0430\u043A\u0442\u0438\u0432\u043D\u044B\u0439 \u0441\u0435\u0440\u0432\u0438\u0441 \u043F\u0440\u044F\u043C\u044B\u0445 \u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0438\u0439, \u043E\u0445\u0432\u0430\u0442\u044B\u0432\u0430\u044E\u0449\u0438\u0439 \u0442\u0430\u043A\u0438\u0435 \u0441\u0444\u0435\u0440\u044B, \u043A\u0430\u043A \u0438\u0433\u0440\u044B, \u0440\u0430\u0437\u0432\u043B\u0435\u0447\u0435\u043D\u0438\u044F, \u0441\u043F\u043E\u0440\u0442, \u043C\u0443\u0437\u044B\u043A\u0430 \u0438 \u043C\u043D\u043E\u0433\u043E\u0435 \u0434\u0440\u0443\u0433\u043E\u0435."
  },
  readme: "./README.md",
  formItems: [
    {
      key: "clientId",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client ID",
      placeholder: "<client-id>"
    },
    {
      key: "clientSecret",
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client Secret",
      placeholder: "<client-secret>"
    },
    {
      key: "scope",
      type: ConnectorConfigFormItemType.MultilineText,
      required: false,
      label: "Scope",
      placeholder: "Enter the scopes (separated by a space)",
      description: "The `scope` determines permissions granted by the user's authorization.",
      defaultValue: scope
    },
    {
      key: "customConfig",
      type: ConnectorConfigFormItemType.Json,
      required: false,
      label: "Custom Config",
      defaultValue: {
        force_verify: true
      }
    }
  ],
  isTokenStorageSupported: true
};
var defaultTimeout = 5e3;

// src/types.ts
import { z } from "zod";
var nullishToUndefined = (input) => {
  if (!input) {
    return;
  }
  return input;
};
var twitchConfigGuard = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  scope: z.string().optional(),
  customConfig: z.record(z.string()).optional()
});
var accessTokenResponseGuard = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.array(z.string()),
  token_type: z.string()
});
var userInfoResponseGuard = z.object({
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
    created_at: z.string().nullish().transform(nullishToUndefined)
  }))
});
var authorizationCallbackErrorGuard = z.object({
  error: z.string(),
  error_description: z.string()
});
var authResponseGuard = z.object({ code: z.string(), redirectUri: z.string() });

// src/index.ts
var getAuthorizationUri = (getConfig) => async ({ state, redirectUri, scope: scope2 }) => {
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, twitchConfigGuard);
  const queryParameters = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: scope2 ?? config.scope ?? scope,
    state
  });
  return `${authorizationEndpoint}?${queryParameters.toString()}`;
};
var getAccessToken = async (config, codeObject) => {
  const { code, redirectUri } = codeObject;
  const { clientId, clientSecret, customConfig } = config;
  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      ...customConfig
    },
    timeout: { request: defaultTimeout }
  });
  const result = accessTokenResponseGuard.safeParse(
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
    scope: result.data.scope.join(" "),
    token_type: result.data.token_type
  };
};
var getUserInfo = (getConfig) => async (data, getSession) => {
  const { userInfo } = await getTokenResponseAndUserInfo(getConfig)(data, getSession);
  return userInfo;
};
var getTokenResponseAndUserInfo = (getConfig) => async (data, getSession) => {
  const authResponse = await authorizationCallbackHandler(data);
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, twitchConfigGuard);
  const tokenResponse = await getAccessToken(config, authResponse);
  try {
    const httpResponse = await got.get(userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
        "Client-Id": config.clientId
      },
      timeout: { request: defaultTimeout }
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
      email
    };
    const userInfoResult = socialUserInfoGuard.safeParse(rawUserInfo);
    if (!userInfoResult.success) {
      throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, userInfoResult.error);
    }
    const userInfo = { ...userInfoResult.data, rawData };
    return {
      tokenResponse,
      userInfo
    };
  } catch (error) {
    if (error instanceof HTTPError) {
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
var getAccessTokenByRefreshToken = (getConfig) => async (refreshToken) => {
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, twitchConfigGuard);
  const { clientId: client_id, clientSecret: client_secret, customConfig } = config;
  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id,
      client_secret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    },
    timeout: { request: defaultTimeout }
  });
  const result = accessTokenResponseGuard.safeParse(parseJson(httpResponse.body));
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }
  return {
    access_token: result.data.access_token,
    refresh_token: result.data.refresh_token,
    expires_in: result.data.expires_in,
    scope: result.data.scope.join(","),
    token_type: result.data.token_type
  };
};
var authorizationCallbackHandler = async (data) => {
  const result = authResponseGuard.safeParse(data);
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(data));
  }
  return result.data;
};
var createTwitchConnector = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: twitchConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig),
    getTokenResponseAndUserInfo: getTokenResponseAndUserInfo(getConfig),
    getAccessTokenByRefreshToken: getAccessTokenByRefreshToken(getConfig)
  };
};
var index_default = createTwitchConnector;
export {
  index_default as default,
  getAccessToken
};
