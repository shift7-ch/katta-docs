---
title: Troubleshooting
sidebar_position: 4
description: Common setup pitfalls — CORS on the bucket, CSP on the server, and MinIO OIDC configuration.
---

# Troubleshooting

## Vault creation from Katta Web fails in _Static Storage Access Mode_

In _Static Storage Access Mode_, Katta Web uploads the vault template to the S3 bucket directly from the browser. Two things must be configured for this to work:

:::tip[Katta Desktop]
The following only applies to Katta Web. Katta Desktop is not subject to browser CORS restrictions.
:::

- **S3 Bucket CORS Settings**. The bucket S3 endpoint must allow requests from the Katta Web origin. Refer to [S3 Bucket CORS Settings](../admin-guide/storage-profiles.md#s3-bucket-cors-settings) in the _Admin Guide_ for setup instructions.

The bucket S3 endpoint must allow requests from the Katta Web origin. Create the bucket and set its CORS configuration **before** creating the vault.

:::warning
Some S3 providers do not support configuring bucket for CORS required to create buckets in Katta Web:

- Any provider built on OpenStack Swift S3-compat layer.
- For [MinIO](minio.md) instead set the allowed origin globally when starting the server:

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


### Content Security Policy (CSP) Settings of Katta Server

The **Content Security Policy (CSP) settings of Katta Server** must include the S3 endpoints of the storage profile. If a host is missing, the browser blocks the request before it is sent and creating the bucket or uploading the vault template fails in Katta Web:

```text
Connecting to 'https://your-storage-provider.example.com' violates the following Content Security Policy directive: "connect-src 'self' localhost:9100 http://localhost:8380". The action has been blocked.

Uploading vault template failed. TypeError: Failed to fetch. Refused to connect because it violates the document's Content Security Policy.
```

:::tip[Default]
The default policy is configured with `quarkus.http.header."Content-Security-Policy".value` in
[`application.properties`](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties).
:::


In a container deployment, override it with the environment variable `QUARKUS_HTTP_HEADER__CONTENT_SECURITY_POLICY__VALUE`, which takes precedence over the packaged defaults including the profile-specific ones.

The `connect-src` directive must list every host the browser talks to directly:
- Katta Server itself, covered by `'self'`
- The Keycloak URL
- The S3 endpoint of each storage profile
- The STS endpoint of each storage profile in _STS Storage Access Mode_

- Verify the effective policy with:
  ```bash
  curl -sI https://your-katta-server.example.com/ | grep -i content-security-policy
  ```

- That will print the response header like:
  ```
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://keycloak.example.com https://*.wasabisys.com; object-src 'none'; child-src 'self'; img-src * data:; frame-ancestors 'none'
  ```

Each deployment method offers a variable for the endpoints that cannot be derived from the setup itself,
so the rest of the policy stays maintained by Katta. Entries are CSP source expressions and are used
verbatim, so a host wildcard such as `https://*.wasabisys.com` covers both path-style and
virtual-hosted-style requests as well as the STS endpoint of the same provider.

#### Docker Compose

The local setup in [katta-clientlib](https://github.com/shift7-ch/katta-clientlib) appends
`CSP_CONNECT_SRC_EXTRA` to the sources it derives from the MinIO and Keycloak addresses. Set it in
`.local.env` next to the other variables:

```bash
CSP_CONNECT_SRC_EXTRA=*.amazonaws.com https://*.wasabisys.com
```

Several sources are given space-separated in a single value. A variable exported in the shell takes
precedence over the env file, which is convenient for a one-off run. Recreate the container to apply the
change:

```bash
docker compose -f test/src/test/resources/docker-compose-hub-keycloak-minio.yml --profile local --env-file test/src/test/resources/.local.env up -d --force-recreate hub
```

#### Helm Chart

The [Helm chart](deployment.md#helm-chart-kubernetes) appends `hub.config.additionalConnectSrc` to the
sources it derives from `urls.kc.public` and `urls.s3.public`:

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

#### Terraform

The [katta-terraform](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf) deployment assembles
the header from `'self'`, `*.amazonaws.com`, `api.katta.cloud`, the Keycloak origin and the entries of
`hub_csp_additional_connect_src`. Set it in `terraform.tfvars`:

```hcl
hub_csp_additional_connect_src = ["https://*.wasabisys.com"]
```

S3 and STS endpoints on AWS are already covered by `*.amazonaws.com`, so only providers outside AWS need
to be listed. `terraform apply` registers a new task definition and restarts the service with it.
