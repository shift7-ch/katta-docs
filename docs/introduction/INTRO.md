---
id: intro
title: Katta Introduction
sidebar_position: 1
---

# Katta Introduction

Katta brings zero-config storage management and zero-knowledge key management for teams and organizations.

It easily integrates into your existing identity management incl. OpenID Connect, SAML, and LDAP.
As usual, your favorite cloud service remains your free choice [^1].

[^1]: In Static Storage Access Mode, any S3-compatible provider works; STS Storage Access Mode currently supports AWS S3 and MinIO. See [Katta S3 Modes](OVERVIEW.md#katta-s3-modes).

Katta consists of Katta Server and Katta Desktop:

* Katta Client is based on [Mountain Duck](https://mountainduck.io/) and [Katta Client Library](https://github.com/shift7-ch/katta-clientlib),
* Katta Server is based on [Cryptomator Hub](https://github.com/cryptomator/hub/).

## Contents

This documentation only covers the Katta-specific parts going beyond the upstream documentation:

* [Cryptomator Documentation](https://docs.cryptomator.org/) — vault handling, Hub deployment, user and group management
* [Mountain Duck Help](https://docs.mountainduck.io/mountainduck/) — client installation, interface, and file synchronization

This documentation contains, in increasing level of technical depth:

* [How Katta Differs from Cryptomator Hub](COMPARISON.md) — what Katta adds on top of the upstream projects
* [Katta Overview](OVERVIEW.md) — concepts: vaults, S3 modes, storage profiles, roles
* [Storage Provider Setup](setup/SERVER_SETUP.md) — connect Katta Server to AWS or MinIO
* [FAQ & Troubleshooting](setup/TROUBLESHOOTING.md) — common pitfalls
* [Katta Architecture](arch/ARCHITECTURE.md) — authentication and key retrieval flows
* [Security Architecture](arch/SECURITY.md) — keys, zero-knowledge boundaries, threat model
* [Katta Token Management](arch/TOKENS.md) — deep dive into scoped tokens and IAM data models

Unsure what a term means? Check the [Glossary](GLOSSARY.md), which also maps Katta terms to their upstream counterparts.
