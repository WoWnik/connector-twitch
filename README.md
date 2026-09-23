# @logto/connector-twitch

**Community-maintained**: A custom implementation of the Logto OAuth connector for Twitch authentication. Not an official Twitch product, but enables Logto to authenticate users via their Twitch accounts.

This connector enables Logto to authenticate users using their Twitch accounts, sync profile information (display name, avatar, email), and optionally store access tokens for API access through Logto [Secret Vault](https://docs.logto.io/secret-vault).

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

## Install your own connectors

1. Copy the connector folder you implemented to directory `/packages/connectors` of `logto-io/logto`.
2. Install connector repository's dependencies by typing `pnpm pnpm:devPreinstall && pnpm i` at root path of logto folder.
3. Build connector with `pnpm connectors build`.
4. Link local connectors using `pnpm cli connector link`.
5. Restart Logto instance with `pnpm dev` at root directory of `logto-io/logto`, and you can find connectors successfully installed.

## Reference

* [Twitch OAuth & OpenID Connect Documentation](https://dev.twitch.tv/docs/authentication/getting-started)
* [OpenID Connect Discovery Response (jwks_uri)](https://id.twitch.tv/oauth2/keys)
* [Twitch Helix API Reference](https://dev.twitch.tv/docs/api/reference/)
* [OAuth 2.0 Authorization Framework (RFC 6749)](https://www.rfc-editor.org/rfc/rfc6749)
* [OpenID Connect Core 1.0 (RFC 6742)](https://www.rfc-editor.org/rfc/rfc6742)
