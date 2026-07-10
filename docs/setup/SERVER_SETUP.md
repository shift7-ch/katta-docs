---
id: server-setup
title: Storage Provider Setup
sidebar_position: 1
---

# Storage Provider Setup

:::note

This document describes step-by-step how to set up Katta Server integration with a storage provider, covering:

* Storage providers: MinIO and AWS
* Modes: Static and STS.
  See the [Katta Overview](introduction/OVERVIEW.md) for a conceptual overview.

:::

:::info Prerequisite

This page assumes a running Katta Server (backend, web frontend, and Keycloak). Deploying Katta Server itself follows the upstream
[Cryptomator Hub setup](https://docs.cryptomator.org/hub/); see [katta-terraform](https://github.com/shift7-ch/katta-terraform)
for a full AWS deployment example.

:::

## TL;DR

Use [Katta Admin CLI]( https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme)

```bash
export PATH=$PATH:[your location of katta cli executable]
katta --help
#Usage: katta [-h] [-V] [COMMAND]
#  -h, --help      Show this help message and exit.
#  -V, --version   Print version information and exit.
#Commands:
#  setup           Setup Storage Provider Integration
#  storageprofile  Configure Storage Location
#  accesstoken     Get access token using authorization code flow.
#  help            Display help information about the specified command.
```

## Overview

The following diagram illustrates the flow of actions to setup Katta Server in both modes:

![Activity diagram: Katta Server setup in Static and STS Mode](../img/overview/ServerSetup.drawio.png)

In words: in order to be able to use the uploaded storage profiles, the following actions need to be taken:

* for Static Mode, we do S3 calls from the Web Client to upload the vault template, hence CSP settings need to be set correctly matching the endpoints of the
  storage profile. Contact your Katta Server admin running Katta Web. The configuration options can be found
  in [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties). See
  also [katta-terraform](https://github.com/shift7-ch/katta-terraform/blob/main/ecs.tf) for full examples.
* for STS, the trust and roles need to be configured in IAM of the S3 provider. See below for details.
  See [connect-external-iam](https://docs.cryptomator.org/hub/user-group-management/#connect-external-iam) on how to connect with external IAM.

Common pitfalls (mostly CORS-related) are collected in [FAQ & Troubleshooting](TROUBLESHOOTING.md).

## Setup AWS with Katta Admin CLI

### Setup AWS: OIDC provider and roles

```bash
export AWS_ACCESS_KEY_ID=[your aws credentials]
export AWS_SECRET_ACCESS_KEY=[your aws credentials]
export AWS_SESSION_TOKEN=[your aws credentials]
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
katta "setup" "aws" "--realmUrl" "${REALM_URL}"
#Trying environment credentials providerListOpenIdConnectProvidersResponse(OpenIDConnectProviderList=[OpenIDConnectProviderListEntry(Arn=arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator), OpenIDConnectProviderListEntry(Arn=arn:aws:iam::**************:oidc-provider/testing.example.com/kc/realms/chipotle), OpenIDConnectProviderListEntry(Arn=arn:aws:iam::**************:oidc-provider/testing.example.com/kc/realms/tamarind)])
#arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator
#aws iam create-role --role-name katta-create-bucket --assume-role-policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : {
#    "Effect" : "Allow",
#    "Principal" : {
#      "Federated" : "arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator"
#    },
#    "Action" : "sts:AssumeRoleWithWebIdentity"
#  }
#}
#aws iam put-role-policy --role-name katta-create-bucket --policy-name katta-create-bucket --policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : [ {
#    "Effect" : "Allow",
#    "Action" : [ "s3:CreateBucket", "s3:GetBucketPolicy", "s3:PutBucketVersioning", "s3:GetBucketVersioning", "s3:GetAccelerateConfiguration", "s3:PutAccelerateConfiguration", "s3:GetEncryptionConfiguration", "s3:PutEncryptionConfiguration" ],
#    "Resource" : "arn:aws:s3:::katta-*"
#  }, {
#    "Effect" : "Allow",
#    "Action" : "s3:PutObject",
#    "Resource" : [ "arn:aws:s3:::katta-*/*/", "arn:aws:s3:::katta-*/*.uvf" ]
#  } ]
#}
#aws iam create-role --role-name katta-access-bucket-web-identity-role --assume-role-policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : {
#    "Effect" : "Allow",
#    "Principal" : {
#      "Federated" : "arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator"
#    },
#    "Action" : [ "sts:AssumeRoleWithWebIdentity", "sts:TagSession" ]
#  }
#}
#aws iam put-role-policy --role-name katta-access-bucket-web-identity-role --policy-name katta-access-bucket-web-identity-role --policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : {
#    "Effect" : "Allow",
#    "Action" : [ "sts:AssumeRole", "sts:TagSession" ],
#    "Resource" : "arn:aws:iam::**************:role/katta-access-bucket-tagged-session-role"
#  }
#}
#aws iam create-role --role-name katta-access-bucket-tagged-session-role --assume-role-policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : {
#    "Effect" : "Allow",
#    "Principal" : {
#      "AWS" : "arn:aws:iam::**************:role/katta-access-bucket-web-identity-role"
#    },
#    "Action" : [ "sts:AssumeRole", "sts:TagSession" ],
#    "Condition" : {
#      "ForAnyValue:StringEquals" : {
#        "sts:TransitiveTagKeys" : "${aws:RequestTag/Vault}"
#      }
#    }
#  }
#}
#aws iam put-role-policy --role-name katta-access-bucket-tagged-session-role --policy-name katta-access-bucket-tagged-session-role --policy-document file://...
#{
#  "Version" : "2012-10-17",
#  "Statement" : [ {
#    "Effect" : "Allow",
#    "Action" : [ "s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads", "s3:GetBucketVersioning", "s3:ListBucketVersions" ],
#    "Resource" : "arn:aws:s3:::katta-${aws:PrincipalTag/Vault}"
#  }, {
#    "Effect" : "Allow",
#    "Action" : [ "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListMultipartUploadParts", "s3:AbortMultipartUpload" ],
#    "Resource" : "arn:aws:s3:::katta-${aws:PrincipalTag/Vault}/*"
#  } ]
#}
```

### Setup AWS: STS storage profile

```bash
export REALM_URL=[your Keycloak realm URL, e.g. https://keycloak.example.com/realms/cryptomator]
export TOKEN_URL=${REALM_URL}/protocol/openid-connect/token
export AUTH_URL=${REALM_URL}/protocol/openid-connect/auth
export HUB_URL=[your Katta Server URL, e.g. https://katta.example.com]
export AWS_ACCOUNT_ID=[your AWS Account ID]
katta "storageprofile" "aws" "sts" "--tokenUrl" "${TOKEN_URL}" "--authUrl" "${AUTH_URL}" "--hubUrl" "${HUB_URL}" "--uuid" "29109070-8807-470c-8f28-61ac3eece4ca" "--name" "AWS S3 STS" "--awsAccountId" "${AWS_ACCOUNT_ID}" "--region" "eu-central-1" "--regions" "eu-central-1"
#Please login on REALM_URL/protocol/openid-connect/auth?response_type=code&state=RpFS8LGiFNcERvJ_&client_id=cryptomator&code_challenge_method=S256&code_challenge=wco4JVUg6pA-BMV_PFEJu7Xb1LgglADHUPP3VLb2rIc&redirect_uri=http%3A%2F%2F127.0.0.1%3A59468%2F6cn7pzR43drFgn-r
#class class cloud.katta.client.model.StorageProfileDto {
#    instance: class StorageProfileS3STSDto {
#        id: 29109070-8807-470c-8f28-61ac3eece4ca
#        name: AWS S3 STS
#        protocol: S3STS
#        archived: false
#        scheme: JsonNullable[https]
#        hostname: JsonNullable[null]
#        port: JsonNullable[443]
#        withPathStyleAccessEnabled: false
#        storageClass: STANDARD
#        region: eu-central-1
#        regions: [eu-central-1]
#        bucketPrefix: katta-
#        stsRoleCreateBucketClient: arn:aws:iam::**************:role/katta-create-bucket
#        stsRoleCreateBucketHub: arn:aws:iam::**************:role/katta-create-bucket
#        stsEndpoint: JsonNullable[null]
#        bucketVersioning: true
#        bucketAcceleration: JsonNullable[null]
#        bucketEncryption: NONE
#        stsRoleAccessBucketAssumeRoleWithWebIdentity: arn:aws:iam::**************:role/katta-access-bucket-web-identity-role
#        stsRoleAccessBucketAssumeRoleTaggedSession: JsonNullable[arn:aws:iam::**************:role/katta-access-bucket-tagged-session-role]
#        stsDurationSeconds: JsonNullable[null]
#        stsSessionTag: Vault
#    }
#    isNullable: false
#    schemaType: oneOf
#}
````

### Setup AWS: static storage profile

```bash
katta "storageprofile" "s3" "static" "--hubUrl" "${HUB_URL}" "--uuid" "5755b607-373c-44af-af7d-63f6776bb8f0" "--name" "AWS S3 Static" "--region" "eu-west-1" "--regions" "eu-west-1" "--regions" "eu-west-2" "--regions" "eu-west-3"
#Please login on ${AUTH_URL}?code_challenge=kD0HEjaJ-epu_GN7-Pf6NE6f7EDvTl1vvt77cFulssM&code_challenge_method=S256&client_id=cryptomator&state=DgHh0TPhlQtge0gb&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A65298%2F_joIZopLjbkANf-F
#class class cloud.katta.client.model.StorageProfileDto {
#    instance: class StorageProfileS3StaticDto {
#        id: 5755b607-373c-44af-af7d-63f6776bb8f0
#        name: AWS S3 Static
#        protocol: S3STATIC
#        archived: false
#        scheme: JsonNullable[https]
#        hostname: JsonNullable[null]
#        port: JsonNullable[443]
#        withPathStyleAccessEnabled: false
#        storageClass: STANDARD
#        region: eu-west-1
#        regions: [eu-west-1, eu-west-2, eu-west-3]
#        bucketPrefix: katta-
#        stsRoleCreateBucketClient: 
#        stsRoleCreateBucketHub: 
#        stsEndpoint: JsonNullable[null]
#        bucketVersioning: true
#        bucketAcceleration: JsonNullable[null]
#        bucketEncryption: NONE
#    }
#    isNullable: false
#    schemaType: oneOf
#}
```

## Setup MinIO storage profile with Katta Admin CLI

Use

```shell
katta storageprofile minio sts --help
katta storageprofile s3 static --help
```

see also [README](https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme).

## Setup MinIO without Katta Admin CLI



A full working example with MinIO can be found
in [docker-compose-minio-localhost-hub.yml](https://github.com/shift7-ch/katta-clientlib/blob/main/test/src/test/resources/docker-compose-minio-localhost-hub.yml).
The json files can be found under [setup](https://github.com/shift7-ch/katta-clientlib/tree/main/test/src/test/resources/setup/)

### Setup MinIO

Documentation

* [MinIO OpenID Connect Access Management](https://min.io/docs/minio/linux/administration/identity-access-management/oidc-access-management.html)
* [MinIO Client Reference `mc idp openid`](https://min.io/docs/minio/linux/reference/minio-mc/mc-idp-openid.html)
* [MinIO Security Token Service `AssumeRoleWithWebIdentity`](https://min.io/docs/minio/linux/developers/security-token-service/AssumeRoleWithWebIdentity.html)

```
minio server data --console-address :9001
```

Or containerized:

```
export MINIO_ROOT_USER=
export MINIO_ROOT_PASSWORD=
export MINIO_API_CORS_ALLOW_ORIGIN=[your Katta Server origin, e.g. https://katta.example.com]
docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=$MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD -e MINIO_API_CORS_ALLOW_ORIGIN=$MINIO_API_CORS_ALLOW_ORIGIN quay.io/minio/minio server /data --console-address ":9001"
```

Side-note: MinIO does not support the bucket CORS API,
see [MinIO - Unsupported S3 Bucket APIs](https://min.io/docs/minio/linux/operations/concepts/thresholds.html#unsupported-s3-bucket-apis)
and [FAQ & Troubleshooting](TROUBLESHOOTING.md#minio-setting-cors-on-a-bucket-does-not-work).

#### Policy and OIDC provider for MinIO

Add a role for creating buckets with prefix `katta` and uploading the vault template (`vault.uvf` and the root directory objects), as well as read/write
access to buckets through the `client_id` claim in the JWT token.

Side-note: MinIO does not allow for multiple OIDC providers with the same client ID:

```
mc: <ERROR> Unable to add OpenID IDP config to server. Client ID XYZ is present with multiple OpenID configurations.
```

This is not a problem as we leave the claim specifying the vault unset or pointing to a non-existing vault.

```shell
mc alias set myminio http://127.0.0.1:9000 minioadmin minioadmin
mc admin policy create myminio kattacreatebucket setup/local/minio_sts/create_bucket_policy.json
mc admin policy create myminio kattaaccessbucket setup/local/minio_sts/access_bucket_policy.json
```

Add a new OIDC provider, vault creation and vault access policy in MinIO:

```shell
WELL_KNOWN=https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration
#WELL_KNOWN=http://localhost:8180/realms/cryptomator/.well-known/openid-configuration
mc idp openid add myminio cryptomator \
    config_url="$WELL_KNOWN" \
    client_id="cryptomator" \
    client_secret="ignore-me" \
    role_policy="kattacreatebucket"
mc idp openid add myminio cryptomatorhub \
    config_url="$WELL_KNOWN" \
    client_id="cryptomatorhub" \
    client_secret="ignore-me" \
    role_policy="kattacreatebucket"    
mc idp openid add myminio cryptomatorvaults \
    config_url="$WELL_KNOWN" \
    client_id="cryptomatorvaults" \
    client_secret="ignore-me" \
    role_policy="kattaaccessbucket"    
mc admin service restart myminio
```

Extract the policy ARN:

```shell
mc idp openid ls myminio 
╭──────────────────────────────────────────────────────────────────────────╮
│ On?        Name                             RoleARN                      │
│ 🔴           (default)                                                   │
│ 🟢         cryptomator  arn:minio:iam:::role/IqZpDC5ahW_DCAvZPZA4ACjEnDE │
│ 🟢      cryptomatorhub  arn:minio:iam:::role/HGKdlY4eFFsXVvJmwlMYMhmbnDE │
│ 🟢   cryptomatorvaults  arn:minio:iam:::role/Hdms6XDZ6oOpuWYI3gu4gmgHN94 │
╰──────────────────────────────────────────────────────────────────────────╯


 mc idp openid info myminio cryptomator
╭─────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│    client_id: cryptomator                                                                               │
│client_secret: ignore-me                                                                                 │
│   config_url: https://keycloak.example.com/realms/cryptomator/.well-known/openid-configuration │
│       enable: on                                                                                        │
│      roleARN: arn:minio:iam:::role/IqZpDC5ahW_DCAvZPZA4ACjEnDE                                          │
│  role_policy: kattacreatebucket                                                                    │
╰─────────────────────────────────────────────────────────────────────────────────────────────────────────╯

```

### Hub configuration

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties)

## Appendix: Setup without the Katta Admin CLI (deprecated)

:::warning Deprecated

The following sections describe the manual setup that the [Katta Admin CLI](https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme)
now automates. They are kept for reference.

:::

### Setup AWS: OIDC provider

Documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html

```shell
openssl s_client -servername keycloak.example.com -showcerts -connect keycloak.example.com:443 > keycloak.example.com.crt

vi keycloak.example.com.crt ...
(remove the irrelevant parts from the chain)

cat keycloak.example.com.crt
-----BEGIN CERTIFICATE-----
MIIGBDCC...(certificate body omitted)...
-----END CERTIFICATE-----


openssl x509 -in keycloak.example.com.crt -fingerprint -sha1 -noout | sed -e 's/://g' | sed -e 's/[Ss][Hh][Aa]1 [Ff]ingerprint=//'
BE21B29075BF9F3265353F8B85208A8981DAEC2A

aws iam create-open-id-connect-provider --url https://keycloak.example.com/realms/cryptomator --client-id-list cryptomator cryptomatorhub  --thumbprint-list BE21B29075BF9F3265353F8B85208A8981DAEC2A
{
    "OpenIDConnectProviderArn": "arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator1"
}

aws iam list-open-id-connect-providers

aws iam get-open-id-connect-provider --open-id-connect-provider-arn arn:aws:iam::**************:oidc-provider/keycloak.example.com/realms/cryptomator
{
    "Url": "keycloak.example.com/realms/cryptomator",
    "ClientIDList": [
        "cryptomatorhub",
        "cryptomator"
    ],
    "ThumbprintList": [
        "a053375bfe84e8b748782c7cee15827a6af5a405"
    ],
    "CreateDate": "2023-11-13T13:51:32.729000+00:00",
    "Tags": []
}
```

### Setup AWS: roles

Add role for creating buckets with prefix `katta` and uploading `vault.uvf`, adapt OIDC provider in trust
policy and bucket prefix in permission policy. Add roles for role chaining, adapt OIDC provider in trust policy and bucket prefix in permission policy.

```shell
aws iam create-role --role-name katta-createbucket --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/createbuckettrustpolicy.json
aws iam put-role-policy --role-name katta-createbucket --policy-name katta-createbucket --policy-document file://src/main/resources/katta/setup/aws_sts/createbucketpermissionpolicy.json


aws iam create-role --role-name katta_chain_01 --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_01_trustpolicy.json
aws iam put-role-policy --role-name katta_chain_01 --policy-name katta_chain_01 --policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_01_permissionpolicy.json

sleep 10;

aws iam create-role --role-name katta_chain_02 --assume-role-policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_02_trustpolicy.json
aws iam put-role-policy --role-name katta_chain_02 --policy-name katta_chain_02 --policy-document file://src/main/resources/katta/setup/aws_sts/katta_chain_02_permissionpolicy.json
```

Checking roles:

```shell
aws iam get-role --role-name katta-createbucket
aws iam get-role-policy --role-name katta-createbucket --policy-name katta-createbucket
```

```shell
TOKEN=`curl -v -X POST https://keycloak.example.com/realms/cryptomator/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=cryptomator" \
     -d "scope=openid" \
     -d "grant_type=password" \
     -d "username=admin" \
     -d "password=$PASSWORD"    | jq ".id_token" | tr -d '"'`

jwtd $TOKEN
aws sts assume-role-with-web-identity --role-arn "arn:aws:iam::**************:role/katta-createbucket" --role-session-name="blabla" --web-identity-token $TOKEN
```

### Hub configuration (manual AWS setup)

See [application.properties](https://github.com/shift7-ch/katta-server/blob/feature/cipherduck-uvf/backend/src/main/resources/application.properties). The
configured prefix must match the ones configured in
the AWS/MinIO setup. Take the role ARNs from the AWS/MinIO setup.

### AWS cleanup

```shell
aws iam delete-role-policy --role-name katta-createbucket --policy-name katta-createbucket
aws iam delete-role --role-name katta-createbucket 
aws iam delete-role-policy --role-name katta_chain_01 --policy-name katta_chain_01
aws iam delete-role --role-name katta_chain_01
aws iam delete-role-policy --role-name katta_chain_02 --policy-name katta_chain_02
aws iam delete-role --role-name katta_chain_02
```

### Storage profiles via the backend API

#### API documentation

See http://localhost:8080/q/openapi?format=json or http://localhost:8080/q/swagger-ui/

#### Examples

See [setup](https://github.com/shift7-ch/katta-clientlib/tree/main/test/src/test/resources/setup).

#### Upload storage profiles

You need to be a hub admin user. If direct access grant is enabled:

```
export HUB_API_BASE=http://localhost:8080/api
export ACCESS_TOKEN=`curl -v -X POST http://localhost:8180/realms/cryptomator/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=cryptomator" \
     -d "grant_type=password" \
     -d "username=admin" \
     -d "password=admin" | jq ".access_token" | tr -d '"'`
curl -X PUT $HUB_API_BASE/storageprofile/s3sts -d @setup/minio_sts/minio_sts_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X PUT $HUB_API_BASE/storageprofile/s3 -d @setup/minio_static/minio_static_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X PUT $HUB_API_BASE/storageprofile/s3sts -d @setup/aws_sts/aws_sts_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl -X PUT $HUB_API_BASE/storageprofile/s3 -d @setup/aws_static/aws_static_profile.json -v  -H "Content-Type: application/json" -H "Authorization: Bearer $ACCESS_TOKEN"
curl  $HUB_API_BASE/storageprofile/ -H "Authorization: Bearer $ACCESS_TOKEN"
```

Else, use [hub-cli](https://github.com/cryptomator/hub-cli) to get the access token with Authorization Code flow:

```
hub login --client-id=cryptomator authorization-code --api-base $HUB_API_BASE | tee ACCESS_TOKEN.txt; export ACCESS_TOKEN=$(cat ACCESS_TOKEN.txt| tail -1)
```

