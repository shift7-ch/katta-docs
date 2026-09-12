---
title: Admin CLI
sidebar_position: 1
description: Configure a Katta Server and its S3 storage backend from the command line.
---

# Admin CLI


Use [Katta Admin CLI]( https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme) to configure a Katta Server including its S3 storage backend. 

## Installation

### macOS (Homebrew)

Requires Apple Silicon (arm64).

```bash
brew tap shift7-ch/katta
brew trust shift7-ch/katta
brew install katta
```

Upgrade with `brew upgrade katta`.

### Linux (Debian/Ubuntu)

```bash
curl -fsSLO https://github.com/shift7-ch/katta-clientlib/releases/latest/download/katta_amd64.deb
sudo apt install ./katta_amd64.deb
```

### Linux (Fedora/RHEL/openSUSE)

```bash
sudo rpm -i https://github.com/shift7-ch/katta-clientlib/releases/latest/download/katta.x86_64.rpm
```

The `.deb` and `.rpm` packages install `katta` to `/usr/bin/katta` and a bash
completion script to `/usr/share/bash-completion/completions/katta`. They are
built for x86_64/amd64 only.

## Usage
Use `--help` to print available commands.

```bash
katta --help
Usage: katta [-h] [-V] [COMMAND]
  -h, --help      Show this help message and exit.
  -V, --version   Print version information and exit.
Commands:
  setup           Setup Storage Provider Integration
  storageprofile  Configure Storage Location
  accesstoken     Get access token using authorization code flow.
  completion      Generate a bash completion script for the katta CLI.
  help            Display help information about the specified command.
```

Run `--help` on commands for the full option list:

```shell
katta storageprofile minio sts --help
katta storageprofile s3 static --help
```

:::note[Authentication]
The `storageprofile` and `accesstoken` commands require the `admin` role. Make sure to log in with an admin user when prompted from the CLI to open the authorization URL. 
:::

