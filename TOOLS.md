# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## My Setup

### GitHub
- **Repository:** https://github.com/janitooor/legba
- **Workspace branch:** `legba/workspace`
- **Git identity:** `Clawd Agent <agent@clawd.bot>`
- **Commit regularly!** Don't let work go unpushed.

Add whatever helps you do your job. This is your cheat sheet.

### Wallet
- **Address:** `0x7D26dB0443Fd89b6a135524A47cE6b3Db686E801`
- **Keys:** Stored in `.secrets/wallet.json` (gitignored, chmod 600)
- **Purpose:** Receiving Mibera NFT, onchain identity
- **Chain:** Berachain (chain ID 80094) for Mibera
