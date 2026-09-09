---
title: Admin CLI
sidebar_position: 3
description: Configure a Katta Server and its S3 storage backend from the command line.
---

# Admin CLI


Use [Katta Admin CLI]( https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#readme) to configure a Katta Server including its S3 storage backend. 

## Installation

Follow the [installation instructions](https://github.com/shift7-ch/katta-clientlib/tree/main/admin-cli#installation) for macOS or Linux.

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

