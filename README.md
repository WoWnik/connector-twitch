# @logto/connector-twitch

**Community-maintained**: A custom implementation of the Logto OAuth connector for Twitch authentication. Not an official Twitch product, but enables Logto to authenticate users via their Twitch accounts.

This connector enables Logto to authenticate users using their Twitch accounts, sync profile information (display name, avatar, email), and optionally store access tokens for API access through Logto [Secret Vault](https://docs.logto.io/secret-vault).

## Important Note

- This is **NOT** an official Twitch connector
- It's a custom implementation based on the [Logto OAuth connector framework](https://github.com/logto-io/connectors)
- For official support, please contact [Logto Support](https://logto.io/contact)
- Refer to [Twitch Developer Documentation](https://dev.twitch.tv/docs/authentication/getting-started) for Twitch-specific requirements

## Important Note

- This is **NOT** an official Twitch connector
- It's a custom implementation based on the [Logto OAuth connector framework](https://github.com/logto-io/connectors)
- For official support, please contact [Logto Support](https://logto.io/contact)
- Refer to [Twitch Developer Documentation](https://dev.twitch.tv/docs/authentication/getting-started) for Twitch-specific requirements

This connector enables Logto to authenticate users using their Twitch accounts, sync profile information (display name, avatar, email), and optionally store access tokens for API access through Logto [Secret Vault](https://docs.logto.io/secret-vault).

## Table of contents

- [Get started](#get-started)
- [Create your Twitch OAuth app](#create-your-twitch-oauth-app)
- [Configure your connector](#configure-your-connector)
- [Config types](#config-types)
- [General settings](#general-settings)
- [Utilize the OAuth connector](#utilize-the-oauth-connector)
- [Twitch-specific setup](#twitch-specific-setup)

## Get started

The Twitch OAuth connector enables Logto's connection to Twitch, a popular live streaming platform and gaming community. Use the Twitch OAuth connector to let your application:

- Add Twitch sign-in buttons
- Link user accounts to Twitch identities  
- Sync user profile info from Twitch (display name, avatar URL)
- Access Twitch APIs through secure token storage in Logto [Secret Vault](https://docs.logto.io/secret-vault) for automation tasks

## Create your Twitch OAuth app

First, register your application with Twitch:

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Click **Register your application**
3. Fill in the required fields:
   - **Application Name**: Your app name
   - **Application URL**: Your domain (e.g., `https://yourdomain.com`)
   - **Website**: Optional, for support contact
4. Under **OAuth Options**, configure:
   - Add redirect URIs (if needed): `https://yourdomain.com/auth/callback`
5. Click **Save Changes**
6. Copy the generated **Client ID** and **Client Secret**

### OAuth Discovery Response

Twitch supports OpenID Connect with the following discovery response:

```json
{
  "authorization_endpoint": "https://id.twitch.tv/oauth2/authorize",
  "claims_supported": ["aud", "azp", "email", "email_verified", "exp", "iat", "iss", "picture", "preferred_username", "sub", "updated_at"],
  "issuer": "https://id.twitch.tv/oauth2",
  "jwks_uri": "https://id.twitch.tv/oauth2/keys",
  "response_types_supported": ["id_token", "code", "token", "code id_token", "token id_token"],
  "scopes_supported": ["openid"],
  "subject_types_supported": ["public"],
  "token_endpoint": "https://id.twitch.tv/oauth2/token",
  "userinfo_endpoint": "https://id.twitch.tv/oauth2/userinfo"
}
```

## Configure your connector

To configure the Twitch connector in Logto Console, use the values from the discovery response above:

| Parameter | Value |
|-----------|-------|
| `authorizationEndpoint` | `https://id.twitch.tv/oauth2/authorize` |
| `tokenEndpoint` | `https://id.twitch.tv/oauth2/token` |
| `userInfoEndpoint` | `https://id.twitch.tv/oauth2/userinfo` (OpenID Connect) OR empty for Helix API |
| `clientId` | Your Twitch Client ID |
| `clientSecret` | Your Twitch Client Secret |
| `scope` | `openid email profile offline_access channel:moderate chat:edit` (OpenID Connect) OR `user:read:* twitch_channel:*` (Helix API scopes) |
| `tokenEndpointResponseType` | `json` (Twitch returns token response as JSON, not query string) |

### Token Response Structure

Twitch returns the following structure when exchanging authorization code:

```json
{
  "access_token": "your_access_token",
  "expires_in": 14124,
  "id_token": "eyJhbGciOiJSUzI1...",
  "refresh_token": "5b93chm63hdve3mycz05zfzatkfdenfspp1h1ar2xxdalen01",
  "scope": [
    "channel:moderate",
    "chat:edit",
    "chat:read"
  ],
  "token_type": "bearer"
}
```

**Key points:**
- Token response is returned as **JSON**, not query string
- `id_token` is provided along with access token when using OpenID Connect scopes
- Use `offline_access` scope to obtain refresh tokens
- Multiple scopes can be requested as an array

### Profile Mapping for Twitch (Helix API)

When using Twitch Helix API (`https://api.twitch.tv/helix/users`), responses come with a nested `data[]` structure:

```json
{
  "data": [
    {
      "id": "unique-user-id",
      "login": "twitch_username",
      "display_name": "Display Name",
      "type": "",
      "broadcaster_type": "partner",
      "description": "...",
      "profile_image_url": "https://static-cdn.jtvnw.net/user-default-pictures/..."
    }
  ]
}
```

Configure the `profileMap` for Helix API:

```json
{
  "id": "data.0.id",
  "name": "data.0.display_name",
  "email": "data.0.email",
  "avatar": "data.0.profile_image_url"
}
```

**Note**: The first element (`data.0`) contains the authenticated user's information.

### Profile Mapping for Twitch (OpenID Connect Userinfo)

When using OpenID Connect userinfo endpoint (`https://id.twitch.tv/oauth2/userinfo`), the response is flat:

```json
{
  "sub": "unique-user-id",
  "preferred_username": "twitch_username",
  "email": "user@example.com",
  "picture": "https://static-cdn.jtvnw.net/ttv-pub-images/avatar1..."
}
```

Configure the `profileMap` for OpenID Connect userinfo:

```json
{
  "id": "sub",
  "name": "preferred_username",
  "email": "email",
  "avatar": "picture"
}
```

## Config types

| Name | Type | Required | Default |
|------|------|----------|---------|
| authorizationEndpoint | string | true | - |
| userInfoEndpoint | string | false (for OpenID Connect) OR leave empty for Helix API | `https://id.twitch.tv/oauth2/userinfo` |
| clientId | string | true | - |
| clientSecret | string | true | - |
| tokenEndpointResponseType | enum | false | `json` |
| scope | string | false | `openid email profile offline_access` |

## General settings

### Social button name and logo

For Twitch social button, use:
- **Name**: `Twitch`
- **Logo**: Official Twitch logo from [Twimg](https://uploads-ssl.webflow.com/524d8c475f0d7e9bc6a967b3/6250dae16651201494a6d0dd%2FTwitch_Logo_CMYK_Flatten.png)

### Identity provider name

Use `twitch` as the identity provider name to differentiate Twitch user identities.

### Sync profile information

Twitch profile sync considerations:
- **Avatar**: Use `picture` claim from the ID token or userinfo endpoint response
- **Display name**: Maps from `preferred_username` field in user info
- **Email**: Available via `email` claim when requested with appropriate scopes
- **Sub**: Unique identifier (`sub` claim in ID token) - maps to Logto's `id` field

### Store tokens to access third-party APIs (Optional)

If you want to access the Identity Provider's APIs and perform actions with user authorization:

1. Add the required scopes in the **scope** field following the instructions above
2. Enable **Store tokens for persistent API access** in the Logto OAuth connector. Logto will securely [store access tokens](https://docs.logto.io/secret-vault/federated-token-set) in the Secret Vault.
3. For Twitch, ensure the `offline_access` scope is included to obtain a refresh token and prevent repeated consent prompts.

## Utilize the OAuth connector

Once you've created an OAuth connector and connected it to your identity provider, you can incorporate it into your end-user flows. Choose the options that match your needs:

### Enable social sign-in button

1. In Logto Console, go to [Sign-in experience > Sign-up and sign-in](https://cloud.logto.io/to/sign-in-experience/sign-up-and-sign-in).
2. Add the Twitch OAuth connector under **Social sign-in** section.
3. Configure with the values from [Create your Twitch OAuth app](#create-your-twitch-oauth-app).

Learn more about [social sign-in experience](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/social-sign-in).

### Access identity provider APIs and perform actions

Your application can retrieve stored access tokens from the Secret Vault to call your identity provider's APIs and automate backend tasks. The specific capabilities depend on your identity provider and the scopes you've requested.

For Twitch, with `openid` scope:
- You'll receive an ID token containing user claims (`sub`, `email`, `preferred_username`, etc.)
- Store tokens to access [Twitch API](https://dev.twitch.tv/docs/api/) for moderation, analytics, or other actions
- The ID token supports `RS256` signing algorithm (see [`jwks_uri`](#) for key verification)

## Twitch-specific setup

### Important Notes for Twitch Integration

1. **Nested Response Structure (Helix API)**: When using Helix API (`https://api.twitch.tv/helix/users`), responses come with a `data` array. Use profile mapping with `data.0.*` paths.

2. **OpenID Connect Support**: Twitch also supports OpenID Connect via the `userinfo_endpoint`. When using this endpoint, response is flat with `sub`, `preferred_username`, `email`, `picture` fields.

3. **RS256 ID Token Verification**: The `id_token` provided by Twitch is signed using RS256 algorithm. Fetch JWKS from `https://id.twitch.tv/oauth2/keys` for verification (supported by jose v6).

4. **Token Storage**: For accessing Twitch APIs after authentication:
   - Enable token storage in Logto Console
   - Use `offline_access` scope to get refresh tokens
   - Retrieve tokens from Secret Vault for API calls

## Reference

* [Twitch OAuth & OpenID Connect Documentation](https://dev.twitch.tv/docs/authentication/getting-started)
* [OpenID Connect Discovery Response (jwks_uri)](https://id.twitch.tv/oauth2/keys)
* [Twitch Helix API Reference](https://dev.twitch.tv/docs/api/reference/)
* [OAuth 2.0 Authorization Framework (RFC 6749)](https://www.rfc-editor.org/rfc/rfc6749)
* [OpenID Connect Core 1.0 (RFC 6742)](https://www.rfc-editor.org/rfc/rfc6742)
