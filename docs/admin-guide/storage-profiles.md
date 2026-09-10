---
title: Storage Profiles
sidebar_position: 2
description: Define where users can create vaults — upload an AWS S3 or MinIO storage profile in Static or STS Storage Access Mode.
---

# Storage Profiles

This guide shows how to create a storage profile using the [Admin CLI](cli.md). Katta Storage Profiles are created by administrators to define the available storage locations for users to create vaults in, e.g.

* STS or Static [Storage Access Mode](../concepts.md#s3-storage-access)
* S3 endpoint
* Default region and available regions
* Provider-specific settings (e.g. [path-style-requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html#path-style-access))

Katta Server Admins can define the storage profiles according to their infrastructure, e.g. a company uses AWS and restricts vault creation to some zones,
another company uses a low-cost S3 provider supporting only _Static Storage Access Mode_,
and yet another company has their own [MinIO](../self-hosting-guide/minio.md) deployment.

:::warning
Uploading a profile requires the `admin` role.
:::

:::info[Before you start]
An _STS Storage Access Mode_ profile references IAM roles that must already exist. Prepare them first — see
[AWS S3](../self-hosting-guide/aws.md) or [MinIO](../self-hosting-guide/minio.md) in the Self-Hosting Guide.
_Static Storage Access Mode_ needs no such preparation.
:::


## AWS S3, STS Storage Access Mode

:::warning[Environment]
The example below assumes the following variables set in your environment:
```bash
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
export TOKEN_URL=${REALM_URL}/protocol/openid-connect/token
export AUTH_URL=${REALM_URL}/protocol/openid-connect/auth
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export AWS_ACCOUNT_ID=[your AWS Account ID]
```
:::

Uploads an STS storage profile to Katta Server. The command derives the role ARNs from `--awsAccountId`
and `--roleNamePrefix` (default `katta-`), so they must match the roles created by [`katta setup aws`](../self-hosting-guide/aws.md#oidc-provider-and-roles). 
- `--region` is the region pre-selected in the client
- `--regions` the list of regions a vault creator may choose from
- `--bucketPrefix` (default `katta-`) must match the prefix used in the IAM policies.

:::tip
Alternatively, creating storage profiles in Katta Web is also supported for users with the admin role.
:::

Once the profile exists, users with the `create-vaults` role can create vaults for it. The client obtains short-lived bucket-creation
credentials from AWS STS with its OIDC access token. Katta Desktop then creates the bucket itself; in Katta Web the browser hands
those credentials to Katta Server, which creates the bucket on the user's behalf. The command prints the created profile as JSON.

:::info
Authentication uses the browser-based Authorization Code flow unless `--accessToken` is supplied.
:::

```bash
katta storageprofile aws sts --tokenUrl "${TOKEN_URL}" --authUrl "${AUTH_URL}" --hubUrl "${HUB_URL}" --name "AWS S3 STS" --awsAccountId "${AWS_ACCOUNT_ID}" --region "eu-central-1" --regions "eu-central-1"
```

## AWS S3, Static Storage Access Mode

:::warning[Environment]
The example below assumes the following variables set in your environment:
```bash
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
```
:::

Uploads a static storage profile to Katta Server. _Static Storage Access Mode_ needs no OIDC provider or
IAM roles — S3 is reached with long-lived access keys that the vault creator supplies when creating the vault. Use this for an
existing bucket, or when STS is not an option. `--region`/`--regions` and `--bucketPrefix` have the same meaning as for the STS
profile. The command prints the created profile as JSON.

```bash
katta storageprofile aws static --hubUrl "${HUB_URL}" --name "AWS S3 Static" --region "eu-west-1" --regions "eu-west-1" --regions "eu-west-2" --regions "eu-west-3"
```

:::tip
For a generic S3-compatible (non-AWS) endpoint, use `katta storageprofile s3 static` instead, which additionally requires `--endpointUrl`.
:::

## MinIO, STS Storage Access Mode

:::warning[Environment]
The example below assumes the following variables set in your environment:
```bash
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export MINIO_URL=[your MinIO URL, e.g. http://localhost:9000]
```
:::

Create an STS storage profile. Pass the endpoint URL and the three role ARNs logged by MinIO on restart (one each for the
  `cryptomator`, `cryptomatorhub` and `cryptomatorvaults` clients). MinIO scopes bucket access per vault through the
  `${jwt:client_id}` policy variable and does not support role chaining or tagged sessions, so the AWS-only fields
  (`stsRoleAccessBucketAssumeRoleTaggedSession`, `stsSessionTag`) are left unset.

```bash
katta storageprofile minio sts --hubUrl "${HUB_URL}" --name "MinIO S3 STS" --endpointUrl "${MINIO_URL}" --region "us-east-1" \
  --stsRoleCreateBucketClient "arn:minio:iam:::role/…" \
  --stsRoleCreateBucketHub "arn:minio:iam:::role/…" \
  --stsRoleAccessBucket "arn:minio:iam:::role/…"
```

## MinIO, Static Storage Access Mode

Create a static storage profile for a MinIO endpoint reached with long-lived access keys.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" --name "MinIO S3 Static" --endpointUrl "${MINIO_URL}" --region "us-east-1"
```
