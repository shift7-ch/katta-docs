---
title: Troubleshooting
sidebar_position: 4
description: Common setup pitfalls — CORS on the bucket, CSP on the server, and MinIO OIDC configuration.
---

# Troubleshooting

## Failure Creating Vault in Katta Web

Katta Web checks the bucket and uploads the vault template to the S3 bucket directly from the browser. Two things must be configured for this to work:

:::tip[Katta Desktop]
The following only applies to Katta Web. Katta Desktop is not subject to browser Content Security Policy (CSP) and CORS restrictions.
:::

- **S3 Bucket CORS Settings**. The bucket S3 endpoint must allow requests from the Katta Web origin. Refer to [S3 Bucket CORS Settings](../admin-guide/storage-profiles.md#s3-bucket-cors-settings) in the _Admin Guide_ for setup instructions.

  If the CORS settings are missing or incomplete, vault creation fails with `Your browser cannot connect to the bucket.` Browsers report a wrong storage endpoint or a failed network connection the same way; the browser console has the details. Expand _Show CORS setup command_ for an `aws s3api put-bucket-cors` command with the bucket name, endpoint and Katta Web origin already filled in.

- **Content Security Policy (CSP) Settings**. The Content Security Policy (CSP) settings of Katta Server must include the S3 endpoints of the storage profile. If a host is missing, vault creation fails with `This Katta Server's Content Security Policy blocks connections to your-storage-provider.example.com` naming the blocked endpoint. The browser blocks the request before it is sent and logs the violation to the console:

  ```text
  Connecting to 'https://your-storage-provider.example.com' violates the following Content Security Policy directive: "connect-src 'self' localhost:9100 http://localhost:8380". The action has been blocked.
  ```

  The `connect-src` directive must list every host the browser talks to directly:
  - Katta Server itself, covered by `'self'`
  - The Keycloak URL
  - The S3 endpoint of each storage profile
  - The STS endpoint of each storage profile

  Refer to [Deployment](deployment.md) in the _Self-Hosting Guide_ for setup instructions.

  :::note
  A browser only applies a changed policy after reloading the page. Reload Katta Web and start the vault creation again. This generates a new recovery key, so discard the one shown before.
  :::

  :::tip
  Verify the effective policy with:
  ```bash
  curl -sI https://your-katta-server.example.com/ | grep -i content-security-policy
  ```

  That will print the response header like:
  ```
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://keycloak.example.com https://*.wasabisys.com; object-src 'none'; child-src 'self'; img-src * data:; frame-ancestors 'none'
  ```
  :::
