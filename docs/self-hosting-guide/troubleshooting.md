---
title: Troubleshooting
sidebar_position: 4
description: Common setup pitfalls — CORS on the bucket, CSP on the server, and MinIO OIDC configuration.
---

# Troubleshooting

Most setup pitfalls in Katta are CORS-related, because Katta Web talks to the S3 endpoint directly from the browser.

## Vault creation from Katta Web fails in _Static Storage Access Mode_

In _Static Storage Access Mode_, Katta Web uploads the vault template to the S3 bucket directly from the browser. Two things must be configured for this to work.

### S3 Bucket CORS Settings

The bucket S3 endpoint must allow requests from the Katta Web origin. Create the bucket and set its CORS configuration **before** creating the vault.


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

1. Save the rule to a file, for example `cors.json`:

  ```json
  {
    "CORSRules": [
      {
        "AllowedOrigins": ["https://your-katta-web.example.com"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag", "x-amz-request-id", "x-amz-id-2", "x-amz-version-id"],
        "MaxAgeSeconds": 3600
      }
    ]
  }
  ```

2. Then apply it to the bucket:

  ```bash
  aws s3api put-bucket-cors --bucket <bucket-name> --cors-configuration file://cors.json
  ```


### CSP settings of Katta Server
The **CSP settings of Katta Server** must include the S3 endpoints of the storage profile. The configuration options can be found in
[`application.properties`](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)

:::tip
See [katta-terraform](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf) for a full example.
:::


## MinIO: Setting CORS on a bucket does not work

MinIO does not [support](https://min.io/docs/minio/linux/operations/concepts/thresholds.html#unsupported-s3-bucket-apis) the CORS configuration for buckets. Instead, set the allowed origin globally when starting the server:

```bash
export MINIO_API_CORS_ALLOW_ORIGIN=https://your-katta-server.example.com
```

## MinIO: `Client ID XYZ is present with multiple OpenID configurations`

MinIO does not allow multiple OIDC provider configurations with the same client ID:

```text
mc: <ERROR> Unable to add OpenID IDP config to server. Client ID XYZ is present with multiple OpenID configurations.
```

This is not a problem for Katta's setup: leave the claim specifying the vault unset or pointing to a non-existing vault.
See [MinIO](minio.md) for the full MinIO configuration.
