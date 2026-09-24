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
var scope = "identify email";
var defaultMetadata = {
  id: "twitch-universal",
  target: "twitch",
  platform: ConnectorPlatform.Universal,
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
      description: "The `scope` determines permissions granted by the user's authorization."
    }
  ]
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
  scope: z.string().optional()
});
var accessTokenResponseGuard = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  scope: z.array(z.string())
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
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scope2 ?? config.scope ?? scope,
    state
  });
  return `${authorizationEndpoint}?${queryParameters.toString()}`;
};
var getAccessToken = async (config, codeObject) => {
  const { code, redirectUri } = codeObject;
  const { clientId: client_id, clientSecret: client_secret } = config;
  const httpResponse = await got.post(accessTokenEndpoint, {
    form: {
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    },
    timeout: { request: defaultTimeout }
  });
  const result = accessTokenResponseGuard.safeParse(parseJson(httpResponse.body));
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.InvalidResponse, result.error);
  }
  const { access_token: accessToken } = result.data;
  assert(accessToken, new ConnectorError(ConnectorErrorCodes.SocialAuthCodeInvalid));
  return { accessToken };
};
var getUserInfo = (getConfig) => async (data) => {
  const { code, redirectUri } = await authorizationCallbackHandler(data);
  const config = await getConfig(defaultMetadata.id);
  validateConfig(config, twitchConfigGuard);
  const { accessToken } = await getAccessToken(config, { code, redirectUri });
  try {
    const httpResponse = await got.get(userInfoEndpoint, {
      headers: {
        authorization: `Bearer ${accessToken}`
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
    return { ...userInfoResult.data, rawData };
  } catch (error) {
    if (error instanceof HTTPError) {
      const { statusCode, body: rawBody } = error.response;
      if (statusCode === 401) {
        throw new ConnectorError(ConnectorErrorCodes.SocialAccessTokenInvalid);
      }
      throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(rawBody));
    }
    throw error;
  }
};
var authorizationCallbackHandler = async (parameterObject) => {
  const result = authResponseGuard.safeParse(parameterObject);
  if (!result.success) {
    throw new ConnectorError(ConnectorErrorCodes.General, JSON.stringify(parameterObject));
  }
  return result.data;
};
var createTwitchConnector = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: ConnectorType.Social,
    configGuard: twitchConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig)
  };
};
var index_default = createTwitchConnector;
export {
  index_default as default,
  getAccessToken
};
