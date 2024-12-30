# Katta Documentation

Katta bring zero-config storage management and zero-knowledge key management for teams and organizations.

It easily integrates into your existing identity management incl. OpenID Connect, SAML, and LDAP.
As usual, your favorite cloud service remains your free choice [^1].

[^1]: Currently, we support AWS S3 and MinIO S3.

Katta consists of Katta Server and Katta Client:

* Katta Client is based on [Mountain Duck](https://mountainduck.io/),
* Katta Server is based on [Cryptomator Hub](https://github.com/cryptomator/hub/)

## Contents

* [Get an Overview](OVERVIEW.md)
* [Setup Katta Server](OVERVIEW.md)

## Comparison with Cryptomator Hub

Cryptomator and Cryptomator Hub ecosystem provides

* *Client-side Data Encryption*: data is encrypted in the client only, never on the server; data is always encrypted before it leaves the local machine.
  Event with access to the stored encrypted data, a penetrator cannot decrypt the plaintext without access to the data keys.
* *Zero-Knowledge Key Management*: key material is uploaded to hub only in end-to-end-encrypted fashion.
  Event with access to the stored encrypted keys, a penetrator cannot decrypt the data keys without access to the key encryption keys.

While sharing Client-side Data Encryption and Zero-Knowledge Key Management, Katta adds the following features:

* The storage location and storage access is managed by Katta Server:
    * Vault metadata contains the location where data is stored:
        * Katta Server Admins can manage the Storage Profiles to define where new vaults can be created
        * Katta Static Mode: the vault template (data to initialize the vault) is uploaded upon vault creation
        * Katta STS Mode: a bucket is created on behalf of the user
    * Vault membership defines storage access:
        * Katta Static Mode: the key material is shared among Vault Members in end-to-end encrypted way and zero-trust in Katta Server
        * Katta STS Mode: vault membership is mirrored in Keycloak, and the access tokens issued by Keycloak are evaluated by STS for fine-grained storage
          access control.
* Data Sync in Katta Client. No third-party sync client (like Dropbox) is required.
* Automatic Access Grant in Katta Client (not support by Cryptomator Hub yet)


