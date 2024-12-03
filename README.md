# Katta Documentation

Katta bring zero-config storage management and zero-knowledge key management for teams and organizations.

It easily integrates into your existing identity management incl. OpenID Connect, SAML, and LDAP.
As usual, your favorite cloud service remains your free choice [^1].

[^1]: Currently, we support AWS S3 and MinIO S3.

Katta consists of Katta Server and Katta Client:

* Katta Client is based on [Mountain Duck](https://mountainduck.io/),
* Katta Server is based on [Cryptomator Hub](https://github.com/cryptomator/hub/).

## Contents

* [Get an Overview](OVERVIEW.md)
* [Setup Katta Server](OVERVIEW.md)

## Comparison with Cryptomator Hub

While sharing Zero-Trust key management, Katta adds the following features to Cryptomator and Cryptomator Hub ecosystem:

* The data location is managed by Katta Server:
  * Katta Vault Creators can create vaults and
    * Katta Static Mode: the vault template (data to initialize the vault) is uploaded upon vault creation
    * Katta STS Mode: a bucket is created on behalf of the user
  * Katta Server Admins can manage the Storage Profiles in Katta Server
* Data Sync in Katta Client
* Automatic Access Grant in Katta Client


