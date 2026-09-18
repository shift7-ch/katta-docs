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
| [Terraform](#terraform-aws)          | Production on AWS, from scratch              | VPC, load balancers, ECS, RDS, Route53, ACM, ECR              | AWS account, Route53 domain                 |
| [Helm chart](#helm-chart-kubernetes) | Production on an existing Kubernetes cluster | Katta Server, Keycloak and PostgreSQL, optionally MinIO       | Cluster, ingress controller, TLS, hostnames |
| [Docker Compose](#docker-compose)    | Local testing and demos                      | Katta Server, Keycloak, MinIO, preconfigured storage profiles | Docker on a single machine                  |

[Terraform](#terraform-aws) and the [Helm chart](#helm-chart-kubernetes) are the maintained paths for production, so pick the one matching where you operate: Terraform if AWS is
your target and you want the network and managed databases created for you, the Helm chart if you already run Kubernetes. The
Docker Compose setup in [katta-compose](https://github.com/shift7-ch/katta-compose) is a demo with MinIO and storage profiles
preseeded, to get a complete stack running on one machine in minutes.


## Terraform (AWS)

[katta-terraform](https://github.com/shift7-ch/katta-terraform) provisions a complete Katta Server deployment on AWS: VPC and
networking, Application Load Balancers, an ECS cluster running Keycloak and the Katta Server, RDS PostgreSQL databases,
Route53 records and ACM certificates, and an ECR pull-through cache for the container images.

:::warning[Prerequisites]
A domain registered in AWS Route53 and Docker installed. Credentials for the AWS CLI are read from the environment:

```bash
export AWS_ACCESS_KEY_ID=
export AWS_SECRET_ACCESS_KEY=
export AWS_SESSION_TOKEN=
export AWS_DEFAULT_REGION=
export AWS_USE_DUALSTACK_ENDPOINT=false
```
:::

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

The ECR pull-through cache authenticates against the GitHub Container Registry even for public images, so a GitHub personal
access token with the `read:packages` scope is required as well:

```bash
export TF_VAR_github_token=$(gh auth token)
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

Open Katta Web at `https://hub.katta.example.net` and log in with username `admin` (set with `TF_VAR_hub_admin_username`) and
the password of `TF_VAR_hub_admin_password`. You must change the password on first login.

:::info
See [katta-terraform](https://github.com/shift7-ch/katta-terraform) for the full variable reference and for example CSP and
`application.properties` settings ([ecs.tf](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf)).
:::

Tear the deployment down with:

```bash
terraform destroy --auto-approve
```

:::note[AWS Secrets Manager]
There is a 7-day grace period on AWS Secrets Manager deletions.
:::

### Content Security Policy (CSP) Settings

The [katta-terraform](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf) deployment assembles
the header from `'self'`, `*.amazonaws.com`, `api.katta.cloud`, the Keycloak origin and the entries of
`hub_csp_additional_connect_src`. Set it with:

```bash
export TF_VAR_hub_csp_additional_connect_src="https://*.wasabisys.com"
```

S3 and STS endpoints on AWS are already covered by `*.amazonaws.com`, so only providers outside AWS need
to be listed.

## Helm Chart (Kubernetes)

The [katta-helm](https://github.com/shift7-ch/katta-helm) repository contains the Helm chart for Katta Server, published as an OCI
artifact at `ghcr.io/shift7-ch/katta-helm/katta-server`. It deploys the Katta Server (required) and, enabled by default, Keycloak and
PostgreSQL; a bundled MinIO can optionally be enabled for demos. Chart signatures can be verified with `cosign`.

Local demo on a single-node cluster (kind, minikube, k3d, Docker Desktop) with the bundled MinIO, from
a checkout of the [katta-helm](https://github.com/shift7-ch/katta-helm) repository:

```bash
minikube addons enable ingress
helm install katta . \
  --namespace katta \
  --create-namespace \
  -f values-demo.yaml
```

Production deployment behind an existing ingress controller:

```bash
helm install katta oci://ghcr.io/shift7-ch/katta-helm/katta-server \
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
bootstrap), `postgres` and `minio` (can be disabled to use external services, e.g. via `hub.database.jdbcUrl`). 

:::info
See the chart [README](https://github.com/shift7-ch/katta-helm/blob/main/README.md) for the complete values reference.
:::

### Content Security Policy (CSP) Settings

The chart appends `hub.config.additionalConnectSrc` to the sources it derives from `urls.kc.public` and `urls.s3.public`:

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

For local testing, the `demo` profile of [katta-compose](https://github.com/shift7-ch/katta-compose) brings up Katta Server,
Keycloak, PostgreSQL, and MinIO, and creates storage profiles for MinIO with static and STS storage access from the files under
[setup](https://github.com/shift7-ch/katta-compose/tree/main/setup):

```bash
docker compose --profile demo up --wait
```

Open Katta Web at http://localhost:8280 and log in with username `admin` and password `admin`.

:::info
See the katta-compose [README](https://github.com/shift7-ch/katta-compose#usage) for the profiles, variables, provisioned
users, and endpoints.
:::

### Content Security Policy (CSP) Settings

[katta-compose](https://github.com/shift7-ch/katta-compose) appends `CSP_CONNECT_SRC_EXTRA` to the
sources it derives from the MinIO and Keycloak addresses. Set it in `.env` next to the other variables:

```bash
CSP_CONNECT_SRC_EXTRA=*.amazonaws.com https://*.wasabisys.com
```

Several sources are given space-separated in a single value. A variable exported in the shell takes
precedence over the env file, which is convenient for a one-off run. Recreate the container to apply the
change:

```bash
docker compose --profile demo up -d --force-recreate hub
```

:::tip[Katta Desktop]
An [optional connection profile](../user-guide/desktop-setup.md) is required to connect to Katta Server with no HTTPS/TLS.
:::

## Configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)
