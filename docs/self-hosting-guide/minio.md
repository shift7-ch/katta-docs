---
title: MinIO
sidebar_position: 3
description: Prepare a MinIO server so Keycloak-issued tokens can be exchanged for temporary S3 credentials.
---

# MinIO

This page prepares the MinIO side of _STS Storage Access Mode_: the two MinIO policies Katta needs, and the OIDC providers that
trust Keycloak. Do this before you upload an STS storage profile, because the profile references the resulting role ARNs.

:::info
_Static Storage Access Mode_ needs none of this. It reaches MinIO with long-lived access keys supplied at vault creation, thus you
can go straight to [Storage Profiles](../admin-guide/storage-profiles.md).
:::

## Reference


* [MinIO OpenID Connect Access Management](https://min.io/docs/minio/linux/administration/identity-access-management/oidc-access-management.html)
* [MinIO Client Reference `mc admin config set`](https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-config-set.html)
* [MinIO Security Token Service `AssumeRoleWithWebIdentity`](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html)

## Policy and OIDC Provider

Add a role for creating buckets with prefix `katta-` and uploading the vault template (`vault.uvf` and the root directory objects), as well as read/write
access to buckets through the `client_id` claim in the JWT token.

`katta setup minio` prepares the MinIO server so Keycloak-issued tokens can be exchanged for temporary S3 credentials. It reads the
Keycloak URL, realm and client IDs from `${hubUrl}/api/config` and then creates (or updates) two MinIO policies via the MinIO Admin API:
* a **bucket creation** policy (`--createBucketPolicyName`, default `katta-createbucketpolicy`) allowing `s3:CreateBucket` and
  versioning/policy reads on `arn:aws:s3:::katta-*` plus `s3:PutObject` for the vault template (`katta-*/*/` and `katta-*/*.uvf`),
  restricted to the configured bucket prefix;
* a **bucket access** policy (`--accessBucketPolicyName`, default `katta-accessbucketpolicy`) granting read/write on
  `arn:aws:s3:::katta-${jwt:client_id}`. MinIO scopes bucket access per vault through the `${jwt:client_id}` policy variable and
  does not support role chaining or tagged sessions.

:::tip
It is idempotent — re-run it to pick up policy changes.
:::

:::tip
Requires MinIO admin credentials, passed with `--accessKey` / `--secretKey`.
:::

:::info
The MinIO Admin API used by the Katta Admin CLI (through `minio-java`) cannot configure an OpenID identity provider — the
`set-config-kv` endpoint expects an encrypted payload that `minio-java` does not implement (unlike `minio-go`/`mc`), and
`minio/minio` has been archived read-only since April 2026. `katta setup minio` therefore does **not** register the OIDC
providers itself. It prints the `mc alias set`, `mc admin config set … identity_openid:${roleNamePrefix}${clientId}` (one
provider per client) and `mc admin service restart` commands for you to run against the MinIO server.
:::

```bash
export MINIO_ROOT_USER=
export MINIO_ROOT_PASSWORD=
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export MINIO_URL=[your MinIO URL, e.g. http://localhost:9000]
katta setup minio --hubUrl "${HUB_URL}" --endpointUrl "${MINIO_URL}" --accessKey "${MINIO_ROOT_USER}" --secretKey "${MINIO_ROOT_PASSWORD}"
```


Then run the commands it prints. They look like this (client IDs and the Keycloak discovery URL are taken from
`${hubUrl}/api/config`):

```bash
mc alias set myminio "${MINIO_URL}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

mc admin config set myminio identity_openid:katta-cryptomator \
    config_url="https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration" \
    client_id="cryptomator" \
    client_secret="ignore-me" \
    role_policy="katta-createbucketpolicy"
mc admin config set myminio identity_openid:katta-cryptomatorhub \
    config_url="https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration" \
    client_id="cryptomatorhub" \
    client_secret="ignore-me" \
    role_policy="katta-createbucketpolicy"
mc admin config set myminio identity_openid:katta-cryptomatorvaults \
    config_url="https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration" \
    client_id="cryptomatorvaults" \
    client_secret="ignore-me" \
    role_policy="katta-accessbucketpolicy"
mc admin service restart myminio
```

MinIO prints the generated `RoleARN` for each configured provider to its server log on (re)start — look for lines such as
`RoleARN: arn:minio:iam:::role/…`. Inspect the stored provider config with `mc admin config get myminio identity_openid`.

## Next step

Upload a matching storage profile with the role ARNs MinIO logged on restart — see
[Storage Profiles](../admin-guide/storage-profiles.md) in the Admin Guide.
