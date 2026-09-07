---
id: architecture
title: Architecture
sidebar_position: 1
---

# Katta Architecture

:::note

This document gives a mid-level overview of Katta Architecture through the two central client-side runtime flows: how the Katta
Desktop Client retrieves the user's keys (first login, new device, and account recovery), and how it authenticates and accesses a
vault's storage (OIDC login, token exchange, STS or static storage credentials, and vault unlock). Each diagram is followed by a
step-by-step walkthrough.

For the components and roles involved, see the [Katta Overview](../introduction/OVERVIEW.md). For the cryptographic keys and the
server's trust boundary, see the [Security Architecture](SECURITY.md); for scoped tokens and the storage IAM data model, see
[Katta Token Management](TOKENS.md).

:::

## Flow to retrieve user keys

```mermaid
sequenceDiagram
    actor user as User
    activate user
    participant session as Session
    activate session
    user ->> session: Open Connection
    participant katta as Katta API Server
    activate katta
    session ->> katta: Retrieve user information
    participant keychain as Password Store
    session ->>+ keychain: Retrieve device keys
    keychain ->>- session: Previously saved device key
    alt Use saved device key
        user ->> katta: Retrieve device specific user keys
        opt : 404 Not found
            Note over user, katta: Device key not found on server
            session ->> user: Prompt for account key
            user ->> session: Input account key
            session ->> session: Recover user keys
            session ->> katta: Upload device specific user keys
        end
        katta ->> session: Return device specific user keys
        session ->> session: Decrypt with device key
    else Device key not available
        alt Recover user keys
            Note over user, katta: Setting up new device
            session ->> user: Prompt for account key
            user ->> session: Input account key
            session ->> session: Recover user keys
        else No user keys stored on Katta Server
            Note over user, katta: Setting up new user keys and account key
            session ->> user: Generate account key and prompt for device name
            user ->> session: Input device name
            session ->> session: Generate user key pair
            session ->> katta: Upload user keys with account key
            session ->> session: Generate new device key
        end
        session ->> katta: Upload device specific user keys
        session ->> keychain: Save device keys
    end
    session ->> user: Return user keys
    deactivate katta
    deactivate session
    deactivate user
```

### In words

This flow shows how the client obtains the user's private [user key pair](SECURITY.md) on a given device. The user key pair is
generated once (at first login) and never leaves the client in plaintext; Katta Server only stores it as JWEs — one encrypted to each
registered device key, and one encrypted with the [Account Key](SECURITY.md) for device-independent recovery.

1. The user opens a connection. The session retrieves the user's account information from Katta API Server and looks in the local
   password store (OS keychain) for a **device key** saved by a previous session.
2. **A device key is available.** The client requests the device-specific user keys — the JWE encrypted to this device — from the
   server.
   * If the server responds `404 Not Found`, this device is not registered on the server. The session prompts for the Account Key,
     recovers the user keys from the Account-Key–encrypted JWE, and uploads a fresh device-specific JWE.
   * Otherwise the server returns the device JWE and the session decrypts it with the device key.
3. **No device key is available** (new device, or the keychain entry was lost).
   * If user keys already exist on the server, this is a new device: the session prompts for the Account Key and recovers the user
     keys from the Account-Key–encrypted JWE.
   * If no user keys exist on the server, this is a brand-new user: the session generates an Account Key, prompts for a device name,
     generates the user key pair, and uploads it encrypted with the Account Key. The Account Key is shown to the user once and must be
     stored safely (e.g. in a password manager).
   * The session then generates a new device key, uploads a device-specific JWE of the user keys, and saves the device key to the
     password store so subsequent sessions take the fast path in step 2.
4. The session returns the decrypted user keys to the caller.

## Flow to authenticate and access vaults

```mermaid
sequenceDiagram
    actor User
    participant client as Desktop Client
    participant katta as Katta API Server
    Note right of client: client_id=cryptomator
    activate client
    User ->> client: Open Connection
    activate katta
    client ->> katta: GET /api/config
    Note over client, katta: Retrieve Public Discovery Configuration
    katta ->> client: application/json
    participant keycloak as Keycloak Server
    activate keycloak
    client ->>+ keycloak: POST /realms/cryptomator/protocol/openid-connect/token
    Note over client, keycloak: OpenID Connect Token Exchange
    keycloak ->>- client: OIDC Tokens
    participant keychain as Password Store
    activate keychain
    client ->> keychain: Save OIDC Tokens
    Note over User, keychain: Flow to retrieve user keys
    alt
        opt
            Note over User, katta: Device key not found on server
        end
    else
        alt
            Note over User, katta: Setting up new device
        else
            Note over User, katta: Setting up new user keys and account key
        end
        Note over katta, keychain: Save device keys
    end

    loop Storage Profile Sync
        client ->> katta: GET /api/storageprofile
        Note over client, katta: Retrieve storage configurations
        katta ->> client: application/json
    end
    loop Storage Vault Sync
        client ->> katta: GET /api/vaults/accessible
        katta ->> client: application/json
    end
    deactivate katta
    client ->> keychain: Lookup OIDC tokens
    keychain ->> client: Return OIDC tokens
    deactivate keychain
    activate keycloak

    opt : Expired OIDC Tokens
        client ->>+ katta: Refresh OIDC Tokens
        katta ->>- client: OIDC Tokens
    end

    opt : Exchange OIDC token to scoped token using OAuth 2.0 Token Exchange
        client ->> katta: Exchange OIDC Access Token
        katta ->> keycloak: Exchange OIDC Access Token
        keycloak ->> katta: Return Scoped Access Token
        katta ->> client: Return Scoped Access Token
    end
    deactivate keycloak

    opt : AssumeRoleWithWebIdentity
        participant sts as STS API Server
        client ->>+ sts: Retrieve Temporary Tokens
        Note over client, sts: Assume role with OIDC Id token
        sts ->>- client: STS Tokens
        opt : AssumeRole
            client ->>+ sts: Retrieve Temporary Tokens
            Note over client, sts: Assume role with previously obtained temporary access token
            sts ->>- client: STS Tokens
        end
    end

    participant s3 as S3 API Server
    client ->>+ s3: GET /bucket
    Note over client, s3: Access vault with AWS4-HMAC-SHA256 authorization
    s3 ->>- client: ListBucketResult
    client ->>+ katta: GET /api/vaults/c62d1ffe-7bab-4ec9-a36a-327f9b7b8f9e/access-token
    Note over client, katta: Retrieve vault access token
    katta ->>- client: JWE
    client ->>+ katta: GET /api/vaults/c62d1ffe-7bab-4ec9-a36a-327f9b7b8f9e
    Note over client, katta: Retrieve vault UVF metadata
    katta ->>- client: UVF Payload
    client ->> client: Unlock Vault
    client ->>+ User: Display Vault
    deactivate client
```

### In words

This flow shows the Katta Desktop Client from opening a connection to displaying an unlocked vault. It uses the `cryptomator`
Keycloak client.

1. **Discovery.** The client fetches `GET /api/config` from Katta API Server to learn the Keycloak endpoints and other public
   configuration.
2. **Authentication.** The client runs an OpenID Connect login against Keycloak, obtains the OIDC tokens (ID, access, refresh), and
   stores them in the local password store.
3. **User keys.** The client runs the [Flow to retrieve user keys](#flow-to-retrieve-user-keys) described above to get the user's
   private keys on this device.
4. **Sync.** The client pulls the storage configurations (`GET /api/storageprofile`) and the vaults the user may access
   (`GET /api/vaults/accessible`).
5. **Token refresh / exchange.** If the OIDC tokens have expired they are refreshed. When a vault-scoped token is required, the client
   asks Katta Server to perform an OAuth 2.0 Token Exchange with Keycloak (targeting the `cryptomatorvaults` client) and returns a
   scoped access token. See [Token Management](TOKENS.md).
6. **Temporary storage credentials (STS Storage Access Mode only).** The client calls `AssumeRoleWithWebIdentity` on the STS API with
   the OIDC ID token to obtain temporary S3 tokens, optionally followed by a second `AssumeRole` for role chaining. In _Static Storage
   Access Mode_ this step is skipped and the S3 static access tokens come from the vault metadata instead.
7. **Storage access.** The client talks to the S3 API directly, authenticating requests with AWS4-HMAC-SHA256.
8. **Vault unlock.** The client retrieves the per-member vault access token
   (`GET /api/vaults/{vaultId}/access-token`, a JWE) and the vault UVF metadata (`GET /api/vaults/{vaultId}`). It decrypts the access
   token with the user's private key to recover the vault member key, unlocks the vault, and displays it to the user.

