---
id: comparison
title: How Katta Differs from Cryptomator Hub
sidebar_position: 2
---

# How Katta Differs from Cryptomator Hub

The Cryptomator and Cryptomator Hub ecosystem provides:

* *Client-side Data Encryption*: data is encrypted in the client only, never on the server; data is always encrypted before it leaves the local machine.
  Even with access to the stored encrypted data, an attacker cannot decrypt the plaintext without access to the data keys.
* *Zero-Knowledge Key Management*: key material is uploaded to the server only in end-to-end-encrypted fashion.
  Even with access to the stored encrypted keys, an attacker cannot decrypt the data keys without access to the key encryption keys.

While sharing Client-side Data Encryption and Zero-Knowledge Key Management, Katta adds the following features:

* _Storage Location_: Vault metadata managed by Katta Server contains the location where data is stored. Katta Server administrators can manage the _Storage Profiles_ to define storage locations where new vaults can be created authenticating using static or STS access tokens.
* _Storage Access_: Vault membership defines storage access managed by Katta Server:
    - **Static Storage Access Mode**: the key material is shared among Vault Members in an end-to-end encrypted way with zero trust in Katta Server
    - **STS Storage Access Mode**: vault membership is mirrored in Keycloak, and the access tokens issued by Keycloak are evaluated by STS for fine-grained storage access control.
* _Sync Data_ with _Katta Desktop_. No third-party sync client (like Dropbox) is required.
* _Automatic Access Grant_ in _Katta Desktop_.

|                               | Cryptomator Hub | Katta Server & Katta Desktop |
|-------------------------------|-----------------|------------------------------|
| Client-side Data Encryption   | ✔️              | ✔️                           |
| Zero-Knowledge Key Management | ✔️              | ✔️                           |
| Storage Profiles              | –               | ✔️                           |
| Storage Access                | –               | ✔️                           |
| Desktop Sync                  | –               | ✔️                           |
| Automatic Access Grant        | –               | ✔️                           |

See the [Katta Overview](OVERVIEW.md) for how these concepts fit together, and the [Glossary](GLOSSARY.md) for how Katta terms map to their upstream counterparts.
