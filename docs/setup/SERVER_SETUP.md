---
id: server-setup
title: Server Setup
sidebar_position: 1
---

# Server Setup

:::note
This document describes step-by-step how to set up Katta Server including the configuration of a storage provider, covering:

* Storage providers: MinIO and AWS
* Modes: Static and STS Storage Access Mode.
  See the [Katta Overview](arch/OVERVIEW.md) for a conceptual overview.
:::

## Deploying Katta Server

Katta Server (backend, web frontend, and Keycloak) is deployed independently of the storage provider integration described on the
rest of this page. Its configuration follows the upstream [Cryptomator Hub setup](https://docs.cryptomator.org/hub/); the following
options are available:

:::note
A managed Katta Server, hosted and maintained by shift7 GmbH, is not currently available. Katta Server must be self-hosted using one
of the options below.
:::

### Terraform (AWS)

[katta-terraform](https://github.com/shift7-ch/katta-terraform) provisions a complete Katta Server deployment on AWS: VPC and
networking, Application Load Balancers, an ECS cluster running Keycloak and the Katta Server backend, RDS PostgreSQL databases,
Route53 records and ACM certificates, and an ECR pull-through cache for the container images.

Prerequisites: a domain registered in AWS Route53, Docker, and the AWS CLI with configured credentials. Deployment parameters
(`dns_suffix`, database passwords, client secrets, `github_token`, …) are supplied as `TF_VAR_*` environment variables or a
`terraform.tfvars` file.

```bash
terraform workspace new katta
terraform init
terraform validate
terraform plan
terraform apply --auto-approve
```

Tear the deployment down with `terraform destroy --auto-approve` (note the 7-day grace period on AWS Secrets Manager deletions).

See [katta-terraform](https://github.com/shift7-ch/katta-terraform) for the full variable reference and for example CSP and
`application.properties` settings ([ecs.tf](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf)).

### Helm chart (Kubernetes)

The [katta-server](https://github.com/shift7-ch/katta-server) repository ships a Helm chart, published as an OCI artifact at
`ghcr.io/shift7-ch/charts/katta-server`. It deploys the Katta Server backend (required) and, enabled by default, Keycloak and
PostgreSQL; a bundled MinIO can optionally be enabled for demos. Chart signatures can be verified with `cosign`.

Local demo on a single-node cluster (kind, minikube, k3d, Docker Desktop) with the bundled MinIO, using the `values-demo.yaml` from
a checkout of the repository:

```bash
minikube addons enable ingress
helm install katta chart \
  --namespace katta \
  --create-namespace \
  -f chart/values-demo.yaml
```

Production deployment behind an existing ingress controller:

```bash
helm install katta oci://ghcr.io/shift7-ch/charts/katta-server \
  --namespace katta \
  --create-namespace \
  --wait --timeout 5m \
  --set urls.hub.public=https://hub.example.com \
  --set urls.kc.public=https://kc.example.com \
  --set ingress.controller=traefik \
  --set hub.admin.password=changeme
```

Key values sections: `urls` (public hostnames for Hub, Keycloak, and the S3 API — `urls.s3.public` must be a dedicated host served
at the root), `ingress` (`nginx` or `traefik`, TLS), `hub` (database connection, admin credentials, telemetry), `keycloak` (realm
bootstrap), `postgres` and `minio` (can be disabled to use external services, e.g. via `hub.database.jdbcUrl`). See the
[chart README](https://github.com/shift7-ch/katta-server/chart) for the complete values reference.

### Docker Compose

For local testing, the `demo` profile in the [Docker Compose Configuration File](https://github.com/shift7-ch/katta-clientlib/blob/main/test/src/test/resources/docker-compose-hub-keycloak-minio.yml)
brings up Katta Server, Keycloak, and MinIO together with a matching set of storage-profile and setup JSON files under
[setup](https://github.com/shift7-ch/katta-clientlib/tree/main/test/src/test/resources/setup/).

* [One-Stop Shop Demo with Docker Compose](https://github.com/shift7-ch/katta-clientlib#one-stop-shop-demo-with-docker-compose)

### Configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)

## Storage Provider Setup

Supported storage backend configurations are:

- **Static Storage Access Mode** AWS S3 or generic S3-compatible provider accessed using static access keys
- **STS Storage Access Mode** AWS S3 accessed using AWS Security Token Service (STS) or MinIO issuing temporary access keys from OIDC access token obtained by user from Keycloak identity provider (OIDC).

### Katta Admin CLI Usage

Use [Katta Admin CLI]( https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme) to configure a Katta Server including its S3 storage backend. Use `--help` to print available commands.

```bash
katta --help
Usage: katta [-h] [-V] [COMMAND]
  -h, --help      Show this help message and exit.
  -V, --version   Print version information and exit.
Commands:
  setup           Setup Storage Provider Integration
  storageprofile  Configure Storage Location
  accesstoken     Get access token using authorization code flow.
  completion      Generate a bash completion script for the katta CLI.
  help            Display help information about the specified command.
```

Run `--help` on commands for the full option list:

```shell
katta storageprofile minio sts --help
katta storageprofile s3 static --help
```

### Setup AWS

Setting up AWS as a storage provider takes two steps: configure the AWS-side trust and roles (only for _STS Storage Access Mode_), then
upload a matching storage profile to Katta Server. Run the steps in this order — the storage profile references the roles created in
the first step.

#### OIDC Provider and Roles

:::info
Only required for _STS Storage Access Mode_.
:::

`katta setup aws` prepares the AWS account so Keycloak-issued tokens can be exchanged for
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

:::tip
The `katta` command prints the equivalent `aws iam …` for the API calls it performs.
:::

```bash
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export AWS_SESSION_TOKEN=
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
katta setup aws --realmUrl "${REALM_URL}"
```

### AWS S3 Storage Profile for STS Access Mode

Uploads an STS storage profile to Katta Server (requires the `admin` role). The command derives the role ARNs from `--awsAccountId`
and `--roleNamePrefix` (default `katta-`), so they must match the roles created by `katta setup aws`. `--region` is the region
pre-selected in the client, `--regions` the list of regions a vault creator may choose from; `--bucketPrefix` (default `katta-`) must
match the prefix used in the IAM policies.

:::tip
Alternatively, creating storage profiles in Katta Web is also supported for users with the admin role.
:::

Once the profile exists, users with the `create-vault` role can create vaults for it: Katta Server provisions the S3 bucket on the fly
and hands out short-lived STS credentials scoped to that single bucket. The command prints the created profile as JSON.

:::info
Authentication uses the browser-based Authorization Code flow unless `--accessToken` is supplied.
:::

```bash
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
export TOKEN_URL=${REALM_URL}/protocol/openid-connect/token
export AUTH_URL=${REALM_URL}/protocol/openid-connect/auth
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export AWS_ACCOUNT_ID=[your AWS Account ID]
katta storageprofile aws sts --tokenUrl "${TOKEN_URL}" --authUrl "${AUTH_URL}" --hubUrl "${HUB_URL}" --name "AWS S3 STS" --awsAccountId "${AWS_ACCOUNT_ID}" --region "eu-central-1" --regions "eu-central-1"
```

### AWS S3 Storage Profile for Static Access Mode

Uploads a static storage profile to Katta Server (requires the `admin` role). _Static Storage Access Mode_ needs no OIDC provider or
IAM roles — S3 is reached with long-lived access keys that the vault creator supplies when creating the vault. Use this for an
existing bucket, or when STS is not an option. `--region`/`--regions` and `--bucketPrefix` have the same meaning as for the STS
profile. The command prints the created profile as JSON.

```bash
katta storageprofile aws static --hubUrl "${HUB_URL}" --name "AWS S3 Static" --region "eu-west-1" --regions "eu-west-1" --regions "eu-west-2" --regions "eu-west-3"
```

:::tip
For a generic S3-compatible (non-AWS) endpoint, use `katta storageprofile s3 static` instead, which additionally requires `--endpointUrl`.
:::

### Setup MinIO

Documentation

* [MinIO OpenID Connect Access Management](https://min.io/docs/minio/linux/administration/identity-access-management/oidc-access-management.html)
* [MinIO Client Reference `mc idp openid`](https://min.io/docs/minio/linux/reference/minio-mc/mc-idp-openid.html)
* [MinIO Security Token Service `AssumeRoleWithWebIdentity`](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html)

#### Policy and OIDC Provider

Add a role for creating buckets with prefix `katta` and uploading the vault template (`vault.uvf` and the root directory objects), as well as read/write
access to buckets through the `client_id` claim in the JWT token.

:::info
Only required for _STS Storage Access Mode_.
:::

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
Because the MinIO Client (`mc`) API is incomplete ([minio/minio#16151](https://github.com/minio/minio/issues/16151)), `katta setup
minio` does **not** register the OIDC providers itself. It prints the `mc alias set`, `mc idp openid add` (one provider per client,
named `${roleNamePrefix}${clientId}`) and `mc admin service restart` commands for you to run against the MinIO server. See
[Setup MinIO](#setup-minio-1) below for the manual `mc` steps.
:::

```bash
export MINIO_ROOT_USER=
export MINIO_ROOT_PASSWORD=
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export MINIO_URL=[your MinIO URL, e.g. http://localhost:9000]
katta setup minio --hubUrl "${HUB_URL}" --endpointUrl "${MINIO_URL}" --accessKey "${MINIO_ROOT_USER}" --secretKey "${MINIO_ROOT_PASSWORD}"
```

### MinIO S3 Storage Profile for STS Access Mode

Create an STS storage profile. Pass the endpoint URL and the three role ARNs from `mc idp openid ls` (one each for
  the `cryptomator`, `cryptomatorhub` and `cryptomatorvaults` clients). MinIO scopes bucket access per vault through the
  `${jwt:client_id}` policy variable and does not support role chaining or tagged sessions, so the AWS-only fields
  (`stsRoleAccessBucketAssumeRoleTaggedSession`, `stsSessionTag`) are left unset.

```bash
katta storageprofile minio sts
```

### MinIO S3 Storage Profile for Static Access Mode

Create a static storage profile for a MinIO endpoint reached with long-lived access keys.

```bash
katta storageprofile s3 static
```