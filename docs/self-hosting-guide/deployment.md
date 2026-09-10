---
title: Deployment
sidebar_position: 1
description: Deploy Katta Server with Terraform on AWS, the Helm chart on Kubernetes, or Docker Compose for local testing.
---

# Deployment

Katta Server consists of the backend, the web frontend, and Keycloak. Deploy it independently of the storage provider: the storage
provider setup on the following pages assumes a running server. Configuration follows the upstream
[Cryptomator Hub setup](https://docs.cryptomator.org/hub/).


## Terraform (AWS)

[katta-terraform](https://github.com/shift7-ch/katta-terraform) provisions a complete Katta Server deployment on AWS: VPC and
networking, Application Load Balancers, an ECS cluster running Keycloak and the Katta Server, RDS PostgreSQL databases,
Route53 records and ACM certificates, and an ECR pull-through cache for the container images.

:::warning[Prerequisites]
A domain registered in AWS Route53, Docker, and the AWS CLI with configured credentials. Deployment parameters
(`dns_suffix`, database passwords, client secrets, `github_token`, …) are supplied as `TF_VAR_*` environment variables or a
`terraform.tfvars` file.
:::

```bash
terraform workspace new katta
terraform init
terraform validate
terraform plan
terraform apply --auto-approve
```

Tear the deployment down with `terraform destroy --auto-approve` (note the 7-day grace period on AWS Secrets Manager deletions).

:::info
See [katta-terraform](https://github.com/shift7-ch/katta-terraform) for the full variable reference and for example CSP and
`application.properties` settings ([ecs.tf](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf)).
:::

## Helm chart (Kubernetes)

The [katta-server](https://github.com/shift7-ch/katta-server) repository ships a Helm chart, published as an OCI artifact at
`ghcr.io/shift7-ch/charts/katta-server`. It deploys the Katta Server (required) and, enabled by default, Keycloak and
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
bootstrap), `postgres` and `minio` (can be disabled to use external services, e.g. via `hub.database.jdbcUrl`). 

:::info
See the chart [README](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/chart/README.md) for the complete values reference.
:::

## Docker Compose

For local testing, the `demo` profile in the [Docker Compose Configuration File](https://github.com/shift7-ch/katta-clientlib/blob/main/test/src/test/resources/docker-compose-hub-keycloak-minio.yml)
brings up Katta Server, Keycloak, and MinIO together with a matching set of storage-profile and setup JSON files under
[setup](https://github.com/shift7-ch/katta-clientlib/tree/main/test/src/test/resources/setup/).

* [One-Stop Shop Demo with Docker Compose](https://github.com/shift7-ch/katta-clientlib#one-stop-shop-demo-with-docker-compose)

## Configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)

