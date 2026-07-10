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

* The storage location and storage access are managed by Katta Server:
    * Vault metadata contains the location where data is stored:
        * Katta Server Admins can manage the Storage Profiles to define where new vaults can be created
        * Katta Static Mode: the vault template (data to initialize the vault) is uploaded upon vault creation
        * Katta STS Mode: a bucket is created on behalf of the user
    * Vault membership defines storage access:
        * Katta Static Mode: the key material is shared among Vault Members in an end-to-end encrypted way with zero trust in Katta Server
        * Katta STS Mode: vault membership is mirrored in Keycloak, and the access tokens issued by Keycloak are evaluated by STS for fine-grained storage
          access control.
* Data Sync in Katta Client. No third-party sync client (like Dropbox) is required.
* Automatic Access Grant in Katta Client (not supported by Cryptomator Hub yet)

See the [Katta Overview](OVERVIEW.md) for how these concepts fit together, and the [Glossary](GLOSSARY.md) for how Katta terms map to their upstream counterparts.
