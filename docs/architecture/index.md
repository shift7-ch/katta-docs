---
title: Architecture
description: How Katta works internally — key retrieval, vault creation, storage access, the security model, scoped tokens, and Keycloak.
---

import DocCardList from '@theme/DocCardList';

# Architecture

This section is for evaluators and engineers who need to know what Katta does internally. The first three pages follow the three runtime flows: how a user gets their keys, what happens when someone creates a vault, and how the client reaches S3. The rest covers the security model, the scoped tokens behind storage access, and the Keycloak realm.

:::warning
These pages may lag behind the latest implementation in some details. When in doubt, the tests in the `keycloak` module of [Katta Server](https://github.com/shift7-ch/katta-server) are authoritative.
:::

<DocCardList />
