var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  getAccessToken: () => getAccessToken
});
module.exports = __toCommonJS(index_exports);
var import_essentials = require("@silverhand/essentials");
var import_got = require("got");
var import_connector_kit2 = require("@logto/connector-kit");

// src/constant.ts
var import_connector_kit = require("@logto/connector-kit");
var authorizationEndpoint = "https://id.twitch.tv/oauth2/authorize";
var accessTokenEndpoint = "https://id.twitch.tv/oauth2/token";
var userInfoEndpoint = "https://api.twitch.tv/helix/users";
var scope = "identify email";
var defaultMetadata = {
  id: "twitch-universal",
  target: "twitch",
  platform: import_connector_kit.ConnectorPlatform.Universal,
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
      type: import_connector_kit.ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client ID",
      placeholder: "<client-id>"
    },
    {
      key: "clientSecret",
      type: import_connector_kit.ConnectorConfigFormItemType.Text,
      required: true,
      label: "Client Secret",
      placeholder: "<client-secret>"
    },
    {
      key: "scope",
      type: import_connector_kit.ConnectorConfigFormItemType.MultilineText,
      required: false,
      label: "Scope",
      placeholder: "Enter the scopes (separated by a space)",
      description: "The `scope` determines permissions granted by the user's authorization."
    }
  ]
};
var defaultTimeout = 5e3;

// src/types.ts
var import_zod = require("zod");
var nullishToUndefined = (input) => {
  if (!input) {
    return;
  }
  return input;
};
var twitchConfigGuard = import_zod.z.object({
  clientId: import_zod.z.string(),
  clientSecret: import_zod.z.string(),
  scope: import_zod.z.string().optional()
});
var accessTokenResponseGuard = import_zod.z.object({
  access_token: import_zod.z.string(),
  token_type: import_zod.z.string(),
  expires_in: import_zod.z.number(),
  scope: import_zod.z.string()
});
var userInfoResponseGuard = import_zod.z.object({
  data: import_zod.z.array({
    id: import_zod.z.string(),
    login: import_zod.z.string().nullish().transform(nullishToUndefined),
    display_name: import_zod.z.string().nullish().transform(nullishToUndefined),
    type: import_zod.z.string().nullish().transform(nullishToUndefined),
    broadcaster_type: import_zod.z.string().nullish().transform(nullishToUndefined),
    // @ts-ignore
    description: import_zod.z.string().nullish().transform(nullishToUndefined),
    profile_image_url: import_zod.z.string().nullish().transform(nullishToUndefined),
    offline_image_url: import_zod.z.string().nullish().transform(nullishToUndefined),
    view_count: import_zod.z.number().nullish().transform(nullishToUndefined),
    email: import_zod.z.string().nullish().transform(nullishToUndefined),
    created_at: import_zod.z.string().nullish().transform(nullishToUndefined)
  })
});
var authorizationCallbackErrorGuard = import_zod.z.object({
  error: import_zod.z.string(),
  error_description: import_zod.z.string()
});
var authResponseGuard = import_zod.z.object({ code: import_zod.z.string(), redirectUri: import_zod.z.string() });

// src/index.ts
var getAuthorizationUri = (getConfig) => async ({ state, redirectUri, scope: scope2 }) => {
  const config = await getConfig(defaultMetadata.id);
  (0, import_connector_kit2.validateConfig)(config, twitchConfigGuard);
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
  const httpResponse = await import_got.got.post(accessTokenEndpoint, {
    form: {
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    },
    timeout: { request: defaultTimeout }
  });
  const result = accessTokenResponseGuard.safeParse((0, import_connector_kit2.parseJson)(httpResponse.body));
  if (!result.success) {
    throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.InvalidResponse, result.error);
  }
  const { access_token: accessToken } = result.data;
  (0, import_essentials.assert)(accessToken, new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.SocialAuthCodeInvalid));
  return { accessToken };
};
var getUserInfo = (getConfig) => async (data) => {
  const { code, redirectUri } = await authorizationCallbackHandler(data);
  const config = await getConfig(defaultMetadata.id);
  (0, import_connector_kit2.validateConfig)(config, twitchConfigGuard);
  const { accessToken } = await getAccessToken(config, { code, redirectUri });
  try {
    const httpResponse = await import_got.got.get(userInfoEndpoint, {
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      timeout: { request: defaultTimeout }
    });
    const rawData = (0, import_connector_kit2.parseJson)(httpResponse.body);
    const result = userInfoResponseGuard.safeParse(rawData);
    if (!result.success) {
      throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.InvalidResponse, result.error);
    }
    const { id, login: name, profile_image_url: avatar, email } = result.data.data[0];
    const rawUserInfo = {
      id,
      name,
      avatar,
      email
    };
    const userInfoResult = import_connector_kit2.socialUserInfoGuard.safeParse(rawUserInfo);
    if (!userInfoResult.success) {
      throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.InvalidResponse, userInfoResult.error);
    }
    return { ...userInfoResult.data, rawData };
  } catch (error) {
    if (error instanceof import_got.HTTPError) {
      const { statusCode, body: rawBody } = error.response;
      if (statusCode === 401) {
        throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.SocialAccessTokenInvalid);
      }
      throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.General, JSON.stringify(rawBody));
    }
    throw error;
  }
};
var authorizationCallbackHandler = async (parameterObject) => {
  const result = authResponseGuard.safeParse(parameterObject);
  if (!result.success) {
    throw new import_connector_kit2.ConnectorError(import_connector_kit2.ConnectorErrorCodes.General, JSON.stringify(parameterObject));
  }
  return result.data;
};
var createTwitchConnector = async ({ getConfig }) => {
  return {
    metadata: defaultMetadata,
    type: import_connector_kit2.ConnectorType.Social,
    configGuard: twitchConfigGuard,
    getAuthorizationUri: getAuthorizationUri(getConfig),
    getUserInfo: getUserInfo(getConfig)
  };
};
var index_default = createTwitchConnector;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAccessToken
});
