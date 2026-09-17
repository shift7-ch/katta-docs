---
title: Concepts
sidebar_position: 2
description: The vocabulary every Katta guide assumes — vaults, the two S3 access modes, the Unified Vault Format, and what each client can do.
---

# Concepts

This page defines the terms the rest of this documentation uses. Read it once before the guides.
The [Glossary](glossary.md) defines every term in one table, and maps Katta terms to their upstream counterparts.

:::tip[Upstream reading]
This page builds on concepts from the upstream documentation:
[vaults and vault management](https://docs.cryptomator.org/hub/vault-management/) in Cryptomator Hub and
[connecting to storage](https://docs.mountainduck.io/mountainduck/connect/) in Mountain Duck.
:::

## Vaults

In Katta, data is shared in units called vaults. Only members of the vault have access to the key material needed to decrypt data. All encryption is done locally on your device:

* The vault keys are uploaded to Katta Server only after encryption on your device.
* Your data is uploaded to the storage providers only after encryption on your device using the vault's content encryption keys.

:::info[S3 Bucket]
A vault corresponds to a single bucket named `${bucketPrefix}${vaultId}` with a
random UUID. The number of vaults is therefore bounded by the number of buckets the provider allows per account or
project. Several providers cap this in the low hundreds by default and raise it on request.
:::

A vault is initialized with a *vault template* consisting of the vault metadata file (`vault.uvf`) and the representation of the root folder under the data
directory `d`:

```text
.
├─ vault.uvf
└─ d
   └── BZ
      └── R4VZSS5PEF7TU3PMFIMON5GJRNBDWA     # Root Directory
         └── dir.uvf                         # Root Directory's metadata
```

For more details,
see [example directory structure](https://github.com/encryption-alliance/unified-vault-format/blob/develop/file%20name%20encryption/AES-SIV-512-B64URL.md#example-directory-structure).


## S3 Storage

Katta currently supports connecting with **static credentials** and **scoped credentials** for S3 providers.

### Using Static Credentials

Access S3 storage using static S3 credentials obtained from vault metadata.

Use an existing S3 bucket and share the static credentials among vault users; the vault template is uploaded with static credentials provided in the frontend.

:::tip[S3 Third Party Providers]
Beside AWS, you can use any [S3 Storage Provider](admin-guide/storage-profiles.md#generic-s3-provider).
:::

Creating a vault with Katta Desktop asks for two pairs of Access Key ID and Secret Access Key.
They serve different purposes and need different permissions.

* **Bucket access** pair, asked for first, is stored in the encrypted vault metadata. Every member of the vault receives this
  pair and
  uses it to work with the vault. It needs `ListBucket`, `GetObject`, `PutObject` and `DeleteObject` permission on every
  bucket that is created referencing the [storage profile](admin-guide/storage-profiles.md).
* **Bucket creation** pair, asked for second, is used once by the vault creator to create the bucket and upload the vault
  template. It
  needs permission to create buckets.

The same key pair can be used for both. The access pair may create buckets but does not have to, so where the provider
allows keys
to be scoped, issue it without that permission.

:::info[Katta Web]
Creating a vault in Katta Web requires a pre-existing bucket with the required [CORS settings](admin-guide/storage-profiles.md#s3-bucket-cors-settings); the supplied access pair is used to upload the vault template.
:::

:::warning
The access pair is handed to every member of the vault. Issue a dedicated pair per vault where the provider supports it
and prefer configuration using STS with AWS or MinIO when scoped per-user credentials are required.
:::


### Use Scoped Credentials

Access S3 storage by exchanging OIDC token for temporary credentials from Security Token Service (STS) scoped to a single S3 bucket containing the vault.

Use STS to have fine-grained permissions:
- **Vault Creation**: the user passes a temporary token with limited permissions to the backend, Katta Server or _Katta Desktop_ creates the bucket and uploads the vault template;
- **Storage Access**: only vault users can access storage.

Not all S3 providers implement the [STS API](https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html). If you want to use scoped credentials, Katta currently supports two S3 object storage services:

* [AWS](self-hosting-guide/aws.md)
* [MinIO](self-hosting-guide/minio.md)

:::note[In-Depth]
Refer to [Scoped Tokens for S3 Storage Access](architecture/tokens.md#scoped-tokens-for-s3-storage-access) for more technical details about scoped credentials.
:::

## Unified Vault Format (UVF)

The [Unified Vault Format (UVF)](https://github.com/encryption-alliance/unified-vault-format) defines a common vendor-independent standard for encrypted
directories on a per-file basis. It is based on the year-long proven [Cryptomator Vault Format](https://docs.cryptomator.org/misc/vault-format-history/),
adding support of [Key Rotation](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md#encrypted-content)
(see also [Security](architecture/security.md)).

[Vault Metadata (`vault.uvf`)](https://github.com/encryption-alliance/unified-vault-format/tree/develop/vault%20metadata#readme)
contains the key material to decrypt and encrypt data. UVF allows for vendor-specific extension points used in Katta:

* `org.cryptomator.automaticAccessGrant` (upstream): defines whether automatic access grant is enabled for this vault and defines the maximum length (
  see [Web of Trust](https://docs.cryptomator.org/hub/admin-guide/web-of-trust/)).
* `cloud.katta.storage` (Katta only): defines the vault name, bucket location and [static access tokens](#s3-storage) if any.

## Feature Comparison

The following table captures the current state of implemented features:

| Feature                                | Katta Web | Katta Desktop | Admin CLI |
|----------------------------------------|-----------|---------------|-----------|
| Create Vault                           | ✅[^1]    | ✅            | ❌        |
| List Vaults                            | ✅        | ✅            | ❌        |
| Decrypt Vault Contents                 | ❌        | ✅            | ❌        |
| Manual Access Grant                    | ✅        | ❌            | ❌        |
| Automatic Access Grant                 | ❌        | ✅            | ❌        |
| View Storage Profiles Details          | ✅        | ❌            | ❌        |
| Create Storage Profiles                | ✅        | ❌            | ✅        |
| Setup Storage Provider Integration     | ❌        | ❌            | ✅        |
| Initial Setup creating User Keys       | ✅        | ✅            | ❌        |
| View/Reset Setup Code                  | ✅        | ❌            | ❌        |
| Manage Signature Chains (Web of Trust) | ✅        | ❌            | ❌        |
| Share vault with Members or Owners     | ✅        | ❌            | ❌        |
| Archive Vaults                         | ✅        | ❌            | ❌        |

[^1]: See [Troubleshooting](self-hosting-guide/troubleshooting.md#failure-creating-vault-in-katta-web) for CORS requirements.
