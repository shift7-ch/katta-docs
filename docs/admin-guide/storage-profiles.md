---
title: Storage Profiles
sidebar_position: 2
description: Define where users can create vaults — upload an AWS S3 or MinIO storage profile in Static or STS Storage Access Mode.
---

# Storage Profiles

This guide shows how to create a storage profile using the [Admin CLI](cli.md). Katta Storage Profiles are created by administrators to define the available storage locations for users to create vaults in, e.g.

* STS or Static [Storage Access Mode](../concepts.md#s3-storage)
* S3 endpoint
* Default region and available regions

Administrators can define the storage profiles according to their infrastructure, e.g. a company uses AWS and restricts vault creation to some zones,
another company uses a low-cost S3 provider supporting only _Static Storage Access Mode_,
and yet another company has their own [MinIO](../self-hosting-guide/minio.md) deployment.

:::warning
Configuring a storage profile requires the `admin` role.
:::


## AWS S3
### STS Storage Access Mode

:::info[Before you start]
An _STS Storage Access Mode_ profile references IAM roles that must already exist. Prepare them first — see
[AWS S3](../self-hosting-guide/aws.md). _Static Storage Access Mode_ needs no such preparation.
:::

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

### Static Storage Access Mode

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

## MinIO
### STS Storage Access Mode

:::info[Before you start]
An _STS Storage Access Mode_ profile references IAM roles that must already exist. Prepare them first — see
[MinIO](../self-hosting-guide/minio.md). _Static Storage Access Mode_ needs no such preparation.
:::

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

## Generic S3 Provider
### Static Storage Access Mode

Any provider with an S3-compatible API can be used to store vaults in _Static Storage Access Mode_. The vault creator
supplies long-lived access keys, and no OpenID Connect identity provider (OIDC) or role setup is required on the storage
side.

Four options of `katta storageprofile s3 static` determine how buckets are located in the storage provider.

* `--endpointUrl` is a fixed hostname. It is **not** rewritten per region and it must **not** contain a bucket name.
* `--region` is used both as the AWS Signature Version 4 signing region and as the `LocationConstraint` sent when a
  bucket is created. It has to be the region name the provider expects for buckets in the configured endpoint.
* `--bucketPrefix` defaults to `katta-` and is prepended to the vault UUID to form the bucket name.
* `--name` assign a custom storage profile name. Defaults to `S3 (Static) Storage Profile <endpointUrl>`

:::tip
Almost every provider below serves each region under its own hostname. Because a storage profile carries a single endpoint,
create one storage profile per region and give it a name that includes the region.
:::

### S3 Bucket CORS Settings

The bucket S3 endpoint must allow requests from the Katta Web origin. Create the bucket and set its CORS 
configuration **before** creating the vault in Katta Web with a _Static Storage Access Mode_ storage profile.

:::note[Providers with a permissive default policy]
Some providers answer with a wildcard CORS policy for every bucket and do not need any configuration. Wasabi, for example, returns `Access-Control-Allow-Origin: *` along with the methods and the `Etag` header required for the vault template upload. The wildcard origin is sufficient here because the requests are signed with headers rather than cookies.

Send a preflight request to the bucket endpoint to check what a provider returns:

```bash
curl -s -i -X OPTIONS "https://s3.example.com/<bucket-name>/" \
  -H "Origin: https://your-katta-web.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```
:::

:::warning
Some S3 providers do not support configuring bucket for CORS required to create buckets in Katta Web:

- Any provider built on OpenStack Swift S3-compat layer.
- For [MinIO](../self-hosting-guide/minio.md) instead set the allowed origin globally when starting the server:

  ```bash
  export MINIO_API_CORS_ALLOW_ORIGIN=https://your-katta-server.example.com
  ```
:::

The sample below is using [AWS CLI](https://aws.amazon.com/cli/):

:::tip[Environment]
For an S3-compatible provider other than AWS, point the CLI at the custom endpoint and pass the credentials through the environment:

```bash
export AWS_ACCESS_KEY_ID=<access-key>
export AWS_SECRET_ACCESS_KEY=<secret-key>
export AWS_SESSION_TOKEN=<session-token>   # only for temporary credentials
export AWS_REGION=<region>
export AWS_ENDPOINT_URL_S3=https://s3.example.com
```
:::

```bash
aws s3api put-bucket-cors \
  --bucket <bucket-name> \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["https://your-katta-web.example.com"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2", "x-amz-version-id"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'
```

## Setup Instructions for Common S3 Providers

:::warning[Environment]
All examples assume the Katta Server URL is exported once.

```bash
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
```
:::

### Wasabi

Endpoints follow `https://s3.<region>.wasabisys.com` and the signing region is the region in the hostname. Wasabi
documents
path-style requests as the recommended form.

:::tip
Wasabi returns a wildcard CORS policy out of the box, so buckets need no CORS setup.
:::

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Wasabi (eu-central-1)" \
  --endpointUrl "https://s3.eu-central-1.wasabisys.com" \
  --region "eu-central-1"
```

Available regions: `us-east-1`, `us-east-2`, `us-central-1`, `us-west-1`, `us-west-2`, `ca-central-1`, `eu-west-1`,
`eu-west-2`,
`eu-west-3`, `eu-central-1`, `eu-central-2`, `eu-south-1`, `ap-northeast-1`, `ap-northeast-2`, `ap-southeast-1`,
`ap-southeast-2`.

* [Wasabi Service URLs for Storage Regions](https://docs.wasabi.com/docs/service-urls-for-wasabis-storage-regions)

### Scaleway

Endpoints follow `https://s3.<region>.scw.cloud`. Access keys are created per project in the Scaleway console.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Scaleway Object Storage (fr-par)" \
  --endpointUrl "https://s3.fr-par.scw.cloud" \
  --region "fr-par"
```

Available regions: `fr-par` (Paris), `nl-ams` (Amsterdam), `pl-waw` (Warsaw).

* [Scaleway Object Storage Endpoints](https://www.scaleway.com/en/docs/object-storage/api-cli/object-storage-aws-cli/)

### DigitalOcean Spaces

Endpoints follow `https://<region>.digitaloceanspaces.com` and the region is the datacenter name. Spaces access keys are
generated
under API in the DigitalOcean control panel and are account-wide.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "DigitalOcean Spaces (fra1)" \
  --endpointUrl "https://fra1.digitaloceanspaces.com" \
  --region "fra1"
```

Available regions: `nyc3`, `sfo2`, `sfo3`, `ams3`, `sgp1`, `fra1`, `blr1`, `syd1`.

* [DigitalOcean Spaces with AWS S3 SDKs](https://docs.digitalocean.com/products/spaces/reference/aws-sdks/)

### Backblaze B2

The S3-compatible endpoint follows `https://s3.<region>.backblazeb2.com`. The region is the one shown next to the bucket
endpoint in
the Backblaze account, for example `eu-central-003`.

:::warning[Application Keys]
Bucket-restricted application keys cannot create buckets, so the
bucket creation pair has to be a key that covers all buckets.
:::

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Backblaze B2 (eu-central-003)" \
  --endpointUrl "https://s3.eu-central-003.backblazeb2.com" \
  --region "eu-central-003"
```

* [Backblaze B2 S3-Compatible API](https://www.backblaze.com/docs/cloud-storage-s3-compatible-api)

### Cloudflare R2

The endpoint contains the Cloudflare account ID and there is no per-region hostname. R2 expects `auto` as the signing
region and
accepts it as a location constraint, so a single profile covers the whole account.

```bash
export CLOUDFLARE_ACCOUNT_ID=[your Cloudflare account ID]
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Cloudflare R2" \
  --endpointUrl "https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --region "auto"
```

* [Cloudflare R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)

### Exoscale

Endpoints follow `https://sos-<zone>.exo.io` and the signing region is the zone name.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Exoscale SOS (ch-gva-2)" \
  --endpointUrl "https://sos-ch-gva-2.exo.io" \
  --region "ch-gva-2"
```

Available zones: `ch-gva-2`, `ch-dk-2`, `at-vie-1`, `at-vie-2`, `de-fra-1`, `de-muc-1`, `bg-sof-1`, `hr-zag-1`.

* [Exoscale Object Storage](https://community.exoscale.com/product/storage/object-storage/quick-start/)

### Infomaniak

Infomaniak serves several independent S3 endpoints and expects `us-east-1` as the signing region on all of them.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Infomaniak Public Cloud" \
  --endpointUrl "https://s3.pub1.infomaniak.cloud" \
  --region "us-east-1"
```

Public Cloud endpoints are `https://s3.pub1.infomaniak.cloud` and `https://s3.pub2.infomaniak.cloud`. Swiss Backup
endpoints follow
`https://s3.swiss-backup0N.infomaniak.com`, where the number is shown in the Infomaniak manager for the subscribed
instance.

* [Infomaniak Object Storage over S3](https://docs.infomaniak.cloud/documentation/06.object-storage/01.s3/)
* [Infomaniak Swiss Backup over S3](https://www.infomaniak.com/en/support/faq/2519/swiss-backup-connect-object-storage-with-s3-protocol)

### Hetzner

Endpoints follow `https://<location>.your-objectstorage.com` and the signing region is the location.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "Hetzner Object Storage (fsn1)" \
  --endpointUrl "https://fsn1.your-objectstorage.com" \
  --region "fsn1"
```

Available locations: `fsn1` (Falkenstein), `nbg1` (Nuremberg), `hel1` (Helsinki).

* [Hetzner Object Storage](https://docs.hetzner.com/storage/object-storage/overview)

### OVHcloud

Endpoints follow `https://s3.<region>.io.cloud.ovh.net` and the signing region is the region in the hostname. US regions
are served
under `io.cloud.ovh.us` instead.

```bash
katta storageprofile s3 static --hubUrl "${HUB_URL}" \
  --name "OVHcloud Object Storage (gra)" \
  --endpointUrl "https://s3.gra.io.cloud.ovh.net" \
  --region "gra"
```

Available regions include `gra`, `sbg`, `rbx`, `bhs`, `de`, `uk`, `waw`, `sgp`, `eu-west-par`, `eu-south-mil`,
`ca-east-tor`, `ap-south-mum` and `ap-southeast-syd`.

* [OVHcloud Object Storage S3 Endpoints](https://help.ovhcloud.com/csm/en-public-cloud-storage-s3-getting-started?id=kb_article_view&sysparm_article=KB0047308)

### Further Providers

The same command works for any other S3-compatible endpoint. Substitute the endpoint and region below into the Wasabi
example.

| Provider                       | Endpoint                                             | Region                                         |
|--------------------------------|------------------------------------------------------|------------------------------------------------|
| Akamai (Linode) Object Storage | `https://<region>.linodeobjects.com`                 | region in the hostname, e.g. `eu-central-1`    |
| Fastly Object Storage          | `https://<region>.object.fastlystorage.app`          | `us-east`, `us-west`, `eu-central`             |
| Impossible Cloud               | `https://<region>.storage.impossibleapi.net`         | region in the hostname, e.g. `eu-central-2`    |
| IONOS Cloud Object Storage     | `https://s3-eu-central-1.ionoscloud.com` (Frankfurt) | `de`, and elsewhere the region in the hostname |
| Storadera                      | `https://s3.<region>.storadera.com`                  | region in the hostname, e.g. `eu-central-1`    |
| Storj                          | `https://gateway.storjshare.io`                      | `auto`                                         |
| Synology C2 Object Storage     | `https://<region>.s3.synologyc2.net`                 | region in the hostname, e.g. `eu-001`          |
| Tigris                         | `https://fly.storage.tigris.dev`                     | `auto`                                         |


## Archiving a Storage Profile

The command prints the created profile as JSON, including the `id` assigned by Katta Server. Storage profiles are
immutable. To
correct one, archive it and upload a replacement. Archiving hides the profile from vault creation and leaves existing
vaults intact.

```bash
katta storageprofile archive --hubUrl "${HUB_URL}" --uuid "[profile id from the JSON output]"
```
