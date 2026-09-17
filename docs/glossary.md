---
title: Glossary
sidebar_position: 7
description: Katta terms, and how they map to their Cryptomator Hub and Mountain Duck counterparts.
---

# Glossary

## Components

| Product         | Description                                                                                                                                                          |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Katta Server    | Katta API Server Backend based on Cryptomator Hub                                                                                                                    |
| Katta Web       | Web application served by Katta Server to configure users, storage profiles and vaults                                                                               |
| Katta Desktop   | Desktop Sync Client available for Windows & macOS. The client [library](https://github.com/shift7-ch/katta-clientlib) is based on [Cyberduck](https://cyberduck.io/) |
| Katta Admin CLI | CLI program to configure a Katta Server including its S3 storage backend                                                                                             |

## Terms

| Term                         | Description                                                                                                                                                                                                                        |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Katta Storage Profile        | Uploaded by a Katta Server admin initially for each storage provider endpoint and mode                                                                                                                                             |
| Unified Vault Format (UVF)   | A common vendor-independent [standard](https://github.com/encryption-alliance/unified-vault-format) for encrypted directories on a per-file basis, based on the proven Cryptomator Vault Format.                                   |
| Vault Metadata               | A [JWE](https://datatracker.ietf.org/doc/html/rfc7516) containing all the vault metadata[^1] required to create a vault bookmark in the client (reference to storage profile, static credentials etc.)                             |
| Vault Template               | Initial encrypted vault content consisting of the vault metadata `vault.uvf` file and the representation of the root folder                                                                                                        |
| OIDC Token                   | Token retrieved after authenticating with _Katta Server_                                                                                                                                                                           |
| Security Token Service (STS) | AWS Security Token Service or MinIO Security Token Service to obtain temporary storage access credentials from _OIDC Token_                                                                                                        |
| Static Credentials           | Access S3 storage using static S3 credentials obtained from vault metadata (`AccessKeyId` and `SecretAccessKey`). Defined in the _Katta Storage Profile_                                                                           |
| Scoped Credentials           | Access S3 storage by exchanging OIDC token for temporary credentials from Security Token Service (STS) scoped to a single S3 bucket (`AccessKeyId`, `SecretAccessKey`, and `SessionToken`). Defined in the _Katta Storage Profile_ |

[^1]: [Vault Metadata Specification](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md)


## Keycloak Realms

Katta Server is built on Cryptomator Hub and retains its Keycloak realm and client names.

| Client                                    | Description                                                                                                                                 |
|-------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `cryptomator` (Keycloak client)           | OIDC client used by Katta Desktop and the Admin CLI. Inherited from upstream                                                                |
| `cryptomatorhub` (Keycloak client)        | OIDC client used by Katta Web. Inherited from upstream                                                                                      |
| `cryptomatorvaults` (Keycloak client)     | Katta-specific client holding per-vault client scopes and roles; target of the token exchange. See [Tokens](architecture/tokens.md)         |
| `cryptomatorhub-system` (Keycloak client) | Service account the Katta Server Backend uses to synchronize vault membership to Keycloak. Inherited from upstream                          |
| `cryptomatorhub-cli` (Keycloak client)    | Service account whose user is listed like a regular Katta user, so the Cryptomator CLI can be granted vault access. Inherited from upstream |

Katta uses the [Keycloak](architecture/keycloak.md) realm roles `user`, `create-vaults` and `admin`, inherited from Cryptomator Hub. 

| Role            | Description                                                                                                                                                                     |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `user`          | Katta User: The [`user`](https://docs.cryptomator.org/hub/user-group-management/#roles) role allows to login to Katta Web                                                       |
| `create-vaults` | Katta Vault Creator: [`create-vaults`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users allowed to create vaults in Katta Server API                    |
| `admin`         | Katta Admin: [`admin`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users have administrative permissions in Katta Web and can configure the Katta Server |


## Vault Membership

Vault ownership and membership are managed per vault, not through realm roles.

| Role                   | Description                                                                                                                                                                                                                                                                                                                                                                                                   |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Katta Vault Member** | The key material to decrypt and encrypt the vault data is shared with Vault Members. See also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details)                                                                                                                                                                                                                               |
| **Katta Vault Owner**  | The vault creator is by default the first vault owner; vault owners have access to the vault's [recovery code](https://docs.cryptomator.org/en/latest/hub/vault-recovery/#hub-vault-recovery); in addition, only vault owners can grant access to a vault, i.e. share the vault member key with new vault members. See also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details) |
| **Katta Server Admin** | Technical administrator of the databases and the infrastructure running Katta Server; zero-trust means the data can never be decrypted by a person having access to the database or the server running the Katta Server or to the physical storage (unless the Katta Server admin is also a Vault Member, of course)                                                                                          |
