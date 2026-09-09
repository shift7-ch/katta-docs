---
id: comparison
title: Why Katta?
sidebar_position: 2
---

## Deploy Katta as a Cloud Storage Solution

:::info[Cryptomator]
The Cryptomator ecosystem provides:

* *Client-side Data Encryption*: data is encrypted in the client only, never on the server; data is always encrypted before it leaves the local machine.
  Even with access to the stored encrypted data, an attacker cannot decrypt the plaintext without access to the data keys.
* *Zero-Knowledge Key Management*: key material is uploaded to the server only in end-to-end-encrypted fashion.
  Even with access to the stored encrypted keys, an attacker cannot decrypt the data keys without access to the key encryption keys.
:::

Organizations run Katta instead of a hosted file-sync service:

* **Your storage, your account, your rates.** Vaults live in S3 buckets *you* own — AWS S3, MinIO, or any
  [S3-compatible provider](https://docs.cyberduck.io/protocols/s3/) in _Static Storage Access Mode_. You pay the storage provider
  directly, keep data in a region and jurisdiction you choose, and can change providers without migrating through a vendor. Katta
  Server never becomes the custodian of the data itself.
* **Confidentiality does not depend on trusting the operator.** File contents *and* file and folder names are encrypted on the client
  (AES-256-GCM and AES-SIV-512, per the open [Unified Vault Format](https://github.com/encryption-alliance/unified-vault-format)). A
  compromise of Katta Server, its database, its backups, or the storage bucket exposes only ciphertext and organizational metadata —
  never plaintext or key material. In _Static Storage Access Mode_ even the S3 credentials are end-to-end encrypted inside the vault
  metadata. See the [Security Architecture](../arch/SECURITY.md) threat model.
* **Self-hosted, no third-party processor.** Katta Server (backend, Keycloak, and PostgreSQL, with an optional bundled MinIO for
  evaluation) ships as a Helm chart and runs in your own Kubernetes cluster or cloud account. Nothing outside your infrastructure
  sits in the path of your plaintext, and there is no external service to depend on for availability.
* **Uses the identity system you already have.** Authentication and directory data come from Keycloak, which federates OpenID
  Connect, SAML, and LDAP. Users, groups, roles, and single sign-on are managed where you manage them today — there is no separate
  account store to maintain.
* **Access control that follows membership.** In _STS Storage Access Mode_, vault membership is mirrored to Keycloak and clients
  exchange their OIDC token ([RFC 8693](https://www.rfc-editor.org/rfc/rfc8693.html)) for short-lived S3 credentials scoped to a
  single vault's bucket (AWS STS or MinIO STS; AWS additionally uses role chaining). No component holds standing storage
  credentials, and removing a member revokes their storage access. See [Katta Token Management](../arch/TOKENS.md).
* **No extra sync subscription or client.** Katta Desktop (based on [Mountain Duck](https://mountainduck.io/)) mounts vaults natively
  on macOS and Windows with synchronization built in. Your only recurring cost is the S3 storage and traffic you would pay anyway —
  there is no per-seat or per-gigabyte markup on top.
* **Open and standards-based.** Katta Server and the [Katta Client Library](https://github.com/shift7-ch/katta-clientlib) are open
  source (AGPL-3.0), built on the proven Cryptomator Hub and Cyberduck codebases and on open standards — S3, OpenID Connect, JWE,
  RFC 8693 token exchange, and the vendor-independent Unified Vault Format. The cryptography is auditable rather than a proprietary
  black box.
* **Governance and auditability.** A server operator can see the membership graph and audit-log events for compliance reporting,
  while remaining cryptographically unable to read vault contents. Vault owners hold recovery keys, and the
  [Web of Trust](../arch/SECURITY.md#granting-access) guards against a malicious server substituting user keys.

See [Storage Provider Setup](../setup/SERVER_SETUP.md) to connect Katta Server to AWS or MinIO, and
[Desktop Setup](../setup/DESKTOP_CLIENT.md) to roll out Katta Desktop to users.


## Comparison with Cryptomator Hub and Mountain Duck

Mountain Duck provides interoperable access to Cryptomator Vaults in any storage location, including S3-compatible object storage. Katta adds the following features beyond client-side data encryption and zero knowledge key management of Cryptomator Hub:

* _Storage Location_: Vault metadata managed by Katta Server contains the location where data is stored. Katta Server administrators can manage the _Storage Profiles_ to define storage locations where new vaults can be created authenticating using static or STS access tokens.
* _Storage Access_: Vault membership defines storage access managed by Katta Server:
    - **Static Storage Access Mode**: the key material is shared among Vault Members in an end-to-end encrypted way with zero trust in Katta Server
    - **STS Storage Access Mode**: vault membership is mirrored in Keycloak, and the access tokens issued by Keycloak are evaluated by STS for fine-grained storage access control.
* _Sync Data_ with _Katta Desktop_. No third-party sync client (like Dropbox) is required.
* _Automatic Access Grant_ in _Katta Desktop_.

|                               | Mountain Duck | Cryptomator Hub | Katta Server & Katta Desktop |
|-------------------------------|---------------|-----------------|------------------------------|
| Client-side Data Encryption   | ✔️            | ✔️              | ✅️                           |
| Zero-Knowledge Key Management | –             | ✔️              | ✅️                           |
| Storage Profiles              | –             | –               | ✅️                           |
| Storage Access                | –             | –               | ✅️                           |
| Desktop Sync                  | ✔️            | –               | ✅️                           |
| Automatic Access Grant        | –             | –               | ✅️                           |

See the [Katta Overview](../arch/OVERVIEW.md) for how these concepts fit together, and the [Glossary](GLOSSARY.md) for how Katta terms map to their upstream counterparts.

