# Pharos Testnet Bot

![Pharos Network](https://cdn.prod.website-files.com/67dcd1631de3a405ce797877/681b3e1c10442d4b915b7896_AD_4nXdTwAajVLXzZ5693lMIi7OXfUISTpHQAmkCxUJcSS_KIYsPesywLhcbJzdA4HSKFjkTHg9KnPGEkou9Cf1BIx5d0oSRLH5pmJ1_yEJTyWmMeC-C88NrLDKQCNP-Zfkq_byUUHApCA.png)

This sophisticated bot automates multiple operations on the Pharos Testnet, including points farming and lending operations. Designed for efficiency and reliability, it features color-coded logging, proxy support, and comprehensive error handling.

## Features ✨

- **Multi-Wallet Support**: Process multiple wallets sequentially
- **Points Farming**:
  - Token transfers
  - PHRS wrapping/unwrapping
  - Token swaps (WPHRS ↔ USDC/USDT)
  - Liquidity pool additions
- **Lending Operations**:
  - Faucet token minting (6+ assets)
  - Collateral deposits (PHRS & ERC20)
  - Asset borrowing
  - Fund withdrawals
- **Automated Verification**:
  - Daily check-ins
  - Faucet claims
  - Task verification
- **Advanced Infrastructure**:
  - Proxy rotation (HTTP/HTTPS)
  - Random user agents
  - Retry mechanisms
  - Gas optimization

## Prerequisites 📋

- Node.js v18+
- Yarn/NPM
- Pharos Testnet accounts
- RPC endpoint access

## Installation 🛠️

1. Clone repository:
```bash
git clone https://github.com/dicoderin/pharos.git
cd pharos
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Create `.env` file:
```env
PRIVATE_KEY_1=your_main_private_key
PRIVATE_KEY_2=secondary_private_key
# Add more keys as needed

# Optional configurations
DEBUG_MODE=true
NUM_SWAPS=25
NUM_LPS=15
DELAY_MINUTES=240
```

4. Create `proxies.txt` (optional):
```text
http://user:pass@ip:port
socks5://user:pass@ip:port
```

## Configuration ⚙️

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PRIVATE_KEY_[n]` | - | Wallet private keys |
| `DEBUG_MODE` | `false` | Enable debug logging |
| `NUM_TRANSFERS` | `1` | Transfer operations per cycle |
| `NUM_WRAPS` | `1` | Wrap operations per cycle |
| `NUM_SWAPS` | `20` | Swap operations per cycle |
| `NUM_LPS` | `20` | Liquidity operations per cycle |
| `DELAY_MINUTES` | `300` | Minutes between cycles |

### Network Settings
```javascript
const NETWORK_CONFIG = {
  name: 'Pharos Testnet',
  rpc: 'https://testnet.dplabs-internal.com',
  chainId: 688688,
  symbol: 'PHRS',
  explorer: 'https://testnet.pharosscan.xyz/tx/'
};
```

## Usage 🚀

Run the bot:
```bash
node index.js
```

### Operations Flow
1. Wallet initialization
2. Daily check-in and authentication
3. Faucet claiming
4. Points farming:
   - Token transfers
   - Wrapping operations
   - Token swaps
   - Liquidity provision
5. Lending operations:
   - Token minting
   - Collateral deposits
   - Asset borrowing
   - Fund withdrawals
6. Cycle completion delay

### Sample Output
```
==============================================
 Pharos Testnet Bot - Points Farming Mode
==============================================

→ Wallet 1/3 • 0x5F3...dC4A

[•] Mengautentikasi dengan API Pharos
[+] Autentikasi berhasil!
[→] Melakukan daily check-in...
[+] Check-in berhasil
[→] Mengklaim faucet...
[+] Faucet berhasil diklaim

[SWAP] 0/20 completed
[→] Menukar 0.0001 WPHRS ke USDC...
→ TX SWAP: https://testnet.pharosscan.xyz/tx/0x3d...a1c (PENDING)
[•] Mengkonfirmasi transaksi 0x3d7ba1c...1/20
→ TX SWAP: https://testnet.pharosscan.xyz/tx/0x3d...a1c (CONFIRMED)
[+] Task terverifikasi: 0x3d7ba1c...

... additional operations ...

[+] Siklus farming selesai untuk semua wallet
```

## Logging System 📝

| Log Type | Color | Prefix | Description |
|----------|-------|--------|-------------|
| INFO | Green | [✓] | General information |
| WALLET | Yellow | → | Wallet-specific operations |
| WARN | Yellow | [!] | Warnings |
| ERROR | Red | [✗] | Critical errors |
| SUCCESS | Green | [+] | Successful operations |
| LOADING | Cyan | [•] | In-progress operations |
| STEP | Blue | → | Operation steps |
| TRANSACTION | Cyan | → | Tx details with explorer link |

## Disclaimer ⚠️

**USE AT YOUR OWN RISK**

1. This is experimental software
2. Testnet operations only - no real funds
3. Maintain sufficient testnet pharos ETH for gas
4. Monitor bot operations regularly
5. Compliance with Pharos Testnet ToS required

## License 📄
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
**Note:** This bot is for educational purposes only. Always comply with the terms of service of any blockchain network you interact with.
