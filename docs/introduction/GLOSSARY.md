---
id: glossary
title: Glossary
sidebar_position: 4
---

# Glossary

| Term                                                                                                               | Description                                                                                                                                                                                         |
|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Client [Bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)                                                  | Defines a sync endpoint in Katta Client at two levels: Katta servers and vaults.                                                                                                                    |
| Client [Protocol](https://docs.cyberduck.io/protocols/)                                                            | The two Katta modes are defined in two Cyberduck protocols.                                                                                                                                         |
| Client [Connection Profile](https://docs.cyberduck.io/protocols/profiles/)                                         | Used internally in Katta Client for the two modes and for storage profiles.                                                                                                                         |
| Katta Storage Profile                                                                                              | Uploaded by a Katta Server admin initially for each storage provider endpoint and mode.                                                                                                             |
| [Unified Vault Format (UVF)](https://github.com/encryption-alliance/unified-vault-format)                          | A common vendor-independent standard for encrypted directories on a per-file basis, based on the proven Cryptomator Vault Format.                                                                   |
| [`vault.uvf`](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md) | A [JWE](https://datatracker.ietf.org/doc/html/rfc7516) containing all the vault metadata required to create a vault bookmark in the client (reference to storage profile, static credentials etc.). |
| Vault template                                                                                                     | Initial encrypted vault content consisting of the `vault.uvf` file and the representation of the root folder.                                                                                       |

## Katta and Upstream Naming

Katta is built on Cryptomator Hub, Mountain Duck, and Cyberduck. Many identifiers — Keycloak realm and client names, configuration
keys, API paths — still carry the upstream names. The following table maps Katta terms to what you will encounter in
configuration files, tokens, and upstream documentation:

| Katta term            | Upstream / technical name                                                                                                | Notes                                                                                                                            |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| Katta Server          | Cryptomator Hub ("Hub")                                                                                                  | Configuration keys (`hub.*`), CLI options (`--hubUrl`), and API paths still use the Hub name.                                    |
| Katta Server Backend  | Hub backend                                                                                                              | Also referred to as "Katta API Server" in sequence diagrams.                                                                     |
| Katta Web Client      | Hub frontend                                                                                                             | Runs in the browser; served by Katta Server.                                                                                     |
| Katta Desktop Client  | [Mountain Duck](https://mountainduck.io/) + [Katta Client Library](https://github.com/shift7-ch/katta-clientlib)         | The client library is based on [Cyberduck](https://cyberduck.io/).                                                               |
| Keycloak realm        | `cryptomator`                                                                                                            | Default realm name, kept from upstream.                                                                                          |
| —                     | `cryptomator` (Keycloak client)                                                                                          | OIDC client used by Katta Desktop Client and the Admin CLI.                                                                      |
| —                     | `cryptomatorhub` (Keycloak client)                                                                                       | OIDC client used by Katta Web Client.                                                                                            |
| —                     | `cryptomatorvaults` (Keycloak client)                                                                                    | Katta-specific client holding per-vault client scopes and roles; target of the token exchange. See [Token Management](arch/TOKENS.md). |

The Keycloak realm roles `user`, `create-vault`, `admin`, and `syncer` are inherited from upstream as well — see
[Katta Roles](OVERVIEW.md#katta-roles).
