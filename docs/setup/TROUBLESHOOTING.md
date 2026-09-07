---
id: troubleshooting
title: FAQ & Troubleshooting
sidebar_position: 3
---

# FAQ & Troubleshooting

Most setup pitfalls in Katta are CORS-related, because the Web Client talks to the S3 endpoint directly from the browser.

## Vault creation from the Web Client fails in _Static Storage Access Mode_

In _Static Storage Access Mode_, the Web Client uploads the vault template to the S3 bucket directly from the browser. Two things must be configured for this to work:

* The **bucket CORS settings** must allow requests from the Katta Web origin. Create the bucket and set its CORS configuration before creating the vault
  ([AWS console](https://aws.amazon.com/console/) or [AWS CLI](https://aws.amazon.com/cli/)).
* The **CSP settings of Katta Server** must include the S3 endpoints of the storage profile. The configuration options can be found in
  [`application.properties`](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties);
  see [katta-terraform](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf) for a full example.

## Why does Katta Server create the bucket for the Web Client in STS Storage Access Mode?

Only the **Web Client** delegates bucket creation to Katta Server, and only because it runs in a browser. A browser cannot create a bucket, configure its CORS
settings, and upload to it in one shot — and S3 does not offer bucket creation and CORS configuration as a joint operation. So the Web Client assumes the
`stsRoleCreateBucketHub` role and hands the resulting temporary credentials to Katta Server, which creates the bucket and uploads the vault template on the
user's behalf; server-side calls are not subject to browser CORS restrictions.

The **Desktop Client** is not a browser and is not bound by CORS, so it does not involve Katta Server: it assumes the `stsRoleCreateBucketClient` role and
creates the bucket itself. See [Tokens](../arch/TOKENS.md#s3-bucket-creation-katta-s3-sts-only) for the full flow.

## MinIO: setting CORS on a bucket does not work

MinIO does not support the bucket CORS API — see [MinIO — Unsupported S3 Bucket APIs](https://min.io/docs/minio/linux/operations/concepts/thresholds.html#unsupported-s3-bucket-apis). Instead, set the allowed origin globally when starting the server:

```bash
export MINIO_API_CORS_ALLOW_ORIGIN=https://your-katta-server.example.com
```

## MinIO: `Client ID XYZ is present with multiple OpenID configurations`

MinIO does not allow multiple OIDC provider configurations with the same client ID:

```text
mc: <ERROR> Unable to add OpenID IDP config to server. Client ID XYZ is present with multiple OpenID configurations.
```

This is not a problem for Katta's setup: leave the claim specifying the vault unset or pointing to a non-existing vault.
See [Storage Provider Setup](SERVER_SETUP.md#setup-minio-without-katta-admin-cli) for the full MinIO configuration.
