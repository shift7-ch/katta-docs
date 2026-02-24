# Katta Overview

> [!NOTE]  
> This document gives a mid-level technical overview over Katta usage scenarios.

Katta consists of the following components and sub-components:

* Katta Clients:
    * Katta Desktop (Client)
    * Katta Web (Client)
* Katta Server:
    * Katta (Server) Backend
    * Keycloak

Katta Desktop Client is based on

* [Mountain Duck](https://mountainduck.io/) (macOS and Windows native parts, closed source),
* [Katta Client Library](https://github.com/shift7-ch/katta-clientlib) (open source), which is based on [Cyberduck](https://cyberduck.io/) (open source),

and Katta Web Client and Katta Server are based on

* [Cryptomator Hub](https://github.com/cryptomator/hub/) (open source).

## Concepts

### Katta Vaults

In Katta, data is shared in units called vaults. Only members of the vault have access to the key material that allows to decrypt the data.

* The vault keys are uploaded to Katta Server only after encryption on your machine.
* Your data is uploaded to the storage providers only after encryption on your machine using the vault's content encryption keys.

> [!IMPORTANT]  
> One vault corresponds to one bucket.

A vault is initialized with a *vault template* consisting of the vault metadata file (`vault.uvf`) and the the representation of the root folder under the data
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

### Katta S3 Modes

Katta currently supports two modes for both S3 providers:

* Static Mode: use an existing S3 bucket and share the static credentials among vault users the vault template is uploaded with static credentials
* STS Mode: use STS to have fine-grained permissions
  - vault creation: the user passes a temporary token with limited permissions to the backend, Katta Server creates the bucket and uploads the vault template
  - storage access: only vault users can access storage.

If you want to use static mode, you can use any S3 Provider - see the [list](https://docs.cyberduck.io/protocols/s3/).

Not all S3 providers implement the [STS API](https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html).
If you want to use Katta STS mode, Katta currently supports two S3 object storage services :

* [AWS](https://aws.amazon.com/s3/)
* [MinIO](https://min.io/)

### Katta Storage Profiles

Katta Storage Profiles are created by Katta Server Admins to define the available storage locations where users can create vaults, e.g.

* Katta mode (static or STS)
* S3 endpoint
* default region
* available region
* storage-provider specific settings (e.g. [path-style-requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html#path-style-access),
  see also [path-style-requests](https://docs.cyberduck.io/protocols/s3/#connecting-using-deprecated-path-style-requests))

Katta Server Admins can define the storage profiles according to their infrastructure, e.g. a company uses AWS and restrict vault creation to some zones,
another company uses a low-cost S3 provider supporting only Static Mode,
and yet another company has their own MinIO instance.

See [04_SETUP_KATTA_SERVER.md](04_SETUP_KATTA_SERVER.md) for the configuration options.

### Unified Vault Format (UVF) and `vault.uvf` (Vault Metadata)

The [Universal Vault Format (UVF)](https://github.com/encryption-alliance/unified-vault-format) defines a common vendor-independent standard for encrypted
directories
on a per-file basis. It is based on year-long proven [Cryptomator Vault Format](https://docs.cryptomator.org/en/latest/misc/vault-format-history/).
It will allow in the future for implementation
of [Key Rotation](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/key-rotation.md)
(see also [Security Architecture](https://github.com/cryptomator/docs/pull/55/files)).

[Vault Metadata (`vault.uvf`)](https://github.com/encryption-alliance/unified-vault-format/tree/develop/vault%20metadata#readme)
(see also [Security Architecture](https://github.com/cryptomator/docs/pull/55/files))
contains the key material to decrypt and encrypt data. UVF allows for vendor-specific extension points:

* `org.cryptomator.automaticAccessGrant` (upstream): defines whether automatic access grant is enable for this vault and defines the maximum length (
  see [Web of Trust](https://github.com/cryptomator/hub/pull/281)).
* `cloud.katta.storage` (Katta only): defines the bucket location and further storage settings
  like [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html); the user will have access to their vaults in Katta Client
  by [Bookmarks](https://docs.cyberduck.io/cyberduck/bookmarks/). So the information required to create such bookmarks is contained in this section of the
  encrypted `vault.uvf` file (which is also stored encrypted in the Katta Server for convenience).

The contents of `vault.vuf` contain the information required to create a [bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)
for the vault in the Katta Client.
The contents of `vault.uvf` comes from the following sources:

* storage profile (value or allowed values for user selection)
* user input (e.g. vault name) or user selection (e.g. S3 region or automatic access grant) at vault creation
* generated (key material)

### Katta Roles

* Katta User: the [`user`](https://docs.cryptomator.org/hub/user-group-management/#roles) role allows to login to Katta Server Frontend
* Katta Vault Creator: [`create-vault`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users allowed to create vault in Katta Server
* Katta Admin: [`admin`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users have administrative permissions in the Katta Server Frontend /
  Katta Server Backend API, they can configure the Katta Server and they can
  upload storage profiles.
* Katta Vault Member: the key material to decrypt and encrypt the vault data is shared with Vault Members. See
  also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details).
* Katta Vault Owner: the vault creator is by default the first vault owner; vault owners have access to the
  vault's [recovery code](https://docs.cryptomator.org/en/latest/hub/vault-recovery/#hub-vault-recovery);
  in addition, only vault owner can grant access to vault i.e. share the vault member key with new vault members. See
  also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details).
* Katta Server Admin: technical administrator of the databases and; zero-trust means the data can never be decrypted by a person having access to the database
  or the server running the Katta Server or to the physical storage (unless the Katta Server admin is also a Vault Member, of course).

## E2E-Encrypted Data Sync in Static and STS mode

The following diagram illustrates the interactions when Katta Client syncs data in vault in *Static Mode*:

![DataAccessStatic_Interaction.drawio.png](img/overview/DataAccessStatic_Interaction.drawio.png)

In words:

* `vault.uvf` (vault metadata) contains the S3 access configuration (credentials `AccessKeyId` and `SecretKey` and bucket configuration (region, custom endpoint
  etc.)), as well as the encryption keys; it is stored encrypted in Katta Server Backend.
* With the encryption keys from `vault.uvf`, Katta Client encrypts and decrypts data on the fly before it leaves the local machine on the way to/from S3 bucket.

The following diagram illustrates the interactions when Katta Client syncs data in a vault in *STS Mode*:

![DataAccessSTS_Interaction.drawio.png](img/overview/DataAccessSTS_Interaction.drawio.png)

In words:

* `vault.uvf` (vault metadata)  contains the S3 access configuration (e.g. roles to be used with STS and bucket configuration like region or custom
  endpoint), as
  well as the encryption keys; it is stored encrypted in Katta Server.
* The OIDC access token that is used to communicate with Katta Server is exchanged for a token with vault-specific claims
* When sent to STS, the vault-specific claims will be evaluated to issue temporary fine-grained S3 credentials giving access to the vault's bucket only
* With the encryption keys from `vault.uvf`, Katta Client encrypts and decrypts data on the fly before it leaves the local machine on the way to/from S3 bucket.

The following diagram illustrates the flow of actions to sync data in an end-to-end-encrypted way:

![DataAccess_Activity.drawio.png](img/overview/DataAccess_Activity.drawio.png)

In words:

* A user opens the vault in [Mountain Duck User Interface](https://docs.mountainduck.io/mountainduck/interface/)
* If Katta Client does not have a valid OIDC access token, it refreshes it or starts
  an [OIDC Authorization Code Grant Flow](https://www.rfc-editor.org/rfc/rfc6749#page-24), asking the user to authenticate in the browser against Keycloak to
  issue a new access token.
* `vault.uvf` (vault metadata) JWE is fetched from Katta Server Backend and
* decrypted with Vault Member Key, the keys for data encryption/decryption are extracted; the access configuration is extracted and stored in
  a [bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)
  The other actions directly correspond to the interactions described above.

## Vault Creation in Static and STS mode

The following diagram illustrates the interactions when a user
creates a vault in *Static Mode*:

![VaultCreationStatic_Interaction.drawio.png](img/overview/VaultCreationStatic_Interaction.drawio.png)

In words:

* A Katta Server admin (role `admin`) needs to define the possible S3 endpoints for Katta S3 Static Mode where users can create vaults.
  Admins can upload storage profiles can be uploaded via the backend API and inspect in the Web Client.
* In order to create vault in Static Mode, first a bucket needs to be created manually ([AWS console](https://aws.amazon.com/console/)
  or [AWS cli](https://aws.amazon.com/cli/)) and set the correct bucket CORS settings.
* A Katta user (role `create-vault`) can create vaults based on the storage profile and the bucket and access credentials. The vault creator becomes the first
  Vault Owner.
* Finally, Katta Client verifies the configuration and uploads the `vault.uvf` (vault metadata) to the S3 bucket and to Katta Server.

The following diagram illustrates the interactions when a user creates a
vault in *STS Mode*:

![VaultCreationSTS_Interaction.drawio.png](img/overview/VaultCreationSTS_Interaction.drawio.png)

In words:

* A technical admin needs to prepare OIDC trust and roles in AWS or MinIO IAM and define an STS Mode storage profile in Katta Server.
* Katta Client refreshes (triggering OAuth Authorization Code Flow in browser) the user's access token
* The access token is sent to STS with an inline policy in order to issue temporary credentials that allow for the creation of a specific bucket.
* The temporary S3 credentials are sent to Katta Server which calls S3 to create the corresponding bucket. Due to CORS restrictions, this allows the creation of
  STS vaults both in Web and Desktop Client in the same way.
* Finally, Katta Client then uploads the `vault.uvf` with the access configuration, and the vault members are synced to Keycloak.

The following diagram illustrates the flow of actions to create a vault in the two modes:

![VaultCreation_Activity.drawio.png](img/overview/VaultCreation_Activity.drawio.png)

## Katta Setup

The following diagram illustrates the flow of actions to setup Katta Server in both modes:

![ServerSetup.drawio.png](img/overview/ServerSetup.drawio.png)

In words: in order to be able to use the uploaded storage profiles, the following actions need to be taken:

* for Static Mode, we do S3 calls from the Web Client to upload the vault template, hence CSP settings need to be set correctly matching the endpoints of the
  storage profile. Contact your
  Katta Server admin running Katta Web.
* for STS, the trust and roles need to be configure in IAM of the S3 provider. See [04_SETUP_KATTA_SERVER.md](04_SETUP_KATTA_SERVER.md) for details.
  See [connect-external-iam](https://docs.cryptomator.org/hub/user-group-management/#connect-external-iam) on how to connect with external IAM.

## Comparison Katta Client and Katta Server Frontend

| Feature                                | Katta Server Frontend | Katta Client |
|----------------------------------------|-----------------------|--------------|
| create vault static                    | ✅                     | ✅            |
| create vault STS                       | ✅                     | ✅            |
| list vaults                            | ✅                     | ✅            |
| decrypt vault data                     | ❌                     | ✅            |
| manual access grant                    | ✅                     | ❌            |
| automatic access grant                 | ❌                     | ✅            |
| view details storage profiles          | ✅                     | ❌            |
| initial setup (user keys)              | ✅                     | ✅            |
| View/reset setup code                  | ✅                     | ❌            |
| Manage Signature Chains (Web of Trust) | ✅                     | ❌            |

## Glossary

| Term                                                                                                               | Description                                                                                                                                                                                         |
|--------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Client [Bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)                                                  | Defines a sync endpoint in Katta client at two levels: Katta servers and vaults.                                                                                                                    |
| Client [Protocol](https://docs.cyberduck.io/protocols/)                                                            | The two Katta modes are defined in two Cyberduck protocols.                                                                                                                                         |
| Client [Connection Profile](https://docs.cyberduck.io/protocols/profiles/)                                         | Used internally in Client for the two modes and for storage profiles.                                                                                                                               |
| Katta Storage Profile                                                                                              | Uploaded by a Katta Server admin initially for each storage provider endpoint and mode.                                                                                                             |
| [`vault.uvf`](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md) | A [JWE](https://datatracker.ietf.org/doc/html/rfc7516) containing all the vault metadata required to create a vault bookmark in the client (reference to storage profile, static credentials etc.). |
| vault template                                                                                                     | Initial encrypted vault content consisting of `vault.uvf` file and representation of root folder.                                                                                                   |

## Key Overview

The following diagram shows the cryptographic keys used in Katta, where they are stored and how they are encrypted/signed:
![key-overview.drawio.png](img/overview/key-overview.drawio.png)
For more details, refer to [Cryptomator Docs](https://github.com/cryptomator/docs/pull/55/files).