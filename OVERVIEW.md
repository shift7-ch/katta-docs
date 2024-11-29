# Katta Overview

> [!NOTE]  
> This document gives an overview over Katta usage scenarios.

## Katta Vaults

In Katta, data is shared in units called vaults. Only members of the vault have access to the key material that allows to decrypt the data.

* The vault keys are uploaded to Katta Server only after encryption on your machine.
* Your data is uploaded to the storage providers only after encryption on your machine using the vault's content encryption keys.

> [!IMPORTANT]  
> One vault corresponds to one bucket.

## Katta S3 Modes

Katta currently supports two modes for both S3 providers:

* static: use an existing S3 bucket and share the static credentials among vault users
* STS: use STS to have fine-grained permissions
    * vault creation: the new bucket is created in Katta Server backend, the user passes a temporary token with limited permissions to the backend
    * storage access: only vault users can access storage

If you want to use static mode, you can use any S3 Provider - see the [list](https://docs.cyberduck.io/protocols/s3/).

Not all S3 providers implement the [STS API](https://docs.aws.amazon.com/STS/latest/APIReference/welcome.html).
If you want to use Katta STS mode, Katta currently supports two S3 object storage services :

* [AWS](https://aws.amazon.com/s3/)
* [MinIO](https://min.io/)

## Katta Setup

The following diagram illustrates the flow of actions to setup Katta Server in both modes:

![ServerSetup.drawio.png](img/ServerSetup.drawio.png)

## Vault Creation

The following diagram illustrates the flow of actions to create a vault in the two modes:

![VaultCreation.drawio.png](img/VaultCreation.drawio.png)

## E2EE Data Sync

The following diagram illustrates the flow of actions to sync data in an end-to-end-encrypted way:

![DataAccess.drawio.png](img/DataAccess.drawio.png)

## Comparison Katta Client and Katta Server Frontend

| Feature                       | Katta Server Frontend | Katta Client |
|-------------------------------|-----------------------|--------------|
| create vault static           | ✅                     | ✅            |
| create vault STS              | ✅                     | ✅            |
| list vaults                   | ✅                     | ✅            |
| decrypt vault data            | ❌                     | ✅            |
| automatic access grant        | ❌                     | ✅            |
| view details storage profiles | ✅                     | ❌            |
| initial setup (user keys)     | ✅                     | ✅            |
| View/reset setup code         | ✅                     | ❌            |

## Glossary

| Term                                                                                                                                                                                        | Description                                                                                                                             |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| Client [Bookmark](https://docs.cyberduck.io/cyberduck/bookmarks/)                                                                                                                           | Defines a sync endpoint in Katta client at two levels: Katta servers and vaults.                                                        |
| Client [Protocol](https://docs.cyberduck.io/protocols/)                                                                                                                                     | The two Katta modes are defined in two Cyberduck protocols.                                                                             |
| Client [Connection Profile](https://docs.cyberduck.io/protocols/profiles/)                                                                                                                  | Used internally in Client for the two modes and for storage profiles.                                                                   |
| Katta Storage Profile                                                                                                                                                                       | Uploaded by a Katta Server admin initially for each storage provider endpoint and mode.                                                 |
| [uvf vault metadata](https://github.com/encryption-alliance/unified-vault-format/blob/develop/vault%20metadata/README.md) `vault.uvf`  [JWE](https://datatracker.ietf.org/doc/html/rfc7516) | Contains all the information required to create a vault bookmark in the client (reference to storage profile, static credentials etc.). |
