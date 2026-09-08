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

For local testing, [docker-compose-hub-keycloak-minio.yml](https://github.com/shift7-ch/katta-clientlib/blob/main/test/src/test/resources/docker-compose-hub-keycloak-minio.yml)
brings up Katta Server, Keycloak, and MinIO together with a matching set of storage-profile and setup JSON files under
[setup](https://github.com/shift7-ch/katta-clientlib/tree/main/test/src/test/resources/setup/).

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

## Setup MinIO

#### OIDC Provider and Roles

`katta setup minio` prepares the MinIO server so Keycloak-issued tokens can be exchanged for temporary S3 credentials:

:::info
Only required for _STS Storage Access Mode_.
:::

### MinIO S3 Storage Profile for STS Access Mode

Run `katta storageprofile minio sts` to create a STS storage profile. Pass the endpoint URL and the three role ARNs from `mc idp openid ls` (one each for
  the `cryptomator`, `cryptomatorhub` and `cryptomatorvaults` clients). MinIO scopes bucket access per vault through the
  `${jwt:client_id}` policy variable and does not support role chaining or tagged sessions, so the AWS-only fields
  (`stsRoleAccessBucketAssumeRoleTaggedSession`, `stsSessionTag`) are left unset.

### MinIO S3 Storage Profile for Static Access Mode

Run `katta storageprofile s3 static` to create a static storage profile for a MinIO endpoint reached with long-lived access keys.


### Setup MinIO

Documentation

* [MinIO OpenID Connect Access Management](https://min.io/docs/minio/linux/administration/identity-access-management/oidc-access-management.html)
* [MinIO Client Reference `mc idp openid`](https://min.io/docs/minio/linux/reference/minio-mc/mc-idp-openid.html)
* [MinIO Security Token Service `AssumeRoleWithWebIdentity`](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html)

```
minio server data --console-address :9001
```

Or containerized:

```
export MINIO_ROOT_USER=
export MINIO_ROOT_PASSWORD=
export MINIO_API_CORS_ALLOW_ORIGIN=[your Katta Server origin, e.g. https://katta.example.com]
docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=$MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD -e MINIO_API_CORS_ALLOW_ORIGIN=$MINIO_API_CORS_ALLOW_ORIGIN quay.io/minio/minio server /data --console-address ":9001"
```

Side-note: MinIO does not support the bucket CORS API,
see [MinIO - Unsupported S3 Bucket APIs](https://min.io/docs/minio/linux/operations/concepts/thresholds.html#unsupported-s3-bucket-apis)
and [FAQ & Troubleshooting](TROUBLESHOOTING.md#minio-setting-cors-on-a-bucket-does-not-work).

#### Policy and OIDC provider for MinIO

Add a role for creating buckets with prefix `katta` and uploading the vault template (`vault.uvf` and the root directory objects), as well as read/write
access to buckets through the `client_id` claim in the JWT token.

Side-note: MinIO does not allow for multiple OIDC providers with the same client ID:

```
mc: <ERROR> Unable to add OpenID IDP config to server. Client ID XYZ is present with multiple OpenID configurations.
```

This is not a problem as we leave the claim specifying the vault unset or pointing to a non-existing vault.

```shell
mc alias set myminio http://127.0.0.1:9000 minioadmin minioadmin
mc admin policy create myminio kattacreatebucket setup/local/minio_sts/create_bucket_policy.json
mc admin policy create myminio kattaaccessbucket setup/local/minio_sts/access_bucket_policy.json
```

Add a new OIDC provider, vault creation and vault access policy in MinIO:

```shell
WELL_KNOWN=https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration
#WELL_KNOWN=http://localhost:8180/realms/cryptomator/.well-known/openid-configuration
mc idp openid add myminio cryptomator \
    config_url="$WELL_KNOWN" \
    client_id="cryptomator" \
    client_secret="ignore-me" \
    role_policy="kattacreatebucket"
mc idp openid add myminio cryptomatorhub \
    config_url="$WELL_KNOWN" \
    client_id="cryptomatorhub" \
    client_secret="ignore-me" \
    role_policy="kattacreatebucket"    
mc idp openid add myminio cryptomatorvaults \
    config_url="$WELL_KNOWN" \
    client_id="cryptomatorvaults" \
    client_secret="ignore-me" \
    role_policy="kattaaccessbucket"    
mc admin service restart myminio
```

Extract the policy ARN:

```shell
mc idp openid ls myminio 
╭──────────────────────────────────────────────────────────────────────────╮
│ On?        Name                             RoleARN                      │
│ 🔴           (default)                                                   │
│ 🟢         cryptomator  arn:minio:iam:::role/IqZpDC5ahW_DCAvZPZA4ACjEnDE │
│ 🟢      cryptomatorhub  arn:minio:iam:::role/HGKdlY4eFFsXVvJmwlMYMhmbnDE │
│ 🟢   cryptomatorvaults  arn:minio:iam:::role/Hdms6XDZ6oOpuWYI3gu4gmgHN94 │
╰──────────────────────────────────────────────────────────────────────────╯


 mc idp openid info myminio cryptomator
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│    client_id: cryptomator                                                                               │
│client_secret: ignore-me                                                                                 │
│   config_url: https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration │
│       enable: on                                                                                        │
│      roleARN: arn:minio:iam:::role/IqZpDC5ahW_DCAvZPZA4ACjEnDE                                          │
│  role_policy: kattacreatebucket                                                                    │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────╯

```

### Hub configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)

## Appendix: Manual Setup without Katta Admin CLI (deprecated)

:::warning Deprecated

The following sections describe the manual setup that the [Katta Admin CLI](https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme)
now automates. They are kept for reference.

:::

### Setup AWS: OIDC provider

Documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html

```shell
openssl s_client -servername keycloak.example.com -showcerts -connect keycloak.example.com:443 > keycloak.example.com.crt

vi keycloak.example.com.crt ...
(remove the irrelevant parts from the chain)

cat keycloak.example.com.crt
-----BEGIN CERTIFICATE-----
MIIGBDCC...(certificate body omitted)...
-----END CERTIFICATE-----


openssl x509 -in keycloak.example.com.crt -fingerprint -sha1 -noout | sed -e 's/://g' | sed -e 's/[Ss][Hh][Aa]1 [Ff]ingerprint=//'
BE21B29075BF9F3265353F8B85208A8981DAEC2A

aws iam create-open-id-connect-provider --url https://keycloak.example.com/realms/cryptomator --client-id-list cryptomator cryptomatorhub  --thumbprint-list BE21B29075BF9F3265353F8B85208A8981DAEC2A
{
    "OpenIDConnectProviderArn": "arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator1"
}

aws iam list-open-id-connect-providers

aws iam get-open-id-connect-provider --open-id-connect-provider-arn arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator
{
    "Url": "keycloak.example.com/realms/cryptomator",
    "ClientIDList": [
        "cryptomatorhub",
        "cryptomator"
    ],
    "ThumbprintList": [
        "a053375bfe84e8b748782c7cee15827a6af5a405"
    ],
    "CreateDate": "2023-11-13T13:51:32.729000+00:00",
    "Tags": []
}
```

### Setup AWS: roles

1. Add role for creating buckets with prefix `katta` and uploading `vault.uvf`.
2. Adapt OIDC provider in trust policy and bucket prefix in permission policy. 
3. Add roles for role chaining, adapt OIDC provider in trust policy and bucket prefix in permission policy.

```shell
aws iam create-role --role-name katta-createbucket --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/createbuckettrustpolicy.json
aws iam put-role-policy --role-name katta-createbucket --policy-name katta-createbucket --policy-document file://src/main/resources/katta/setup/aws_sts/createbucketpermissionpolicy.json


aws iam create-role --role-name katta_chain_01 --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_01_trustpolicy.json
aws iam put-role-policy --role-name katta_chain_01 --policy-name katta_chain_01 --policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_01_permissionpolicy.json

sleep 10;

aws iam create-role --role-name katta_chain_02 --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_02_trustpolicy.json
aws iam put-role-policy --role-name katta_chain_02 --policy-name katta_chain_02 --policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_02_permissionpolicy.json
```

Checking roles:

```shell
aws iam get-role --role-name katta-createbucket
aws iam get-role-policy --role-name katta-createbucket --policy-name katta-createbucket
```

```shell
TOKEN=`curl -v -X POST https://keycloak.example.com/realms/cryptomator/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=cryptomator" \
     -d "scope=openid" \
     -d "grant_type=password" \
     -d "username=admin" \
     -d "password=$PASSWORD"    | jq ".id_token" | tr -d '"'`

jwtd $TOKEN
aws sts assume-role-with-web-identity --role-arn "arn:aws:iam::**************:role/katta-createbucket" --role-session-name="blabla" --web-identity-token $TOKEN
```

### Hub configuration (manual AWS setup)

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties). The  configured prefix must match the ones configured in the AWS/MinIO setup. Take the role ARNs from the AWS/MinIO setup.

#### Upload storage profiles

You need to be a hub admin user. If direct access grant is enabled:

```shell
export HUB_API_BASE=http://localhost:8080/api
export ACCESS_TOKEN=`curl -v -X POST http://localhost:8180/realms/cryptomator/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=cryptomator" \
     -d "grant_type=password" \
     -d "username=admin" \
     -d "password=admin" | jq ".access_token" | tr -d '"'`
# Single polymorphic endpoint; the storage profile type is selected by the "protocol" discriminator
# ("S3STS" or "S3STATIC") in the request body. The server assigns the "id".
curl -X POST $HUB_API_BASE/storageprofile -d @setup/minio_sts/storage_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST $HUB_API_BASE/storageprofile -d @setup/minio_static/storage_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST $HUB_API_BASE/storageprofile -d @setup/aws_sts/storage_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X POST $HUB_API_BASE/storageprofile -d @setup/aws_static/storage_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl  $HUB_API_BASE/storageprofile -H "Authorization: Bearer $ACCESS_TOKEN"
```

Else, use [hub-cli](https://github.com/cryptomator/hub-cli) to get the access token with Authorization Code flow:

```shell
hub login --client-id=cryptomator authorization-code --api-base $HUB_API_BASE | tee ACCESS_TOKEN.txt; export ACCESS_TOKEN=$(cat ACCESS_TOKEN.txt| tail -1)
```

