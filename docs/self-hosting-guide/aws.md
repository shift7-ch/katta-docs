---
title: AWS S3
sidebar_position: 2
description: Prepare an AWS account so Keycloak-issued tokens can be exchanged for temporary S3 credentials.
---

# AWS S3

Prepare the AWS configuration of [_STS Storage Access Mode_](../concepts.md#s3-storage-access): the OIDC trust between Keycloak and AWS IAM, and the roles Katta assumes. This setup is required before you upload an [STS storage profile](../admin-guide/storage-profiles.md), because the storage profile references these roles.

:::info
_Static Storage Access Mode_ needs none of this. It reaches S3 with long-lived access keys supplied at vault creation, thus you can
go straight to [Storage Profiles](../admin-guide/storage-profiles.md).
:::

## OIDC Provider and Roles

Using [Katta Admin CLI](../admin-guide/cli.md), `katta setup aws` prepares the AWS account so Keycloak-issued tokens can be exchanged for
temporary S3 credentials:

* registers (or updates) the Keycloak realm as an OpenID Connect identity provider in AWS IAM for the `cryptomator`, `cryptomatorhub`
  and `cryptomatorvaults` clients, refreshing the TLS thumbprints;
* creates the IAM roles and policies for **bucket creation** (restricted to the configured bucket prefix) and for **bucket access**
  via role chaining with tagged sessions, restricted to a single S3 bucket used for the vault.

:::tip
It is idempotent — re-run it to pick up renewed Keycloak TLS certificates or policy changes.
:::

:::tip
Requires AWS credentials with IAM permissions in the environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, or an AWS profile).
:::

```bash
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export AWS_SESSION_TOKEN=
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
katta setup aws --realmUrl "${REALM_URL}"
```

:::tip
The `katta` command prints the equivalent `aws iam …` for the API calls it performs.
:::

## Resources Created in AWS

:::info[Sample Configuration]
These are sample configurations for resources automatically created with `katta setup aws` in AWS for reference only.
:::

Everything below is created with the defaults `--roleNamePrefix katta-` and `--bucketPrefix katta-`. Substitute your own
prefixes if you pass different values. The command creates **no buckets, no IAM users and no access keys** — only one identity
provider and three roles, each with a single inline policy of the same name as the role.

### Identity Provider

An IAM OpenID Connect identity provider for the Keycloak realm:

|              |                                                                                                                                                |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| ARN          | `arn:aws:iam::<account-id>:oidc-provider/keycloak.example.com/realms/cryptomator`                                                              |
| Provider URL | the value of `--realmUrl`, without trailing slash                                                                                              |
| Audiences    | `cryptomator` (Katta Desktop), `cryptomatorhub` (Katta Web), `cryptomatorvaults` (bucket creation from Katta Web) — override with `--clientId` |
| Thumbprint   | SHA-1 fingerprint of the last certificate in the TLS chain served by the realm URL                                                             |

If a provider for the same URL already exists and its audience list covers all requested client IDs, only the thumbprint is
refreshed. If the audience list differs, the provider is deleted and recreated with the full list. The ARN is derived from the
provider URL and therefore stays the same across recreation.

### Role `katta-create-bucket`

Assumed by Katta Desktop and by Katta Server with an OIDC access token to create the vault bucket and upload the vault template.
Its ARN goes into the storage profile fields `stsRoleCreateBucketClient` and `stsRoleCreateBucketHub`.

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<account-id>:oidc-provider/keycloak.example.com/realms/cryptomator"},
    "Action": "sts:AssumeRoleWithWebIdentity"
  }]
}
```

Inline permission policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:CreateBucket",
      "s3:GetBucketPolicy",
      "s3:PutBucketVersioning",
      "s3:GetBucketVersioning",
      "s3:GetAccelerateConfiguration",
      "s3:PutAccelerateConfiguration",
      "s3:GetEncryptionConfiguration",
      "s3:PutEncryptionConfiguration"
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

### Role `katta-access-bucket-web-identity-role`

First hop of the role chain. Assumed with an OIDC access token, it may do nothing but assume the second role with a session tag.
Its ARN goes into the storage profile field `stsRoleAccessBucketAssumeRoleWithWebIdentity`.

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<account-id>:oidc-provider/keycloak.example.com/realms/cryptomator"},
    "Action": ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"]
  }]
}
```

Inline permission policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["sts:AssumeRole", "sts:TagSession"],
    "Resource": "arn:aws:iam::<account-id>:role/katta-access-bucket-tagged-session-role"
  }]
}
```

### Role `katta-access-bucket-tagged-session-role`

Second hop of the role chain and the only role that can read and write vault contents. The client passes the vault UUID as the
session tag `Vault`, so the resulting credentials reach exactly the bucket `katta-<vault-id>` and nothing else. Its ARN goes into
the storage profile field `stsRoleAccessBucketAssumeRoleTaggedSession`, and `stsSessionTag` is set to `Vault`.

Trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"AWS": "arn:aws:iam::<account-id>:role/katta-access-bucket-web-identity-role"},
    "Action": ["sts:AssumeRole", "sts:TagSession"],
    "Condition": {
      "ForAnyValue:StringEquals": {"sts:TransitiveTagKeys": "${aws:RequestTag/Vault}"}
    }
  }]
}
```

Inline permission policy:

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
    "Resource": "arn:aws:s3:::katta-${aws:PrincipalTag/Vault}"
  }, {
    "Effect": "Allow",
    "Action": [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListMultipartUploadParts",
      "s3:AbortMultipartUpload"
    ],
    "Resource": "arn:aws:s3:::katta-${aws:PrincipalTag/Vault}/*"
  }]
}
```

### On re-runs

For a role that already exists, both its trust policy and its inline policy are overwritten with the documents above. Manual edits
to those policies are lost. `--maxSessionDuration` is applied only when a role is created; on an existing role the session duration
stays as it is, and AWS defaults to one hour for a role created without the option.

## Next step

Upload a matching storage profile — see [Storage Profiles](../admin-guide/storage-profiles.md) in the Admin Guide.
