---
title: Deployment
sidebar_position: 1
description: Deploy Katta Server with Terraform on AWS, the Helm chart on Kubernetes, or Docker Compose for local testing.
---

# Deployment

Katta Server consists of the backend, the web frontend, and Keycloak. Deploy it independently of the storage provider: the [storage
provider setup](../admin-guide/storage-profiles.md) assumes a running server. Configuration follows the upstream
[Cryptomator Hub setup](https://docs.cryptomator.org/hub/).

Three deployment options are available. They differ in how much surrounding infrastructure they provide and how much you are
expected to operate yourself:

| Option                               | Best for                                     | Brings along                                                  | You provide                                 |
|--------------------------------------|----------------------------------------------|---------------------------------------------------------------|---------------------------------------------|
| [Terraform](#terraform-aws)          | Production on AWS, from scratch              | VPC, load balancers, ECS, RDS, Route53, ACM, ECR, AWS S3 storage profile           | AWS account, Route53 domain                 |
| [Helm chart](#helm-chart-kubernetes) | Production on an existing Kubernetes cluster | Katta Server, Keycloak and PostgreSQL, optionally MinIO with its storage profiles | Cluster, ingress controller, TLS, hostnames |
| [Docker Compose](#docker-compose)    | Local testing and demos                      | Katta Server, Keycloak, MinIO, preconfigured storage profiles                      | Docker on a single machine                  |

[Terraform](#terraform-aws) and the [Helm chart](#helm-chart-kubernetes) are the maintained paths for production, so pick the one matching where you operate: Terraform if AWS is
your target and you want the network and managed databases created for you, the Helm chart if you already run Kubernetes. The
Docker Compose setup is a demo with MinIO and storage profiles preseeded, to get a complete stack running on one machine in
minutes.

All three live in the [katta-server](https://github.com/shift7-ch/katta-server) repository: Terraform and Docker Compose in
[`deploy/`](https://github.com/shift7-ch/katta-server/tree/develop/deploy), the Helm chart in
[`chart/`](https://github.com/shift7-ch/katta-server/tree/develop/chart). Except for a Helm install from the chart registry, run
them from a checkout of katta-server, because they render the
[Keycloak realm](../architecture/keycloak.md#keycloak-realm-diff-to-cryptomator-hub-aka-upstream) from the chart in it.

All three options configure a default [storage profile](../admin-guide/storage-profiles.md) with the
[Katta Admin CLI](../admin-guide/cli.md) once Katta Server is up, so vaults can be created right after the deployment:

| Option                               | Storage                  | Storage profiles                                                  |
|--------------------------------------|--------------------------|-------------------------------------------------------------------|
| [Terraform](#terraform-aws)          | AWS S3                   | _Scoped Credentials_                                              |
| [Helm chart](#helm-chart-kubernetes) | Bundled MinIO (optional) | _Static Credentials_, and _Scoped Credentials_ if OIDC is enabled |
| [Docker Compose](#docker-compose)    | Bundled MinIO            | _Static Credentials_ and _Scoped Credentials_                     |

The storage profiles are uploaded with `--skipIfExists`: a storage profile with the same name already in Katta Server is left
untouched, so re-running the deployment neither duplicates nor updates it. Add storage profiles for further storage providers
as described in [Storage Profiles](../admin-guide/storage-profiles.md).


## Terraform (AWS)

[`deploy/terraform/aws`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/terraform/aws) provisions a complete
Katta Server deployment on AWS: VPC and networking, Application Load Balancers, an ECS cluster running Keycloak and the Katta
Server, RDS PostgreSQL databases, Route53 records and ACM certificates, and an ECR pull-through cache for the container images.

:::warning[Prerequisites]
A domain registered in AWS Route53 and Docker installed. Credentials for the AWS CLI are read from the environment:

```bash
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export AWS_SESSION_TOKEN=
export AWS_DEFAULT_REGION=
export AWS_USE_DUALSTACK_ENDPOINT=false
```

Install the [Katta Admin CLI](../admin-guide/cli.md#installation) `katta`, version 1.0.4 or later. It sets up the
[default storage profile](#default-storage-profile-aws-s3) for AWS S3.
:::

Run all commands below in `deploy/terraform/aws` of the checkout. Terraform keeps its state locally in this directory, per
workspace, so always manage a deployment from the checkout and workspace that created it.

Deployment parameters are supplied either as `TF_VAR_*` environment variables or in a `terraform.tfvars` file copied from
`terraform.tfvars.template`. The domain, the passwords, and the client secrets have no usable defaults:

```bash
export TF_VAR_region=$AWS_DEFAULT_REGION
export TF_VAR_dns_suffix=example.net
export TF_VAR_keycloak_db_password=
export TF_VAR_keycloak_admin_password=
export TF_VAR_hub_db_password=
export TF_VAR_hub_admin_password=
export TF_VAR_hub_keycloak_system_client_secret=
export TF_VAR_hub_keycloak_oidc_cryptomator_vaults_client_secret=
```

The ECR pull-through cache authenticates against the GitHub Container Registry even for public images, so a classic GitHub
personal access token with the `read:packages` scope is required as well. The token is stored in AWS Secrets Manager and in the
local Terraform state. Create a dedicated one with only this scope instead of reusing the token of the `gh` CLI, which carries
broader scopes:

```bash
export TF_VAR_github_token=ghp_...
```

The workspace name becomes the infix of the subdomains created, so `katta` below yields `hub.katta.example.net` and
`keycloak.katta.example.net`:

```bash
terraform workspace new katta
terraform init
terraform validate
terraform plan
terraform apply --auto-approve
```

:::tip
Open Katta Web at `https://hub.katta.example.net` and log in with username `admin` (set with `TF_VAR_hub_admin_username`) and
the password of `TF_VAR_hub_admin_password`. You must change the password on first login.
:::

:::info
See [variables.tf](https://github.com/shift7-ch/katta-server/blob/develop/deploy/terraform/aws/variables.tf) for the full
variable reference, [ecs.tf](https://github.com/shift7-ch/katta-server/blob/develop/deploy/terraform/aws/ecs.tf) for example CSP
and `application.properties` settings, and the
[README](https://github.com/shift7-ch/katta-server/blob/develop/deploy/terraform/aws/README.md) for troubleshooting.
:::

Tear the deployment down with:

```bash
terraform destroy --auto-approve
```

:::note[AWS Secrets Manager]
There is a 7-day grace period on AWS Secrets Manager deletions.
:::

### Default Storage Profile (AWS S3)

Once Katta Server is reachable, `terraform apply` sets up AWS S3 with _[Scoped Credentials](../concepts.md#s3-storage)_ as
the default storage backend:

* `katta setup aws` creates the OIDC identity provider for the Keycloak realm and the IAM roles
  `<workspace>-create-bucket`, `<workspace>-access-bucket-web-identity-role` and
  `<workspace>-access-bucket-tagged-session-role`, as described in [AWS S3](aws.md#resources-created-in-aws). AWS credentials
  are read from the environment or the profile `$AWS_PROFILE`.
* `katta storageprofile aws sts` uploads a storage profile referencing these roles, using an access token of the service account
  of client `cryptomatorhub-system`.

| Variable                               | Default                                                    | Description                                                                                  |
|----------------------------------------|------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `storage_profile_aws_enabled`          | `true`                                                     | Set to `false` to skip the setup and upload a storage profile yourself.                      |
| `storage_profile_aws_role_name_prefix` | `<workspace>-`                                             | Prefix of the IAM role names.                                                                |
| `storage_profile_aws_bucket_prefix`    | `<project>-<workspace>-`                                   | Prefix of the vault bucket names, at most 27 characters.                                     |
| `storage_profile_aws_regions`          | Regions enabled by default in AWS accounts (not opt-in)    | Regions users may choose for vault buckets. `region` is always included and is the default. |

```bash
export TF_VAR_storage_profile_aws_regions='["eu-central-1","eu-west-1"]'
```

The storage profile is named after its regions. Changing only the role or bucket prefix therefore does not update an existing
storage profile. The identity provider and roles are not managed as Terraform resources but are removed with `terraform destroy`.
S3 buckets created for vaults are not deleted.

### Content Security Policy (CSP) Settings

The [Terraform deployment](https://github.com/shift7-ch/katta-server/blob/develop/deploy/terraform/aws/ecs.tf) assembles
the header from `'self'`, `*.amazonaws.com`, `api.cryptomator.org` and `api.katta.cloud` (license API and update check), the
Keycloak origin and the entries of `hub_csp_additional_connect_src`. Set it with:

```bash
export TF_VAR_hub_csp_additional_connect_src="https://*.wasabisys.com"
```

S3 and STS endpoints on AWS are already covered by `*.amazonaws.com`, so only providers outside AWS need
to be listed.

:::tip[Next Step]
With the [default storage profile](#default-storage-profile-aws-s3), vaults can be created in AWS S3 right away. Continue with
[AWS S3](aws.md) only if you disabled it with `storage_profile_aws_enabled = false` or need roles with different prefixes.
:::

## Helm Chart (Kubernetes)

The Helm chart for Katta Server lives in [`chart/`](https://github.com/shift7-ch/katta-server/tree/develop/chart) of
katta-server and is published as an OCI artifact at `ghcr.io/shift7-ch/charts/katta-server`. It deploys the Katta Server
(required) and, enabled by default, Keycloak and PostgreSQL; a bundled MinIO can optionally be enabled for demos. Chart
signatures can be verified with `cosign`.

The local demo runs on a single-user local cluster (kind, minikube, k3d, Docker Desktop) with the bundled MinIO. It patches
CoreDNS in `kube-system` and needs cluster-admin rights, so don't use it on a shared cluster.
[`deploy/helm/demo`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/helm/demo) walks through a kind cluster and
troubleshooting.

The nginx ingress controller must accept requests before `helm install`. The chart looks up the controller when it renders, and
without it Katta Server cannot reach MinIO. On minikube, enable the controller and wait until its admission webhook responds:

```bash
minikube addons enable ingress
until kubectl create ingress webhook-probe --class nginx --rule "probe.local/*=probe:80" --dry-run=server > /dev/null; do sleep 5; done
```

Then install the chart from the root of the checkout:

```bash
helm install katta chart \
  --namespace katta \
  --create-namespace \
  -f deploy/helm/demo/values-demo.yaml \
  --wait --timeout 20m
```

If the controller was installed after the chart, apply it again with
`helm upgrade katta chart --namespace katta -f deploy/helm/demo/values-demo.yaml`.

Expose the ingress controller on port 9090 and keep the port-forward running:

```bash
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 9090:80
```

:::tip
Open Katta Web at http://hub.localhost:9090 and log in with username `admin` and password `admin`.
:::

Production deployment behind an existing ingress controller:

```bash
helm install katta oci://ghcr.io/shift7-ch/charts/katta-server \
  --devel \
  --namespace katta \
  --create-namespace \
  --wait --timeout 5m \
  --set urls.hub.public=https://hub.example.com \
  --set urls.kc.public=https://kc.example.com \
  --set ingress.controller=traefik \
  --set hub.admin.password=changeme
```

:::tip
Open Katta Web at `urls.hub.public` and log in with username `admin` (set with `hub.admin.username`) and the password of
`hub.admin.password`. You must change the password on first login.
:::

:::note[Chart Versions]
Until the first Katta release, the chart is published only as previews `<version>-dev.<build number>`, one per push to the
`develop` branch. Helm installs such pre-releases only with `--devel`, which picks the newest, or with an explicit `--version`.
`helm list --namespace katta` shows the installed version in the `CHART` column. Pass a version with `--version` to every later
`helm upgrade`, so that an upgrade moves only to a preview you chose.
:::

Key values sections: `urls` (public hostnames for Hub, Keycloak, and the S3 API — `urls.s3.public` must be a dedicated host served
at the root), `ingress` (`nginx` or `traefik`, TLS), `hub` (database connection, admin credentials, telemetry), `keycloak` (realm
bootstrap), `postgres` and `minio` (can be disabled to use external services, e.g. via `hub.database.jdbcUrl`). 

:::info
See the chart [README](https://github.com/shift7-ch/katta-server/blob/develop/chart/README.md) and
[values.yaml](https://github.com/shift7-ch/katta-server/blob/develop/chart/values.yaml) for the complete values reference.
:::

### Default Storage Profiles (MinIO)

With the bundled MinIO enabled (`minio.enabled=true`), a `post-install,post-upgrade` hook Job configures MinIO and uploads
storage profiles for it with the [Katta Admin CLI](../admin-guide/cli.md), using an access token of the service account of
client `cryptomatorhub-system`:

| Value                                    | Default      | Storage profile                                                                                                          |
|------------------------------------------|--------------|--------------------------------------------------------------------------------------------------------------------------|
| `storageProfileSeed.static.enabled`      | `true`       | `Bundled MinIO` with _Static Credentials_ (`katta storageprofile s3 static`).                                            |
| `storageProfileSeed.sts.enabled`         | `false`      | `Bundled MinIO (STS)` with _Scoped Credentials_ (`katta storageprofile minio sts`). Requires `minio.openid.enabled=true`. |
| `storageProfileSeed.static.bucketPrefix` | `katta-`     | Prefix of the vault bucket names of `Bundled MinIO`.                                                                     |
| `storageProfileSeed.sts.bucketPrefix`    | `katta-sts-` | Prefix of the vault bucket names of `Bundled MinIO (STS)`. The MinIO policies restrict bucket creation and access to it.  |
| `storageProfileSeed.*.profileName`       | see above    | Name of the storage profile.                                                                                             |

[`values-demo.yaml`](https://github.com/shift7-ch/katta-server/blob/develop/deploy/helm/demo/values-demo.yaml) enables both and
sets the bucket prefix of `Bundled MinIO (STS)` to `katta-`, as in the Docker Compose demo. For _Scoped Credentials_, the Job
creates the MinIO policies `katta-createbucketpolicy` and `katta-accessbucketpolicy` and the OIDC providers for the Keycloak
clients, as described in
[MinIO](minio.md#resources-created-in-minio), and reads the resulting role ARNs from MinIO. The endpoint of both storage
profiles is `urls.s3.public`, which must therefore be reachable from the Katta Server pod and from clients.

Without the bundled MinIO, no storage profile is created. Prepare your storage provider with [AWS S3](aws.md) or
[MinIO](minio.md) and upload a storage profile as described in [Storage Profiles](../admin-guide/storage-profiles.md).

### Content Security Policy (CSP) Settings

The chart appends `hub.config.additionalConnectSrc` to `'self'`, `api.cryptomator.org`, `api.katta.cloud`, the origin of
`urls.kc.public` and, with the bundled MinIO, the origin of `urls.s3.public`:

```yaml
hub:
  config:
    additionalConnectSrc:
      - https://s3.amazonaws.com
      - "https://*.wasabisys.com"
```

The deployment is annotated with a checksum of its configuration, so `helm upgrade` restarts the pod
whenever the policy changes.

:::warning
`hub.config.contentSecurityPolicy` replaces the whole header and discards every source the chart derives,
including the Keycloak origin. Use it only when specifying all directives yourself.
:::

## Docker Compose

For local testing, [`deploy/compose/demo`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/compose/demo) brings
up Katta Server, Keycloak, PostgreSQL, and MinIO, configures MinIO as described in
[MinIO](minio.md#resources-created-in-minio), and creates two storage profiles for MinIO with the
[Katta Admin CLI](../admin-guide/cli.md):

| Storage profile   | Storage access           | Bucket prefix |
|-------------------|--------------------------|---------------|
| `MinIO S3 STS`    | _Scoped Credentials_     | `katta-`      |
| `MinIO S3 static` | _Static Credentials_     | `katta-`      |

[`deploy/compose/local`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/compose/local) starts and configures the
same services but creates no storage profiles. Upload one as described in
[Storage Profiles](../admin-guide/storage-profiles.md#minio). Both require Docker Compose 2.23.1 or later. They publish the same
ports, so only one of them can run at a time.

Start the demo from the root of the checkout:

```bash
cd deploy/compose/demo
docker compose up --wait
```

:::tip
Open Katta Web at http://localhost:8280 and log in with username `admin` and password `admin`.
:::

Katta Server and Keycloak are published at `localhost:8280` and `localhost:8380`, the MinIO console at `localhost:9101`. MinIO
serves S3 and STS at `minio.localhost:9100`. The storage profiles point there, so the browser on the host and Katta Server inside
the Docker network both reach MinIO under that name. Browsers resolve subdomains of `localhost` to the loopback address, but the
system resolver of macOS does not. For other clients on the host, such as Katta Desktop, add `minio.localhost` to `/etc/hosts`:

```text
127.0.0.1 minio.localhost
```

:::info
The `MinIO S3 static` storage profile asks for access keys when a vault is created. The
[README](https://github.com/shift7-ch/katta-server/blob/develop/deploy/compose/demo/README.md) of `deploy/compose/demo` shows
how to create them with `mc`.
:::

### Content Security Policy (CSP) Settings

Both setups append `CSP_CONNECT_SRC_EXTRA` to `'self'`, `api.cryptomator.org`, `api.katta.cloud` and the Keycloak and MinIO
addresses. Set it in `.env` in the directory you run `docker compose` from, created owner-only from
[`deploy/compose/local/.env.template`](https://github.com/shift7-ch/katta-server/blob/develop/deploy/compose/local/.env.template),
which also lists the variables for ports, secrets and the license:

```bash
install -m 600 ../local/.env.template .env
```

```bash
CSP_CONNECT_SRC_EXTRA=*.amazonaws.com https://*.wasabisys.com
```

Several sources are given space-separated in a single value. A variable exported in the shell takes
precedence over the env file, which is convenient for a one-off run. Recreate the container to apply the
change, from the directory holding `.env`:

```bash
docker compose up -d --force-recreate hub
```

:::tip[Katta Desktop]
An [optional connection profile](../user-guide/desktop-setup.md) is required to connect to Katta Server with no HTTPS/TLS.
:::

## Further Scenarios

[`deploy/`](https://github.com/shift7-ch/katta-server/tree/develop/deploy) of katta-server holds further examples, mostly adapted
from upstream Cryptomator Hub. They are starting points with a README each, not deployment paths maintained by Katta like the
three above. The [overview](https://github.com/shift7-ch/katta-server/blob/develop/deploy/README.md) in `deploy/` lists all of
them.

| Example                                                                     | Directory                                                                                                               |
|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| A single Docker host behind Traefik with Let's Encrypt                      | [`deploy/compose/prod`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/compose/prod)                     |
| Katta Server and PostgreSQL locally, against a Keycloak that runs elsewhere | [`deploy/compose/hybrid`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/compose/hybrid)                 |
| A locally built Katta Server image against the development realm            | [`deploy/compose/dev`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/compose/dev)                       |
| The published chart behind Traefik with cert-manager                        | [`deploy/helm/prod`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/helm/prod)                           |
| The Helm chart connected to a Keycloak you already operate                  | [`deploy/helm/existing-keycloak`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/helm/existing-keycloak) |
| Chart development with a locally built image on minikube                    | [`deploy/helm/dev`](https://github.com/shift7-ch/katta-server/tree/develop/deploy/helm/dev)                             |

## Configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/develop/backend/src/main/resources/application.properties)
