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

- **Content Security Policy (CSP) Settings of Katta Server**. The **Content Security Policy (CSP) settings of Katta Server** must include the S3 endpoints of the storage profile. If a host is missing, the browser blocks the request before and uploading the vault template fails in Katta Web:

  ```text
  Connecting to 'https://your-storage-provider.example.com' violates the following Content Security Policy directive: "connect-src 'self' localhost:9100 http://localhost:8380". The action has been blocked.
  
  Uploading vault template failed. TypeError: Failed to fetch. Refused to connect because it violates the document's Content Security Policy.
  ```

  The `connect-src` directive must list every host the browser talks to directly:
  - Katta Server itself, covered by `'self'`
  - The Keycloak URL
  - The S3 endpoint of each storage profile
  - The STS endpoint of each storage profile in _STS Storage Access Mode_

  Refer to [Deployment](deployment.md) in the _Self-Hosting Guide_ for setup instructions.

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
