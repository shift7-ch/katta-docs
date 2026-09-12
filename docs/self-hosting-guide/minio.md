---
title: MinIO
sidebar_position: 3
description: Prepare a MinIO server so Keycloak-issued tokens can be exchanged for temporary S3 credentials.
---

# MinIO

Prepare the MinIO configuration of _STS Storage Access Mode_: the two MinIO policies Katta needs, and the OIDC providers that
trust Keycloak. Do this before you upload an STS storage profile, because the profile references the resulting role ARNs.

:::info
_Static Storage Access Mode_ needs none of this. It reaches MinIO with long-lived access keys supplied at vault creation, thus you
can go straight to [Storage Profiles](../admin-guide/storage-profiles.md). The [allowed origin](#allowed-origin-for-katta-web) below applies in both storage
access modes.
:::

## Policy and OIDC Provider

Add a role for creating buckets with prefix `katta-` and uploading the vault template (`vault.uvf` and the root directory objects), as well as read/write
access to buckets through the `client_id` claim in the JWT token.

Using [Katta Admin CLI](../admin-guide/cli.md), `katta setup minio` prepares the MinIO server so Keycloak-issued tokens can be exchanged for temporary S3 credentials. It reads the
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

## Resources Created in MinIO

:::info[Sample Configuration]
These are sample configurations for resources automatically created with `katta setup minio` in MinIO for reference only.
:::

Everything below assumes the defaults `--roleNamePrefix katta-` and `--bucketPrefix katta-`. Substitute your own prefixes if you
pass different values. The command creates **no buckets, no MinIO users, no service accounts and no access keys** — only the two
canned policies. The three identity provider configurations are created by the `mc` commands it prints, not by the command itself.

### Policy `katta-createbucketpolicy`

Bound as `role_policy` to the identity providers for the `cryptomator` and `cryptomatorhub` clients, so that Katta Desktop and
Katta Web can create the vault bucket and upload the vault template.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:CreateBucket",
      "s3:GetBucketPolicy",
      "s3:PutBucketVersioning",
      "s3:GetBucketVersioning"
    ],
    "Resource": "arn:aws:s3:::katta-*"
  }, {
    "Effect": "Allow",
    "Action": "s3:PutObject",
    "Resource": ["arn:aws:s3:::katta-*/*/", "arn:aws:s3:::katta-*/*.uvf"]
  }]
}
```

The second statement is deliberately narrow. It permits only the initial upload of the vault metadata file `vault.uvf` and the
root directory objects, not writing arbitrary vault contents.

### Policy `katta-accessbucketpolicy`

Bound as `role_policy` to the identity provider for the `cryptomatorvaults` client. This is the only policy that grants read and
write access to vault contents.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:GetBucketLocation",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:GetBucketVersioning",
      "s3:ListBucketVersions"
    ],
    "Resource": "arn:aws:s3:::katta-${jwt:client_id}"
  }, {
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload"
    ],
    "Resource": "arn:aws:s3:::katta-${jwt:client_id}/*"
  }]
}
```

Scoping to a single vault happens through the `${jwt:client_id}` policy variable. When a vault is created, Katta Server adds a
protocol mapper to that vault's Keycloak client scope which sets the `client_id` claim of the exchanged access token to the vault
UUID. The policy therefore resolves to the bucket `katta-<vault-id>` of the vault the token was exchanged for. Where AWS uses a
chained role with a session tag, MinIO needs neither, because the claim already carries the vault identity.

### Identity Provider Configurations

The printed `mc admin config set` commands create one OpenID provider configuration per client, named
`identity_openid:katta-<client-id>`. Each points at the realm discovery document from `${hubUrl}/api/config` and binds one of the
two policies above:

| Provider configuration                    | Client                             | `role_policy`              | Storage profile field       |
|-------------------------------------------|------------------------------------|----------------------------|-----------------------------|
| `identity_openid:katta-cryptomator`       | `cryptomator` (Katta Desktop)      | `katta-createbucketpolicy` | `stsRoleCreateBucketClient` |
| `identity_openid:katta-cryptomatorhub`    | `cryptomatorhub` (Katta Web)       | `katta-createbucketpolicy` | `stsRoleCreateBucketHub`    |
| `identity_openid:katta-cryptomatorvaults` | `cryptomatorvaults` (vault access) | `katta-accessbucketpolicy` | `stsRoleAccessBucket`       |

The `client_secret` is a placeholder. MinIO requires the field, and the Katta clients are public. MinIO derives one `RoleARN` per
provider configuration and logs it on restart. Those three ARNs are what the storage profile references.

### On re-runs

A canned policy of the same name is replaced with the document above, so manual edits to it are lost. Passing a different
`--createBucketPolicyName` or `--accessBucketPolicyName` adds a policy under the new name rather than renaming the old one, and
existing provider configurations keep referring to the previous name until you re-run the printed `mc admin config set` commands.

## Allowed Origin for Katta Web

Katta Web talks to the MinIO endpoint directly from the browser, so MinIO has to return the Katta Web origin in its CORS response headers. This applies in
both storage access modes.

MinIO does not implement the bucket CORS API — see
[MinIO — Unsupported S3 Bucket APIs](https://min.io/docs/minio/linux/operations/concepts/thresholds.html#unsupported-s3-bucket-apis) — so the allowed origin is
a server-wide setting rather than a property of the bucket. Set it in the environment of the MinIO server:

```bash
export MINIO_API_CORS_ALLOW_ORIGIN=https://your-katta-server.example.com
```

The value takes a comma-separated list of origins. On a running server, the same setting can be applied without a restart:

```bash
mc admin config set <alias> api "cors_allow_origin=https://your-katta-server.example.com"
```

:::warning
Avoid the wildcard `*` here. MinIO then echoes the requesting origin together with `Access-Control-Allow-Credentials: true`, unless
`MINIO_API_CORS_ALLOW_CREDENTIALS_WITH_WILDCARD` is turned off.
:::

## Reference

* [MinIO OpenID Connect Access Management](https://min.io/docs/minio/linux/administration/identity-access-management/oidc-access-management.html)
* [MinIO Client Reference `mc admin config set`](https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-config-set.html)
* [MinIO Security Token Service `AssumeRoleWithWebIdentity`](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html)


## Next step

Upload a matching storage profile with the role ARNs MinIO logged on restart — see
[Storage Profiles](../admin-guide/storage-profiles.md) in the Admin Guide.
