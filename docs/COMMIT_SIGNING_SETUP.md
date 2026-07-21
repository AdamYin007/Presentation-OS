# Commit Signing Setup

This repository encourages signed commits for integrity and non-repudiation.

## Current State

As of this writing, no GPG or SSH signing key is configured in Git. This does **not** block the IP protection work — it is recorded as a recommended follow-up.

## macOS Setup (GPG + Git)

### 1. Install tools

```bash
brew install gpg git
```

### 2. Generate a GPG key

```bash
gpg --full-generate-key
# Choose: RSA or EdDSA, 4096 bits, no expiry (or long expiry)
# Enter your real name and GitHub email
```

### 3. List keys and copy the long key ID

```bash
gpg --list-secret-keys --keyid-format LONG
# Output: sec   rsa4096/ABCDEF1234567890 ...
# Copy ABCDEF1234567890
```

### 4. Add public key to GitHub

```bash
gpg --armor --export ABCDEF1234567890 | pbcopy
# Then paste at: https://github.com/settings/keys
```

### 5. Configure Git

```bash
git config --global user.signingkey ABCDEF1234567890
git config --global commit.gpgsign true
git config --global tag.gpgSign true
```

### 6. Verify

```bash
git commit -S -m "test: verify signed commit"
git log --show-signature -1
```

## macOS Setup (SSH Signing) — Alternative

GitHub supports SSH-signed commits since 2022. This may be simpler if you already use SSH keys.

### 1. Create signing key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "presentation-os-signing@github" -f ~/.ssh/id_ed25519_signing
```

### 2. Add public key to GitHub

```bash
cat ~/.ssh/id_ed25519_signing.pub
# Paste at: https://github.com/settings/keys (choose "Signing key")
```

### 3. Configure Git

```bash
git config --global gpg.ssh.defaultKeyFile ~/.ssh/id_ed25519_signing
git config --global commit.gpgsign true
git config --global user.signingkey "$(cat ~/.ssh/id_ed25519_signing.pub)"
```

### 4. Configure SSH agent

Add to `~/.ssh/config`:

```
Host github.com
  AddKeysToAgent yes
  IdentityFile ~/.ssh/id_ed25519_signing
```

## Linux Setup

```bash
sudo apt-get install gnupg2 git
gpg --full-generate-key
gpg --armor --export <KEY_ID> | xclip -selection clipboard
# Paste to GitHub Settings > SSH Signing Keys
git config --global user.signingkey <KEY_ID>
git config --global commit.gpgsign true
```

## Verifying Signed Commits on GitHub

After pushing a signed commit, it will show a "Verified" badge. You can also verify locally:

```bash
git log --show-signature -1
```

## Important Notes

- **Do NOT share private keys.** Never commit `.gpg` private key files, `id_rsa`, `id_ed25519`, or any private key material.
- **Do NOT auto-upload private keys** to any service without explicit authorization.
- If you cannot set up signing immediately, unsigned commits are not blocked — but signed commits should be used for release tags and critical changes.
- This setup guide does not constitute legal or security certification.
