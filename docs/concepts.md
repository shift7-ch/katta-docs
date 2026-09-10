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

In Katta, data is shared in units called vaults. Only members of the vault have access to the key material that allows to decrypt the data.

* The vault keys are uploaded to Katta Server only after encryption on your machine.
* Your data is uploaded to the storage providers only after encryption on your machine using the vault's content encryption keys.

:::info[S3 Bucket]
One vault corresponds to a single bucket.
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

## S3 Modes

Katta currently supports two modes for both S3 providers:

* **Static Storage Access Mode**: use an existing S3 bucket and share the static credentials among vault users; the vault template is uploaded with static credentials provided in
  the frontend.
* **STS Storage Access Mode**: use STS to have fine-grained permissions;
  - vault creation: the user passes a temporary token with limited permissions to the backend, Katta Server or _Katta Desktop_ creates the bucket and uploads the vault template;
  - storage access: only vault users can access storage.

If you want to use Static Storage Access mode, you can use any S3 Provider - see the [list](https://docs.cyberduck.io/protocols/s3/).

Not all S3 providers implement the [STS API](https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html). If you want to use Katta _STS Storage Access Mode_, Katta currently supports two S3 object storage services:

* [AWS](https://aws.amazon.com/s3/)
* [MinIO](https://min.io/)

## Unified Vault Format (UVF)

The [Unified Vault Format (UVF)](https://github.com/encryption-alliance/unified-vault-format) defines a common vendor-independent standard for encrypted
directories
on a per-file basis. It is based on the year-long proven [Cryptomator Vault Format](https://docs.cryptomator.org/en/latest/misc/vault-format-history/).
It will allow in the future for implementation
of [Key Rotation](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/key-rotation.md)
(see also [Security](architecture/security.md)).

[Vault Metadata (`vault.uvf`)](https://github.com/encryption-alliance/unified-vault-format/tree/develop/vault%20metadata#readme)
contains the key material to decrypt and encrypt data. UVF allows for vendor-specific extension points:

* `org.cryptomator.automaticAccessGrant` (upstream): defines whether automatic access grant is enabled for this vault and defines the maximum length (
  see [Web of Trust](https://docs.cryptomator.org/hub/admin-guide/web-of-trust/)).
* `cloud.katta.storage` (Katta only): defines the bucket location and further storage settings
  like [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html); the user will have access to their vaults in Katta Desktop
  by [Bookmarks](https://docs.cyberduck.io/cyberduck/bookmarks/). So the information required to create such bookmarks is contained in this section of the
  encrypted `vault.uvf` file (which is also stored encrypted in the Katta Server for convenience).

The contents of `vault.uvf` contain the information required to create a [bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)
for the vault in the Katta Desktop.
The contents of `vault.uvf` come from the following sources:

* storage profile (value or allowed values for user selection)
* user input (e.g. vault name) or user selection (e.g. S3 region or automatic access grant) at vault creation
* generated (key material)

## What Katta Web and Katta Desktop Can Do

The following table captures the current state of implemented features:

| Feature                                      | Katta Web | Katta Desktop |
|----------------------------------------------|-----------|---------------|
| Create Vault with S3 Static Access Tokens    | ✅[^1]    | ✅            |
| Create Vault with S3 Temporary Access Tokens | ✅        | ✅            |
| List Vaults                                  | ✅        | ✅            |
| Decrypt Vault Contents                       | ❌        | ✅            |
| Manual Access Grant                          | ✅        | ❌            |
| Automatic Access Grant                       | ❌        | ✅            |
| View Storage Profiles Details                | ✅        | ❌            |
| Initial Setup creating User Keys             | ✅        | ✅            |
| View/Reset Setup Code                        | ✅        | ❌            |
| Manage Signature Chains (Web of Trust)       | ✅        | ❌            |
| Share vault with Members or Owners           | ✅        | ❌            |
| Archive Vaults                               | ✅        | ❌            |

[^1]: Conceptually, the only limitation is that a browser cannot create a bucket and configure its CORS settings in one shot, since S3 does not offer bucket
creation and CORS configuration as a joint operation. Hence, in _Static Storage Access Mode_ the Web Client can only use pre-existing, CORS-configured buckets, while in _STS Storage Access Mode_
Katta Server creates the bucket on its behalf. The Desktop Client is not affected.

