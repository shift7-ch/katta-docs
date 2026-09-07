---
id: desktop-client-setup
title: Desktop Setup
sidebar_position: 2
---

# Desktop Setup

:::note

This document describes step-by-step how to set up Katta Desktop on macOS or Windows, covering:

* Install Katta Desktop
* Authenticate with Katta Server
* Set up your Account Key
* Create a new vault
* Add files to a vault

See the [Katta Overview](../introduction/OVERVIEW.md) for a conceptual overview.

:::

:::info Prerequisite

This page assumes a running Katta Server [setup](SERVER_SETUP.md) with at least one storage profile configured, and a user account
with the `create-vault` role.

:::

The screenshots below are from macOS. Windows looks slightly different but the steps are the same. _Windows screenshots pending._

## Install Katta Desktop

Download Katta Desktop from the Katta Web application of your Katta Server and install:

* **macOS** — open the `.zip` or `.dmg` and drag **Katta.app** into your *Applications* folder.
* **Windows** — open the `.msix` follow the wizard.

For the general client interface, the menu bar / tray icon, and file synchronization behavior, see the
[Mountain Duck Help](https://docs.mountainduck.io/mountainduck/).

## Authenticate with Katta Server

Choose _Open in Katta_ from the Katta Web application of your Katta Server or enter the server hostname manually 
connection prompt when selecting _Open Connection…_ from the Katta Desktop menu.

![Katta Desktop login prompt](../img/desktop/macos/desktop-macos-connection.png)

It opens your web browser to obtain an
authorization code and shows the prompt below until you finish signing in (select **Cancel** to abort).

![Katta Desktop login prompt](../img/desktop/macos/desktop-macos-login-prompt.png)

Your browser opens the Katta Web sign-in page. Enter your username (or email) and password and select
**Sign In**. If your organization connects an external identity provider (OpenID Connect, SAML, or LDAP), authenticate there instead.

![Sign in to Katta Web](../img/desktop/macos/desktop-macos-sign-in.png)

After a successful sign-in the browser passes the authorization code back to Katta Desktop; you can then close the browser tab.

## Set up your Account Key

The first time you authenticate on a device, Katta Desktop handles your **Account Key** — a high-entropy secret that protects your
personal key pair and lets you recover it on other apps, browsers, and devices. Katta Server never sees the Account Key.

* **New user** — Katta Desktop generates the Account Key and pre-fills a device name. Copy the Account Key to a safe place (for
  example a password manager), tick **I stored my Account Key securely**, and select **Finish Setup**.

  ![Account Key dialog in Katta Desktop](../img/desktop/macos/desktop-macos-account-key.png)

* **New device** — enter the Account Key you saved during the initial setup to unlock your key pair on this device. This is 
case if you already logged in with Katta Web to your account and created the Account Key.

  ![New Device dialog in Katta Desktop](../img/desktop/macos/desktop-macos-new-device.png)

:::info Authorized Devices

You can review the apps and devices authorized with your Account Key on your profile page in Katta Web. See
[Flow to retrieve user keys](../arch/ARCHITECTURE.md#flow-to-retrieve-user-keys) for what happens behind the scenes.

:::

## Create a new vault

Once authenticated, Katta Server is mounted as a location (for example *Katta – demo.katta.cloud*).

1. Open the Katta location, secondary-click (right-click) an empty area, and choose **New Encrypted Vault…**.

   ![New Encrypted Vault context menu](../img/desktop/macos/desktop-macos-new-vault.png)

2. Enter a name for the vault and pick a **storage profile** from the dropdown. The list contains the storage locations your
   administrator configured (see [Storage Provider Setup](SERVER_SETUP.md)); the value in parentheses is the region the bucket is
   created in. Select **Create Vault**.

   ![Create Vault dialog in Katta Desktop](../img/desktop/macos/desktop-macos-create-vault.png)

Katta Desktop creates the storage bucket, uploads the encrypted vault template, and registers the vault keys with Katta Server
(encrypted on your computer).

:::info Share Vault

You become the vault owner and can share the vault with other Katta users from Katta Web.

:::

## Add files to a vault

The vault appears as a folder inside the Katta location. Work with it like any other folder: drag files and folders into it in
Finder.app on macOS and Windows File Explorer, or save into it from an application. Katta Desktop syncs the contents to the vault's S3 bucket in the background; opening a file downloads and decrypts it on demand.

:::info Zero-knowledge, end-to-end encrypted

Everything you put in a vault is encrypted on your computer before it is uploaded, and decrypted again only on the computer of a
vault member. File contents **and** file and folder names are encrypted; the S3 bucket holds only ciphertext.

Neither Katta Server nor the storage provider ever holds the vault keys or sees plaintext: Katta Server stores the vault metadata
only as a JWE, and the bucket stores only encrypted objects. A Katta Server administrator, an infrastructure operator, or the
storage provider therefore cannot read your data.

See the [Security Architecture](../arch/SECURITY.md) and
[E2E-Encrypted Data Sync](../introduction/OVERVIEW.md#e2e-encrypted-data-sync-in-static-and-sts-storage-access-modes) for details.

:::

