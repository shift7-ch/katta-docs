---
title: Roles
sidebar_position: 4
description: Who can do what in Katta — the Keycloak realm roles and the per-vault roles.
---

# Roles

Katta uses the [Keycloak](../architecture/keycloak.md) realm roles `user`, `create-vaults` and `admin`, inherited from Cryptomator Hub. Vault ownership and membership are managed per vault, not through realm roles.


* Katta User: the [`user`](https://docs.cryptomator.org/hub/user-group-management/#roles) role allows to login to Katta Server Frontend
* Katta Vault Creator: [`create-vaults`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users allowed to create vault in Katta Server
* Katta Admin: [`admin`](https://docs.cryptomator.org/hub/vault-management/#create-a-vault) users have administrative permissions in the Katta Server Frontend /
  Katta Server API, they can configure the Katta Server and they can
  upload storage profiles.
* Katta Vault Member: the key material to decrypt and encrypt the vault data is shared with Vault Members. See
  also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details).
* Katta Vault Owner: the vault creator is by default the first vault owner; vault owners have access to the
  vault's [recovery code](https://docs.cryptomator.org/en/latest/hub/vault-recovery/#hub-vault-recovery);
  in addition, only vault owners can grant access to a vault, i.e. share the vault member key with new vault members. See
  also [Vault Details](https://docs.cryptomator.org/hub/vault-management/#vault-details).
* Katta Server Admin: technical administrator of the databases and the infrastructure running Katta Server; zero-trust means the data can never be decrypted by a person having access to the database
  or the server running the Katta Server or to the physical storage (unless the Katta Server admin is also a Vault Member, of course).

