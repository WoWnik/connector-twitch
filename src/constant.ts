import type { ConnectorMetadata } from '@logto/connector-kit';
import { ConnectorConfigFormItemType, ConnectorPlatform } from '@logto/connector-kit';

/**
 * Base authorization URL.
 * https://dev.twitch.tv/docs/authentication
 */
export const authorizationEndpoint = 'https://id.twitch.tv/oauth2/authorize';
export const accessTokenEndpoint = 'https://id.twitch.tv/oauth2/token';
export const userInfoEndpoint = 'https://api.twitch.tv/helix/users';

/**
 * OAuth2 Scopes
 * https://dev.twitch.tv/docs/authentication/scopes/
 */
export const scope = 'openid user:read:email';

export const defaultMetadata: ConnectorMetadata = {
  id: 'twitch-universal',
  target: 'twitch',
  platform: ConnectorPlatform.Universal,
  name: {
    en: 'Twitch',
  },
  logo: './logo.svg',
  logoDark: null,
  description: {
    en: 'Twitch is an interactive livestreaming service for content spanning gaming, entertainment, sports, music, and more.',
    ru: 'Twitch — это интерактивный сервис прямых трансляций, охватывающий такие сферы, как игры, развлечения, спорт, музыка и многое другое.',
  },
  readme: './README.md',
  formItems: [
    {
      key: 'clientId',
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: 'Client ID',
      placeholder: '<client-id>',
    },
    {
      key: 'clientSecret',
      type: ConnectorConfigFormItemType.Text,
      required: true,
      label: 'Client Secret',
      placeholder: '<client-secret>',
    },
    {
      key: 'scope',
      type: ConnectorConfigFormItemType.MultilineText,
      required: false,
      label: 'Scope',
      placeholder: 'Enter the scopes (separated by a space)',
      description: "The `scope` determines permissions granted by the user's authorization.",
    },
    {
      key: 'customConfig',
      type: ConnectorConfigFormItemType.Json,
      required: false,
      label: 'Custom Config',
      defaultValue: {
        force_verify: true,
      },
    },
  ],
  isTokenStorageSupported: true,
};

export const defaultTimeout = 5000;
