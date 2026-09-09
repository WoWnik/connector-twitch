# @wownik/connector-twitch

## 1.8.0 (Twitch Connector)

### Minor Changes

- Initial release of Twitch OAuth connector for Logto
- Supports user authentication via Twitch OAuth 2.0 / OpenID Connect
- Profile mapping from Twitch's nested response structure
- Token storage support for accessing Twitch APIs

**Configuration values for Twitch:**
- `authorizationEndpoint`: `https://id.twitch.tv/oauth2/authorize`
- `tokenEndpoint`: `https://id.twitch.tv/oauth2/token`  
- `userInfoEndpoint`: `https://id.twitch.tv/oauth2/userinfo` (OpenID Connect) OR empty (Helix API)
- Recommended scopes: `openid email profile offline_access channel:moderate chat:edit`

**Profile Mapping for Helix API:**
```json
{
  "id": "data.0.id",
  "name": "data.0.display_name",
  "email": "data.0.email",
  "avatar": "data.0.profile_image_url"
}
```

**Profile Mapping for OpenID Connect userinfo:**
```json
{
  "id": "sub",
  "name": "preferred_username",
  "email": "email",
  "avatar": "picture"
}
```

**Token Response:**
- Returns JSON format (not query string)
- Includes `id_token` when using OpenID Connect scopes
- Supports refresh tokens with `offline_access` scope
- Scopes returned as array: `scope: ["channel:moderate", "chat:edit", ...]`

**Token Response:**
- Returns JSON format (not query string)
- Includes `id_token` when using OpenID Connect scopes
- Supports refresh tokens with `offline_access` scope

### See Also

- [Twitch Developer Documentation](https://dev.twitch.tv/docs/authentication/getting-started)
- [Twitch Helix API](https://dev.twitch.tv/docs/api/reference/#get-users)
- [OpenID Connect Discovery Response](https://id.twitch.tv/oauth2/keys)
