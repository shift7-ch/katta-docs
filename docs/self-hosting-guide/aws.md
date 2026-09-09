---
title: AWS S3
sidebar_position: 2
description: Prepare an AWS account so Keycloak-issued tokens can be exchanged for temporary S3 credentials.
---

# AWS S3

This page prepares the AWS side of _STS Storage Access Mode_: the OIDC trust between Keycloak and AWS IAM, and the roles Katta
assumes. Do this before you upload an STS storage profile, because the profile references these roles.

:::info
_Static Storage Access Mode_ needs none of this. It reaches S3 with long-lived access keys supplied at vault creation, thus you can
go straight to [Storage Profiles](../admin-guide/storage-profiles.md).
:::

## OIDC Provider and Roles


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


## Next step

Upload a matching storage profile — see [Storage Profiles](../admin-guide/storage-profiles.md) in the Admin Guide.
