# Mibera Collection Research

**Updated:** 2026-01-31  
**Data Source:** Dune Sim API

---

## Collections Found

### 1. Mibera (Lore Posters)
- **Contract:** `0x5c1bdc4502e29c4c425510c3923adbd4274f247b`
- **Chain:** Optimism
- **Type:** ERC-1155
- **Content:** Lore poster artwork (tokens 1-7 for different lore pieces)
- **Metadata:** `ipfs://bafybeifsttxkdtp352b5qsei3v223tmecuxmadquxhoxooaxlmneguc424/{id}`

### 2. Mibera Sets
- **Contract:** `0x886d2176d899796cd1affa07eff07b9b2b80f1be`
- **Chain:** Optimism
- **Type:** ERC-1155
- **Content:** Collectible sets (e.g., "Honey Road Music")
- **Metadata:** Arweave `ar://uH9kbQ3egPRlI34MEoIIe1zHr49_Aqy3xixW-gtib58/{id}.json`
- **Traits observed:** Origin, Set Type

### 3. Wagmibera
- **Contract:** `0x762ad02a981562a591314d7a8a06ced6be6ae271`
- **Chain:** Arbitrum
- **Type:** ERC-721
- **Content:** Appears to be a derivative/related collection
- **Metadata:** `ipfs://QmTekCchdNoUzTgCWyddC1GpTag5Tx7Zxy3MHPUTsSfteH/{id}`

---

## What I Was Looking For

Based on the MiberaMaker design documents, the generative Mibera pfps should have:
- **Archetype:** Chicago/Detroit/NY, Milady, Freetekno, Acid House
- **Element:** Air, Water, Earth, Fire
- **Molecule:** 64 drug dyads (e.g., DMT/Ayahuasca)
- **Astrology:** Sun, Moon, Rising signs
- **Swag Score:** Calculated from trait combinations

---

## Status

The collections in this wallet appear to be:
1. **Lore collectibles** (posters, sets) — NOT the generative pfps
2. **Derivatives** (Wagmibera)

**Question for Jani:** Has the generative Mibera pfp collection (with full trait system) launched yet? Or is MiberaMaker still in development?

---

## Wallet Analyzed

`0xe822ecac55a3a20bb4b24cdd83401eaa73dd3bb4`

Mibera-related holdings:
- Mibera lore posters: tokens 1-7
- Mibera Sets: tokens 9, 10, 11
- Wagmibera: token 42

---

## Dune Sim API Notes

**Endpoint:** `GET https://api.sim.dune.com/v1/evm/collectibles/{address}`
**Header:** `X-Sim-Api-Key: [key]`
**Docs:** https://docs.sim.dune.com/

Works well for listing NFTs with metadata. Can also get images via:
`https://api.sim.dune.com/v1/evm/collectible/image/{chainId}/{contract}/{tokenId}`

---

*Researched: 2026-01-31*
