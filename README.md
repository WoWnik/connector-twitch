# Twitch OAuth Connector

The un official Logto connector for Twitch via OAuth 2.0 protocol.

This connector enables Logto to authenticate users using their Twitch accounts, sync profile information (display name, avatar, etc.), and optionally store access tokens for API access.

## Table of contents

- [Get started](#get-started)
- [Create your Twitch OAuth app](#create-your-twitch-oauth-app)
- [Configure your connector](#configure-your-connector)
- [Config types](#config-types)
- [General settings](#general-settings)
- [Utilize the OAuth connector](#utilize-the-oauth-connector)
- [Manage user's social identity](#manage-users-social-identity)
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
| `userInfoEndpoint` | `https://id.twitch.tv/oauth2/userinfo` (OpenID Connect) <br> OR leave empty to use Helix API directly |
| `clientId` | Your Twitch Client ID |
| `clientSecret` | Your Twitch Client Secret |
| `scope` | `openid email profile offline_access channel:moderate chat:edit` (OpenID Connect) <br> OR `user:read:* twitch_channel:*` (Helix API scopes) |
| `tokenEndpointResponseType` | `json` (Twitch returns token response as JSON, not query string) |
| `profileMap` | See [Profile Mapping for Twitch](#profile-mapping-for-twitch-helix-api) or [OpenID Connect](#profile-mapping-for-twitch-openid-connect) section above |

### Important: Token Response Structure

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

**Recommendation**: Use OpenID Connect userinfo endpoint when available (simpler response). Helix API is better for accessing additional Twitch-specific data like broadcaster type, description, etc.

### Profile Mapping for Twitch

Twitch returns profile data with nested structure. When using the userinfo endpoint (`https://id.twitch.tv/oauth2/userinfo`), the response is typically flat, but when accessing via Helix API endpoints, it returns a `data` array.

**Using OpenID Connect userinfo endpoint:**
```json
{
  "sub": "unique-user-id",
  "preferred_username": "twitch_username",
  "email": "user@example.com",
  "picture": "https://static-cdn.jtvnw.net/user-avatar/128x128.png"
}
```

**Using Helix API (nested structure):**
```json
{
  "data": [
    {
      "id": "unique-user-id",
      "login": "twitch_username",
      "display_name": "Display Name",
      "type": "", 
      "broadcaster_type": "partner",
      "description": "..."
    }
  ]
}
```

Configure the `profileMap` accordingly:

```json
{
  "id": "sub",
  "name": "preferred_username",
  "email": "email",
  "avatar": "picture"
}
```

**Note**: The discovery response shows `preferred_username` as the field name (maps to display_name in Twitch UI).

## Config types

| Name                      | Type                   | Required |
|---------------------------|------------------------|----------|
| authorizationEndpoint     | string                 | true     |
| userInfoEndpoint          | string                 | true     |
| clientId                  | string                 | true     |
| clientSecret              | string                 | true     |
| tokenEndpointResponseType | enum                   | false    |
| responseType              | string                 | false    |
| grantType                 | string                 | false    |
| tokenEndpoint             | string                 | false    |
| scope                     | string                 | false    |
| customConfig              | Record<string, string> | false    |
| profileMap                | ProfileMap             | false    |

| ProfileMap fields | Type   | Required | Default value |
|-------------------|--------|----------|---------------|
| id                | string | false    | id            |
| name              | string | false    | name          |
| avatar            | string | false    | avatar        |
| email             | string | false    | email         |
| phone             | string | false    | phone         |

## General settings

Here are some general settings that won't block the connection to your identity provider but may affect the end-user authentication experience.

### Social button name and logo

For Twitch social button, use:
- **Name**: `Twitch`
- **Logo**: Official Twitch logo from [Twimg](https://uploads-ssl.webflow.com/524d8c475f0d7e9bc6a967b3/6250dae16651201494a6d0dd%2FTwitch_Logo_CMYK_Flatten.png)
  - Use this URL for both light and dark mode (or use a transparent PNG if available)

### Identity provider name

Use `twitch` as the identity provider name to differentiate Twitch user identities.

### Sync profile information

Twitch profile sync using OpenID Connect:
- **Avatar**: Use `picture` claim from the ID token or userinfo endpoint response
- **Display name**: Maps from `preferred_username` field in user info
- **Email**: Available via `email` claim when requested with appropriate scopes
- **Sub**: Unique identifier (`sub` claim in ID token) - maps to Logto's `id` field

**Using ID Token**: When using `openid` scope, you'll receive an ID token containing:
- `sub`: User's unique identifier
- `preferred_username`: Twitch username (display name)
- `email`: User email address (if available and consented)
- `picture`: Avatar URL
- Other standard OpenID Connect claims

### Store tokens to access third-party APIs (Optional)

If you want to access the Identity Provider's APIs and perform actions with user authorization (whether via social sign-in or account linking), Logto needs to get specific API scopes and store tokens.

1. Add the required scopes in the **scope** field following the instructions above
2. Enable **Store tokens for persistent API access** in the Logto OAuth connector. Logto will securely [store access tokens](https://docs.logto.io/secret-vault/federated-token-set) in the Secret Vault.
3. For Twitch, ensure the `offline_access` scope is included to obtain a refresh token and prevent repeated consent prompts.

## Twitch-specific setup

### Important Notes for Twitch Integration

1. **Nested Response Structure (Helix API)**: When using Helix API (`https://api.twitch.tv/helix/users`), responses come with a `data` array:
   ```json
   {
     "data": [
       {
         "id": "unique-id",
         "login": "username",
         "display_name": "Display Name",
         "profile_image_url": "https://..."
       }
     ]
   }
   ```
   **Profile Map for Helix API**:
   ```json
   {
     "id": "data.0.id",
     "name": "data.0.display_name",
     "email": "data.0.email",
     "avatar": "data.0.profile_image_url"
   }
   ```

2. **OpenID Connect Support**: Twitch also supports OpenID Connect via the `userinfo_endpoint` (`https://id.twitch.tv/oauth2/userinfo`). When using this endpoint:
   - Response is flat (not nested)
   - Fields: `sub`, `preferred_username`, `email`, `picture`
   - Email is included when requested
   - **Profile Map**:
     ```json
     {
       "id": "sub",
       "name": "preferred_username",
       "email": "email",
       "avatar": "picture"
     }
     ```

3. **Avatar Handling**: The `picture` claim in ID tokens or from userinfo endpoint provides the avatar URL.

4. **Token Storage**: For accessing Twitch APIs after authentication:
   - Enable token storage in Logto Console
   - Use `offline_access` scope to get refresh tokens
   - Retrieve tokens from Secret Vault for API calls

## Utilize the OAuth connector

Once you've created an OAuth connector and connected it to your identity provider, you can incorporate it into your end-user flows. Choose the options that match your needs:

### Enable social sign-in button

1. In Logto Console, go to [Sign-in experience > Sign-up and sign-in](https://cloud.logto.io/to/sign-in-experience/sign-up-and-sign-in).
2. Add the Twitch OAuth connector under **Social sign-in** section.
3. Configure with the values from [Create your Twitch OAuth app](#create-your-twitch-oauth-app).

Learn more about [social sign-in experience](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/social-sign-in).

**Note**: For account linking scenarios, use [Logto Account API](https://docs.logto.io/end-user-flows/account-settings/by-account-api#link-a-new-social-connection) to let users link their Twitch accounts.

### Access identity provider APIs and perform actions

Your application can retrieve stored access tokens from the Secret Vault to call your identity provider's APIs and automate backend tasks. The specific capabilities depend on your identity provider and the scopes you've requested.

For Twitch, with `openid` scope:
- You'll receive an ID token containing user claims (`sub`, `email`, `preferred_username`, etc.)
- Store tokens to access [Twitch API](https://dev.twitch.tv/docs/api/) for moderation, analytics, or other actions
- The ID token supports `RS256` signing algorithm (see [`jwks_uri`](#) for key verification)

## Manage user's social identity

After a user links their Twitch account, admins can manage that connection in the Logto Console:

1. Navigate to [Logto console > User management](https://cloud.logto.io/to/users) and open the user's profile.
2. Under **Social connections**, locate the Twitch item and click **Manage**.
3. On this page, admins can manage the user's Twitch connection, see all profile information granted and synced from their Twitch account, and check the [access token status](https://docs.logto.io/secret-vault/federated-token-set/token-status).

**Note**: The discovery response shows that Twitch supports `openid` scope for OpenID Connect flow. However, many third-party integrations prefer using the Helix API with `user:read:*` scopes instead.

## Reference

* [Twitch OAuth & OpenID Connect Documentation](https://dev.twitch.tv/docs/authentication/getting-started)
* [OpenID Connect Discovery Response (jwks_uri)](https://id.twitch.tv/oauth2/keys)
* [Twitch Helix API Reference](https://dev.twitch.tv/docs/api/reference/)
* [OAuth 2.0 Authorization Framework (RFC 6749)](https://www.rfc-editor.org/rfc/rfc6749)
* [OpenID Connect Core 1.0 (RFC 6742)](https://www.rfc-editor.org/rfc/rfc6742)

### RS256 ID Token Verification

The `id_token` provided by Twitch is signed using **RS256** algorithm.

To verify the ID token:
1. Fetch the JWKS (JSON Web Key Set) from [`jwks_uri`](#): `https://id.twitch.tv/oauth2/keys`
2. Use the public key to verify the JWT signature
3. Decode and validate the claims (`sub`, `preferred_username`, etc.)

This is supported by **jose v6** in the connector, which uses the Web Crypto API for signature verification.
