---
id: glossary
title: Glossary
sidebar_position: 4
---

# Glossary

| Term                                                                                      | Description                                                                                                                                                                                             |
|-------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Katta Storage Profile                                                                     | Uploaded by a Katta Server admin initially for each storage provider endpoint and mode.                                                                                                                 |
| [Unified Vault Format (UVF)](https://github.com/encryption-alliance/unified-vault-format) | A common vendor-independent standard for encrypted directories on a per-file basis, based on the proven Cryptomator Vault Format.                                                                       |
| Vault Metadata                                                                            | A [JWE](https://datatracker.ietf.org/doc/html/rfc7516) containing all the vault metadata[^1] required to create a vault bookmark in the client (reference to storage profile, static credentials etc.). |
| Vault Template                                                                            | Initial encrypted vault content consisting of the vault metadata `vault.uvf` file and the representation of the root folder.                                                                            |
| OIDC Token                                                                                | Token retrieved after authenticating with Katta Server                                                                                                                                                  |
| Security Token Service (STS)                                                              | AWS Security Token Service or MinIO Security Token Service to obtain temporary storage credentials from OIDC Tokens                                                                                     |
| S3 Storage Access Tokens                                                                  | S3 `AccessKeyId` and `SecretAccessKey` to authenticate with S3 storage                                                                                                                                  |
| S3 Static Access Tokens                                                                   | S3 `AccessKeyId` and `SecretAccessKey` obtained as static tokens from vault metadata                                                                                                                    |
| S3 Temporary Access Tokens                                                                | Temporary `AccessKeyId`, `SecretAccessKey`, and `SessionToken` obtained from the Security Token Service (STS)                                                                                           |
| Static Storage Access Mode                                                                | Access S3 storage using S3 Static Access Tokens                                                                                                                                                         |
| STS Storage Access Mode                                                                   | Access S3 storage using S3 Temporary Access Tokens                                                                                                                                                      |

[^1]: [Vault Metadata Specification](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md)

## Katta and Upstream Naming

Katta is built on Cryptomator Hub, Mountain Duck, and Cyberduck. Many identifiers — Keycloak realm and client names, configuration
keys, API paths — still carry the upstream names. The following table maps Katta terms to what you will encounter in
configuration files, tokens, and upstream documentation:

| Katta term           | Upstream / technical name                                                                                        | Notes                                                                                                                                  |
|----------------------|------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Katta Server         | Cryptomator Hub ("Hub")                                                                                          | Configuration keys (`hub.*`), CLI options (`--hubUrl`), and API paths still use the Hub name.                                          |
| Katta Server Backend | Hub backend                                                                                                      | Also referred to as "Katta API Server" in sequence diagrams.                                                                           |
| Katta Web            | Hub frontend                                                                                                     | Runs in the browser; served by Katta Server.                                                                                           |
| Katta Desktop        | [Mountain Duck](https://mountainduck.io/) + [Katta Client Library](https://github.com/shift7-ch/katta-clientlib) | Desktop Sync Client available for Windows & macOS. The client library is based on [Cyberduck](https://cyberduck.io/).                  |
| Keycloak realm       | `cryptomator`                                                                                                    | Default realm name, kept from upstream.                                                                                                |
| —                    | `cryptomator` (Keycloak client)                                                                                  | OIDC client used by Katta Desktop and the Admin CLI.                                                                                   |
| —                    | `cryptomatorhub` (Keycloak client)                                                                               | OIDC client used by Katta Web.                                                                                                         |
| —                    | `cryptomatorvaults` (Keycloak client)                                                                            | Katta-specific client holding per-vault client scopes and roles; target of the token exchange. See [Token Management](arch/TOKENS.md). |

The Keycloak realm roles `user`, `create-vault`, `admin`, and `syncer` are inherited from upstream as well — see
[Katta Roles](OVERVIEW.md#katta-roles).
