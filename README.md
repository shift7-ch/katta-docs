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

The following table gives an overview of what Katta adds to Cryptomator Hub:

| Feature                             | Cryptomator Hub | Katta |
|-------------------------------------|-----------------|-------|
| Zero-Trust key management           | ✅               | ✅     |
| Storage configuration and data sync | ❌               | ✅     |
| Automatic access grant              | ❌               | ✅     |
