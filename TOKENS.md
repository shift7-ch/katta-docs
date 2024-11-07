# Katta Token Management

## Scoped Tokens for Katta S3 STS Storage Access Control

### Motivation

[AWS STS AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html)
and [MinIO STS AssumeRoleWithWebIdentity](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html#minio-sts-assumerolewithwebidentity)
allow to request temporary, limited-privilege credentials for users.
To get fine-grained control access to S3 storage, we use OIDC access tokens scoped to
one vault and use them to get access to one bucket (i.e. one vault) only.
In order to keep our components zero-trust, we use no privileged broker to update [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html).
when vaults are created or users are given access to vaults,
i.e. we use a static mapping to exchange OIDC access tokens for temporary S3 credentials.
The static mapping uses a claim in the access token to issue temporary credentials with a dynamic role giving access to the vault's bucket only.

AWS STS imposes 2048 KB size limit[^1] on the OIDC tokens sent to them[^2]. So the OIDC token must not grow in the number of vaults.
Therefore, we use [RFC 8693 token exchange](https://www.rfc-editor.org/rfc/rfc8693) to get fine-grained access tokens before we go to STS.

[^1]: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html#reference_iam-limits-entity-length &rarr; `Role session policies`

[^2]: https://docs.amazonaws.cn/en_us/AmazonS3/latest/API/ErrorResponses.html#S3AccessGrantsErrorCodeList &rarr; `Serialized token too large for session`

### Overview

![Tokens.drawio.png](img/Tokens.drawio.png)

### High-Level Description

Katta S3 STS is based on the following components and their responsibilities:

- _Katta Server Backend_: synchronizes vault access to Keycloak
- _Keycloak_: provides tokens based on the user's roles
- _AWS/MinIO IAM_: gives trust to Keycloak realms and defines the mapping from claims issued to dynamic roles
- _AWS/MinIO STS_: issues temporary credentials with privileges defined in IAM
- _AWS/MinIO S3_: checks the access right of the temporary credentials to give access to S3 buckets

Katta S3 STS combines the following standard APIs:

1. [OAuth 2.0 Authorization Code Grant](https://www.rfc-editor.org/rfc/rfc6749#section-4.1): the user enters user and password in Keycloak to get OIDC access
   and refresh tokens
2. [OAuth 2.0 Token Exchange](https://www.rfc-editor.org/rfc/rfc8693.html): the OIDC access token is exchanged for vault-specific OIDC access token
3. [AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html): the OIDC access token is exchanged for
   temporary credentials giving access to one vault only
4. [S3 API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html): S3 evaluates the credentials before data can be retrieved

### Intermediate-Level Description

At an intermediate Level:

1. User opens vault in Katta client, client opens browser.
2. Keycloak redirects user to login and authorization prompt.
3. User enters user name and password.
4. Keycloak redirects user back to Katta client with single-use authorization code.
5. Katta client calls `/token` endpoint with authorization code.
6. Keycloak returns OIDC access token and refresh token for client `cryptomator`
7. Katta client sends OIDC access token for client `cryptomator` exchange to `audience: cryptomatorvaults` client using `/token` endpoint with
   `grant_type: urn:ietf:params:oauth:grant-type:token-exchange`, requesting `scope: <vaultId>`.
8. Keycloak returns access token for OIDC access token with vault-specific claims added by protocol mappers in the requested scope.
9. Katta client sends scoped OIDC access token to
   STS [AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html).
10. STS returns temporary `AccesKeyId`, `SecretAccessKey` and `SessionToken`.
    * AWS: the temporary role is tagged with the `vaultId`.
    * MinIO: the credentials allow access to one bucket.
11. AWS only: Katta client sends AWS credentials to STS in order to assume role.
12. AWS only: AWS sends credentials to access giving access to one bucket from the session tags.
13. Katta client access S3 storage with temporary `AccesKeyId`, `SecretAccessKey` and `SessionToken`.

### Detailed Description

TODO example JSONs/tokens for the steps above

* AWS: token contains `https://aws.amazon.com/tags` claim
* MinIO: token contains `client_id` claim

## AWS/MinIO IAM Integration

TODO conceptual description of role chaining etc. Differences MinIO/AWS.

## Tokens with Inline-Policy for S3 Bucket Creation and Template Upload

### Motivation

TODO motivate by almost-zero-knowledge

### S3 Bucket Creation (Katta S3 STS only)

TODO describe inline policies for Katta S3 static and STS

### S3 Template Upload (Katta S3 STS and static)

## Token Refresh

TODO describe refresh at multiple levels activity diagram

## Keycloak Architecture

### Token Exchange

TODO spi implementation

### Roles/Scopes etc.

TODO class diagram

### Realm Diff to Hub

explain all differences