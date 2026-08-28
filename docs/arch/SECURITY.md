---
id: security
title: Security Architecture
sidebar_position: 2
---

# Katta Security Architecture

:::note

This document describes Katta's security model at a mid-level: the cryptographic keys, what the server stores, and what each party can and cannot
access. For the token and IAM details of storage access control, see [Katta Token Management](TOKENS.md). For the file format cryptography, see the
[Unified Vault Format (UVF) specification](https://github.com/encryption-alliance/unified-vault-format).

:::

## Design Goals

* **Client-side data encryption**: data is encrypted before it leaves the user's machine. Neither Katta Server nor the storage provider ever sees
  plaintext file contents or file names.
* **Zero-knowledge key management**: all secret key material on Katta Server is stored end-to-end encrypted. The server cannot decrypt it, and neither
  can anyone with access to its database or backups.
* **Almost zero trust storage management**: Katta Server holds no storage credentials of its own. Where it acts on storage at all, it receives
  short-lived, down-scoped credentials from the client (see [Tokens with Inline Policy](TOKENS.md#tokens-with-inline-policy-for-s3-bucket-creation-and-template-upload)).

## Key Overview

The following diagram shows the cryptographic keys used in Katta, where they are stored, and how they are encrypted or signed:

![Overview of the cryptographic keys used in Katta](../img/overview/key-overview.drawio.png)

| Key                    | Type                                                                                                                                                                                | Generated                                    | Stored                                                                                                                          |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| User key pair          | ECDH P-384 (key agreement) + ECDSA P-384 (signing)                                                                                                                                  | In the client at first login (initial setup) | Private keys on Katta Server, only as JWEs: one per device (encrypted to the device key) and one encrypted with the Account Key |
| Device key             | P-384 key pair, one per device                                                                                                                                                      | In the client when a device is set up        | Private key in the OS keychain / password store of the device; public key on Katta Server                                       |
| Account Key            | High-entropy secret (setup code)                                                                                                                                                    | In the client at initial setup               | With the user (e.g. password manager); used to encrypt the user keys via PBES2-HS512+A256KW for device-independent recovery     |
| Vault member key       | 256-bit symmetric key (A256KW)                                                                                                                                                      | In the client at vault creation              | On Katta Server, only inside per-member access token JWEs encrypted to each member's public user key (ECDH-ES, A256GCM)         |
| Vault recovery key     | P-384 key pair                                                                                                                                                                      | In the client at vault creation              | Together with the member key in the vault owner's access token; enables vault recovery                                          |
| Vault keys (UVF seeds) | 32-byte seeds; per-file keys derived via HKDF-SHA512, per the [UVF metadata spec](https://github.com/encryption-alliance/unified-vault-format/tree/develop/vault%20metadata#readme) | In the client at vault creation              | Inside `vault.uvf`, a JWE encrypted with the vault member key; stored in the S3 bucket and, for convenience, on Katta Server    |

All JWEs use A256GCM content encryption; key management is ECDH-ES (per-user grants), A256KW (vault metadata via member key), or
PBES2-HS512+A256KW (Account Key). In the bucket, file contents are encrypted with
[AES-256-GCM in 32 KiB chunks](https://github.com/encryption-alliance/unified-vault-format/blob/develop/file%20content%20encryption/AES-256-GCM.md)
(each chunk authenticated with its index, so truncation and reordering are detected, not just bit flips), and file names with
[AES-SIV-512](https://github.com/encryption-alliance/unified-vault-format/blob/develop/file%20name%20encryption/AES-SIV-512-B64URL.md) —
the `fileFormat: AES-256-GCM-32k` and `nameFormat: AES-SIV-512-B64URL` formats of the UVF specification.

The retrieval flows for these keys (login, device setup, recovery) are shown in [Katta Architecture](ARCHITECTURE.md).

## What Katta Server Stores

Encrypted (cannot be read by the server or anyone with database access):

* `vault.uvf` vault metadata — including the storage configuration in the `cloud.katta.storage` extension; in _Static Storage Access Mode_ this contains the S3 access
  credentials, so **storage credentials are also end-to-end encrypted**
* Per-member access tokens (vault member key + recovery key, encrypted to each member's public key)
* User private keys (encrypted per device and with the Account Key)

Plaintext (visible to a server operator or database admin):

* Vault names and descriptions, the membership graph (who has access to which vault), user and group directory data, audit log events
* Public keys of users and vaults (`uvfKeySet` contains only public JWKs)

This is the "zero-knowledge" boundary: a compromised Katta Server, database, or backup exposes organizational metadata but no key material and no way to decrypt vault contents.

## Granting Access

Vault access is granted client-side: a vault owner encrypts the vault member key for the new member using the member's public user key. The server
only transports and stores the resulting JWE — it cannot grant itself (or anyone else) access to vault data.

The remaining attack surface is key substitution: a malicious server could serve a forged public key for a user. Katta mitigates this with the Web of
Trust inherited from Cryptomator Hub: user key pairs include an ECDSA P-384 signing key, and users can verify each other's keys, building signature
chains that are checked before access is granted (managed in the Web Client; see the feature comparison in the [Katta Overview](../introduction/OVERVIEW.md#comparison-katta-web-client-and-katta-desktop-client)).
Automatic Access Grant runs on vault owners' clients: a scheduler periodically checks for members awaiting access and grants it by encrypting the member
key to their public key — client-side, like any manual grant. When the vault's `maxWotDepth` is configured (`org.cryptomator.automaticAccessGrant` in the
vault metadata), a candidate's public key is only accepted if it carries a signature chain that verifies against the granting owner's own signing key and
is no longer than `maxWotDepth` — so a server serving forged keys cannot obtain a grant. Without a configured depth, automatic access grant trusts the
server-provided public keys; use `maxWotDepth` where key substitution by the server is part of your threat model.

## Storage Access Control

Encryption protects confidentiality; storage access control additionally protects the ciphertext:

* _Static Storage Access Mode_: access to the bucket is controlled by the static S3 credentials, which are shared only inside the end-to-end encrypted `vault.uvf` vault metadata.
* _STS Storage Access Mode_: vault membership is mirrored to Keycloak, and clients exchange their OIDC tokens for temporary S3 access tokens scoped to a single vault's
  bucket. No component holds standing storage credentials. See [Katta Token Management](TOKENS.md) for the full flow.

## Threat Model Summary

| Party with access to …                 | Can see / do                                                                                                                                    | Cannot                                                                                   |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Storage provider (S3)                  | Ciphertext objects, object sizes, bucket names (containing the vault ID in _STS Storage Access Mode_), access patterns; delete or withhold data | Decrypt file contents or file names; tampering with ciphertext is detected on decryption |
| Katta Server, its database, or backups | Vault names, membership graph, audit logs, public keys, encrypted blobs; deny service                                                           | Decrypt vault data, key material, or the storage credentials inside `vault.uvf`          |
| Keycloak / identity provider           | Authenticate as any user towards the API; in _STS Storage Access Mode_, issue tokens granting access to the ciphertext in a vault's bucket      | Decrypt vault data; obtain vault member keys (access grants happen client-side)          |
| A vault member                         | Everything in vaults they are a member of                                                                                                       | Other vaults; granting access requires a vault owner                                     |

As with any end-to-end encrypted system, a compromised *client* (or user account together with its Account Key) has access to everything the user has
access to — Katta's guarantees concern the server and infrastructure side.

## Further Reading

* [Unified Vault Format specification](https://github.com/encryption-alliance/unified-vault-format) — file format cryptography
* [Katta Token Management](TOKENS.md) — scoped tokens, IAM data models, inline policies
* [Cryptomator Hub security docs](https://docs.cryptomator.org/) and the upstream Security Architecture draft in
  [cryptomator/docs#55](https://github.com/cryptomator/docs/pull/55/files) — upstream foundations Katta builds on
