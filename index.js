require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const randomUseragent = require('random-useragent');
const axios = require('axios');

// ==============================
// KONFIGURASI WARNA
// ==============================
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m"
};

// ==============================
// LOGGER TANPA ANIMASI
// ==============================
const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}→ ${colors.bold}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[!] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${colors.bold}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[+] ${colors.bold}${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[•] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.blue}→ ${msg}${colors.reset}`),
  debug: (msg) => process.env.DEBUG_MODE === 'true' ? console.log(`${colors.yellow}[DEBUG] ${msg}${colors.reset}`) : null,
  
  banner: (mode) => {
    console.log(`\n${colors.magenta}${colors.bold}==============================================`);
    console.log(`          Pharos Testnet Bot - ${mode} Mode`);
    console.log(`==============================================${colors.reset}\n`);
  },
  
  transaction: (hash, action, status = 'PENDING', details = '') => {
    const statusColor = status === 'CONFIRMED' ? colors.green : (status === 'FAILED' ? colors.red : colors.yellow);
    const statusText = status === 'CONFIRMED' ? '✓ CONFIRMED' : (status === 'FAILED' ? '✗ FAILED' : '⧗ PENDING');
    
    console.log(`${colors.cyan}→ TX ${action}: ${colors.bold}${NETWORK_CONFIG.explorer}${hash}${colors.reset}`);
    console.log(`${statusColor}   Status: ${statusText}${details ? ` | Details: ${details}` : ''}${colors.reset}`);
    
    if (details) {
      console.log(`${colors.white}   Details: ${details}${colors.reset}`);
    }
  },
  
  operationProgress: (operation, current, total) => {
    console.log(`${colors.cyan}[${operation}] ${current}/${total} completed${colors.reset}`);
  }
};

// ==============================
// KONFIGURASI GLOBAL
// ==============================
// Konfigurasi Jaringan
const NETWORK_CONFIG = {
  name: 'Pharos Testnet',
  rpc: 'https://testnet.dplabs-internal.com',
  chainId: 688688,
  symbol: 'PHRS',
  explorer: 'https://testnet.pharosscan.xyz/tx/'
};

// Konfigurasi Farming Poin
const POINTS_CONFIG = {
  contracts: {
    multicall: '0x1a4de519154ae51200b0ad7c90f7fac75547888a',
    positionManager: '0xF8a1D4FF0f9b9Af7CE58E1fc1833688F3BFd6115'
  },
  tokens: {
    USDC: '0xad902cf99c2de2f1ba5ec4d642fd7e49cae9ee37',
    WPHRS: '0x76aaada469d23216be5f7c596fa25f282ff9b364',
    USDT: '0xed59de2d7ad9c043442e381231ee3646fc3c2939'
  },
  tokenDecimals: {
    WPHRS: 18,
    USDC: 6,
    USDT: 6
  },
  api: {
    baseUrl: 'https://api.pharosnetwork.xyz',
    endpoints: {
      profile: '/user/profile',
      verify: '/task/verify',
      login: '/user/login',
      faucetStatus: '/faucet/status',
      faucetClaim: '/faucet/daily',
      checkIn: '/sign/in'
    }
  },
  tasks: {
    SWAP: 103,
    TRANSFER: 103,
    WRAP: 103,
    ADD_LIQUIDITY: 103
  },
  operations: {
    transfers: parseInt(process.env.NUM_TRANSFERS) || 1,
    wraps: parseInt(process.env.NUM_WRAPS) || 1,
    swaps: parseInt(process.env.NUM_SWAPS) || 20,
    lps: parseInt(process.env.NUM_LPS) || 20,
    delayMinutes: parseInt(process.env.DELAY_MINUTES) || 300
  }
};

// Konfigurasi Lending
const LENDING_CONFIG = {
  contracts: {
    LENDING_POOL: '0xa8e550710bf113db6a1b38472118b8d6d5176d12',
    FAUCET: '0x2e9d89d372837f71cb529e5ba85bfbc1785c69cd',
    SUPPLY_CONTRACT: '0xad3b4e20412a097f87cd8e8d84fbbe17ac7c89e9',
    TOKENS: {
      NVIDIA: '0x3299cc551b2a39926bf14144e65630e533df6944',
      USDT: '0x0b00fb1f513e02399667fba50772b21f34c1b5d9',
      USDC: '0x48249feeb47a8453023f702f15cf00206eebdf08',
      GOLD: '0x77f532df5f46ddff1c97cdae3115271a523fa0f4',
      TSLA: '0xcda3df4aab8a571688fe493eb1bdc1ad210c09e4',
      BTC: '0xa4a967fc7cf0e9815bf5c2700a055813628b65be'
    }
  },
  tokenDecimals: {
    USDT: 6,
    USDC: 6,
    BTC: 6,
    NVIDIA: 18,
    GOLD: 18,
    TSLA: 18
  },
  abi: {
    ERC20: [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function balanceOf(address account) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function transfer(address recipient, uint256 amount) external returns (bool)"
    ],
    FAUCET: [
      "function mint(address _asset, address _account, uint256 _amount) external"
    ],
    LENDING_POOL: [
      "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) external payable",
      "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external",
      "function withdraw(address asset, uint256 amount, address to) external",
      "function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
      "function getUserAccountData(address user) external view returns (uint256, uint256, uint256, uint256, uint256, uint256)"
    ]
  },
  operations: {
    supplyAmount: 0.001,
    borrowAmount: 0.0001,
    mintAmount: 1
  }
};

// ==============================
// UTILITAS
// ==============================
class Utils {
  static loadProxies() {
    try {
      if (!fs.existsSync('proxies.txt')) {
        logger.warn('proxies.txt tidak ditemukan, menggunakan koneksi langsung');
        return [];
      }
      return fs.readFileSync('proxies.txt', 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);
    } catch (error) {
      logger.warn(`Proxy error: ${error.message}`);
      return [];
    }
  }

  static getRandomProxy(proxies) {
    return proxies.length ? proxies[Math.floor(Math.random() * proxies.length)] : null;
  }

  static getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static getRandomDelay(min = 1000, max = 2000) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getWalletKeys() {
    const keys = [];
    let i = 1;
    while (process.env[`PRIVATE_KEY_${i}`]) {
      keys.push(process.env[`PRIVATE_KEY_${i}`]);
      i++;
    }
    if (keys.length === 0) {
      logger.error('Tidak ada private key di environment');
      process.exit(1);
    }
    return keys;
  }

  static createProxyAgent(proxyUrl) {
    try {
      if (!proxyUrl) return null;
      return new HttpsProxyAgent(proxyUrl);
    } catch (error) {
      logger.error(`Proxy agent error: ${error.message}`);
      return null;
    }
  }
  
  static formatTokenAmount(amount, decimals) {
    return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(decimals > 6 ? 6 : decimals);
  }
}

// ==============================
// OPERASI BLOCKCHAIN
// ==============================
class Blockchain {
  static setupProvider(proxy = null) {
    const providerOptions = {
      chainId: NETWORK_CONFIG.chainId,
      name: NETWORK_CONFIG.name
    };
    
    const fetchOptions = {};
    if (proxy) {
      const agent = Utils.createProxyAgent(proxy);
      if (agent) {
        fetchOptions.agent = agent;
        fetchOptions.headers = { 'User-Agent': randomUseragent.getRandom() };
      }
    }
    
    return new ethers.JsonRpcProvider(
      NETWORK_CONFIG.rpc,
      providerOptions,
      fetchOptions
    );
  }

  static async waitForTransaction(provider, txHash, action = '') {
    // TINGKATKAN MENJADI 20X PERCOBAAN
    for (let i = 1; i <= 20; i++) {
      try {
        logger.loading(`Mengkonfirmasi transaksi ${txHash.slice(0, 12)}...${i}/20`);
        const receipt = await provider.getTransactionReceipt(txHash);
        if (receipt && receipt.blockNumber) {
          const details = `Block: ${receipt.blockNumber} | Gas: ${ethers.formatUnits(receipt.gasUsed * receipt.gasPrice, 'gwei')} gwei`;
          if (receipt.status === 1) {
            logger.transaction(txHash, action, 'CONFIRMED', details);
          } else {
            logger.transaction(txHash, action, 'FAILED', details);
          }
          return receipt;
        }
        await Utils.sleep(5000);
      } catch (error) {
        logger.error(`Tx confirmation error: ${error.message}`);
        await Utils.sleep(10000);
      }
    }
    throw new Error('Gagal mendapatkan receipt transaksi');
  }

  static async checkBalanceAndApproval(wallet, tokenSymbol, amount) {
    try {
      const tokenAddress = POINTS_CONFIG.tokens[tokenSymbol];
      const decimals = POINTS_CONFIG.tokenDecimals[tokenSymbol];
      if (!tokenAddress || decimals === undefined) {
        logger.error(`Token tidak valid: ${tokenSymbol}`);
        return false;
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) public returns (bool)"
        ],
        wallet
      );

      const required = ethers.parseUnits(amount.toString(), decimals);
      const balance = await tokenContract.balanceOf(wallet.address);
      
      if (balance < required) {
        logger.warn(`Saldo ${tokenSymbol} tidak cukup: ${ethers.formatUnits(balance, decimals)} < ${amount}`);
        return false;
      }

      const spender = tokenSymbol === 'WPHRS' 
        ? POINTS_CONFIG.contracts.positionManager 
        : POINTS_CONFIG.contracts.multicall;
      
      const allowance = await tokenContract.allowance(wallet.address, spender);
      if (allowance >= required) return true;

      logger.step(`Menyetujui ${tokenSymbol}...`);
      const tx = await tokenContract.approve(spender, ethers.MaxUint256, { gasLimit: 200_000 });
      logger.transaction(tx.hash, 'APPROVAL');
      await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'APPROVAL');
      return true;
    } catch (error) {
      logger.error(`Persetujuan gagal: ${error.message}`);
      return false;
    }
  }
  
  static async getTokenBalance(wallet, tokenAddress, decimals = 18) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        LENDING_CONFIG.abi.ERC20,
        wallet
      );
      const balance = await tokenContract.balanceOf(wallet.address);
      return {
        raw: balance,
        formatted: parseFloat(ethers.formatUnits(balance, decimals))
      };
    } catch (error) {
      logger.error(`Gagal mendapatkan saldo token: ${error.message}`);
      return { raw: 0n, formatted: 0 };
    }
  }
}

// ==============================
// OPERASI API
// ==============================
class API {
  static getHeaders(jwt = null) {
    return {
      'accept': 'application/json, text/plain, */*',
      'authorization': jwt ? `Bearer ${jwt}` : '',
      'sec-ch-ua': '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'Referer': 'https://testnet.pharosnetwork.xyz/',
      'User-Agent': randomUseragent.getRandom()
    };
  }

  static async request(method, endpoint, proxy, data = null, jwt = null) {
    const url = `${POINTS_CONFIG.api.baseUrl}${endpoint}`;
    const options = {
      method,
      url,
      headers: API.getHeaders(jwt),
      timeout: 30000
    };

    if (proxy) {
      options.httpsAgent = new HttpsProxyAgent(proxy);
    }
    if (data) {
      options.data = data;
      options.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await axios(options);
      return response.data;
    } catch (error) {
      const errorMsg = error.response 
        ? `${error.response.status} ${error.response.data?.msg || error.message}` 
        : error.message;
      logger.error(`API error: ${errorMsg}`);
      return null;
    }
  }

  static async login(wallet, proxy) {
    try {
      logger.loading('Mengautentikasi dengan API Pharos');
      const signature = await wallet.signMessage("pharos");
      const endpoint = `${POINTS_CONFIG.api.endpoints.login}?address=${wallet.address}&signature=${signature}&invite_code=S6NGMzXSCDBxhnwo`;
      
      const response = await API.request('post', endpoint, proxy);
      if (!response || response.code !== 0 || !response.data?.jwt) {
        logger.error('Autentikasi gagal');
        return null;
      }
      
      logger.success('Autentikasi berhasil!');
      return response.data.jwt;
    } catch (error) {
      logger.error(`Autentikasi error: ${error.message}`);
      return null;
    }
  }

  static async verifyTask(wallet, proxy, jwt, txHash, taskType) {
    const taskId = POINTS_CONFIG.tasks[taskType];
    // TINGKATKAN MENJADI 20X PERCOBAAN
    for (let i = 1; i <= 20; i++) {
      try {
        logger.step(`Memverifikasi task (${i}/20): ${txHash}`);
        const endpoint = `${POINTS_CONFIG.api.endpoints.verify}?address=${wallet.address}&task_id=${taskId}&tx_hash=${txHash}`;
        const response = await API.request('post', endpoint, proxy, null, jwt);
        
        if (response?.code === 0 && response.data?.verified) {
          logger.success(`Task terverifikasi: ${txHash}`);
          return true;
        }
      } catch (error) {
        logger.error(`Verifikasi attempt ${i} gagal: ${error.message}`);
      }
      await Utils.sleep(5000);
    }
    logger.error(`Verifikasi task gagal setelah 20 percobaan`);
    return false;
  }

  static async claimFaucet(wallet, proxy, jwt) {
    try {
      logger.step('Mengklaim faucet...');
      const endpoint = `${POINTS_CONFIG.api.endpoints.faucetClaim}?address=${wallet.address}`;
      const response = await API.request('post', endpoint, proxy, null, jwt);
      
      if (!response || response.code !== 0) {
        logger.error('Klaim faucet gagal');
        return false;
      }
      
      logger.success('Faucet berhasil diklaim');
      return true;
    } catch (error) {
      logger.error(`Klaim faucet error: ${error.message}`);
      return false;
    }
  }

  static async performCheckIn(wallet, proxy) {
    try {
      logger.step('Melakukan daily check-in...');
      const jwt = await API.login(wallet, proxy);
      if (!jwt) return null;
      
      const response = await API.request(
        'post', 
        POINTS_CONFIG.api.endpoints.checkIn, 
        proxy, 
        { address: wallet.address }, 
        jwt
      );
      
      if (response?.code === 0) {
        logger.success('Check-in berhasil');
      } else {
        logger.warn(`Check-in gagal: ${response?.msg || 'Unknown error'}`);
      }
      return jwt;
    } catch (error) {
      logger.error(`Check-in error: ${error.message}`);
      return null;
    }
  }
}

// ==============================
// OPERASI FARMING POIN
// ==============================
class PointsFarming {
  static async swap(wallet, provider, jwt, proxy) {
    try {
      const pairs = [
        { from: 'WPHRS', to: 'USDC', amount: 0.0001 },
        { from: 'WPHRS', to: 'USDT', amount: 0.0001 }
      ];
      const pair = Utils.getRandomElement(pairs);
      
      if (!(await Blockchain.checkBalanceAndApproval(wallet, pair.from, pair.amount))) {
        return;
      }

      const contract = new ethers.Contract(
        POINTS_CONFIG.contracts.multicall,
        [{
          name: 'multicall',
          inputs: [
            { type: 'uint256', name: 'deadline' },
            { type: 'bytes[]', name: 'data' }
          ],
          stateMutability: 'nonpayable',
          type: 'function'
        }],
        wallet
      );

      const fromDecimals = POINTS_CONFIG.tokenDecimals[pair.from];
      const scaledAmount = ethers.parseUnits(pair.amount.toString(), fromDecimals);
      
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
        [
          POINTS_CONFIG.tokens[pair.from],
          POINTS_CONFIG.tokens[pair.to],
          500, // fee
          wallet.address,
          scaledAmount,
          0,
          0
        ]
      );
      
      logger.step(`Menukar ${pair.amount} ${pair.from} ke ${pair.to}...`);
      const tx = await contract.multicall(
        Math.floor(Date.now() / 1000) + 300,
        ['0x04e45aaf' + data.slice(2)],
        { gasLimit: 500_000 }
      );
      
      logger.transaction(tx.hash, 'SWAP', 'PENDING', `Swap ${pair.amount} ${pair.from} → ${pair.to}`);
      const receipt = await Blockchain.waitForTransaction(provider, tx.hash, 'SWAP');
      if (receipt.status === 1) {
        await API.verifyTask(wallet, proxy, jwt, tx.hash, 'SWAP');
      }
    } catch (error) {
      logger.error(`Swap gagal: ${error.message}`);
    }
  }

  static async transfer(wallet, provider, jwt, proxy) {
    try {
      const amount = 0.00001;
      const toAddress = ethers.Wallet.createRandom().address;
      
      const balance = await provider.getBalance(wallet.address);
      const required = ethers.parseEther(amount.toString());
      
      if (balance < required) {
        logger.warn(`PHRS tidak cukup: ${ethers.formatEther(balance)}`);
        return;
      }
      
      logger.step(`Mentransfer ${amount} PHRS ke ${toAddress.slice(0, 8)}...`);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: required,
        gasLimit: 50_000
      });
      
      logger.transaction(tx.hash, 'TRANSFER', 'PENDING', `Kirim ${amount} PHRS`);
      const receipt = await Blockchain.waitForTransaction(provider, tx.hash, 'TRANSFER');
      if (receipt.status === 1) {
        await API.verifyTask(wallet, proxy, jwt, tx.hash, 'TRANSFER');
      }
    } catch (error) {
      logger.error(`Transfer gagal: ${error.message}`);
    }
  }

  static async wrap(wallet, provider, jwt, proxy) {
    try {
      const amount = 0.0001;
      const balance = await provider.getBalance(wallet.address);
      const amountWei = ethers.parseEther(amount.toString());
      
      if (balance < amountWei) {
        logger.warn(`PHRS tidak cukup: ${ethers.formatEther(balance)}`);
        return;
      }
      
      const wphrsContract = new ethers.Contract(
        POINTS_CONFIG.tokens.WPHRS,
        [{ 
          name: 'deposit', 
          type: 'function', 
          stateMutability: 'payable' 
        }],
        wallet
      );
      
      logger.step(`Mengubah ${amount} PHRS menjadi WPHRS...`);
      const tx = await wphrsContract.deposit({ 
        value: amountWei, 
        gasLimit: 150_000 
      });
      
      logger.transaction(tx.hash, 'WRAP', 'PENDING', `Wrap ${amount} PHRS`);
      const receipt = await Blockchain.waitForTransaction(provider, tx.hash, 'WRAP');
      if (receipt.status === 1) {
        await API.verifyTask(wallet, proxy, jwt, tx.hash, 'WRAP');
      }
    } catch (error) {
      logger.error(`Wrap gagal: ${error.message}`);
    }
  }

  // FITUR BARU: ADD LIQUIDITY
  static async addLiquidity(wallet, provider, jwt, proxy) {
    try {
      const pools = [
        { tokenA: 'WPHRS', tokenB: 'USDC', amountA: 0.0001, amountB: 0.01 },
        { tokenA: 'WPHRS', tokenB: 'USDT', amountA: 0.0001, amountB: 0.01 }
      ];
      const pool = Utils.getRandomElement(pools);
      
      // Periksa saldo dan persetujuan untuk kedua token
      if (!(await Blockchain.checkBalanceAndApproval(wallet, pool.tokenA, pool.amountA))) return;
      if (!(await Blockchain.checkBalanceAndApproval(wallet, pool.tokenB, pool.amountB))) return;

      const contract = new ethers.Contract(
        POINTS_CONFIG.contracts.positionManager,
        [{
          name: 'multicall',
          inputs: [
            { type: 'bytes[]', name: 'data' }
          ],
          stateMutability: 'payable',
          type: 'function'
        }],
        wallet
      );

      const decimalsA = POINTS_CONFIG.tokenDecimals[pool.tokenA];
      const decimalsB = POINTS_CONFIG.tokenDecimals[pool.tokenB];
      
      const amountADesired = ethers.parseUnits(pool.amountA.toString(), decimalsA);
      const amountBDesired = ethers.parseUnits(pool.amountB.toString(), decimalsB);
      
      const mintParams = {
        token0: POINTS_CONFIG.tokens[pool.tokenA],
        token1: POINTS_CONFIG.tokens[pool.tokenB],
        fee: 500,
        tickLower: -887220,
        tickUpper: 887220,
        amount0Desired: amountADesired,
        amount1Desired: amountBDesired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 300
      };
      
      const data = ethers.AbiCoder.defaultAbiCoder().encode(
        [
          'address', 'address', 'uint24', 'int24', 'int24', 
          'uint256', 'uint256', 'uint256', 'uint256', 'address', 'uint256'
        ],
        [
          mintParams.token0,
          mintParams.token1,
          mintParams.fee,
          mintParams.tickLower,
          mintParams.tickUpper,
          mintParams.amount0Desired,
          mintParams.amount1Desired,
          mintParams.amount0Min,
          mintParams.amount1Min,
          mintParams.recipient,
          mintParams.deadline
        ]
      );
      
      logger.step(`Menambahkan likuiditas ${pool.tokenA}/${pool.tokenB}...`);
      const tx = await contract.multicall(
        ['0x88316456' + data.slice(2)],
        { gasLimit: 800_000 }
      );
      
      logger.transaction(tx.hash, 'ADD_LIQUIDITY', 'PENDING', `Tambah likuiditas ${pool.amountA} ${pool.tokenA} + ${pool.amountB} ${pool.tokenB}`);
      const receipt = await Blockchain.waitForTransaction(provider, tx.hash, 'ADD_LIQUIDITY');
      if (receipt.status === 1) {
        await API.verifyTask(wallet, proxy, jwt, tx.hash, 'ADD_LIQUIDITY');
      }
    } catch (error) {
      logger.error(`Add liquidity gagal: ${error.message}`);
    }
  }

  static async executeOperations(wallet, provider, jwt, proxy) {
    const operations = [
      { 
        name: 'TRANSFER', 
        count: POINTS_CONFIG.operations.transfers, 
        fn: PointsFarming.transfer 
      },
      { 
        name: 'WRAP', 
        count: POINTS_CONFIG.operations.wraps, 
        fn: PointsFarming.wrap 
      },
      { 
        name: 'SWAP', 
        count: POINTS_CONFIG.operations.swaps, 
        fn: PointsFarming.swap 
      },
      // FITUR BARU: ADD LIQUIDITY
      { 
        name: 'ADD_LIQUIDITY', 
        count: POINTS_CONFIG.operations.lps, 
        fn: PointsFarming.addLiquidity 
      }
    ];

    for (const op of operations) {
      logger.operationProgress(op.name, 0, op.count);
      
      for (let i = 0; i < op.count; i++) {
        await op.fn(wallet, provider, jwt, proxy);
        logger.operationProgress(op.name, i + 1, op.count);
        
        // Jeda acak antar operasi
        const delay = Utils.getRandomDelay(2000, 5000);
        await Utils.sleep(delay);
      }
    }
  }

  static async run(wallets, proxies) {
    logger.banner('Points Farming');
    
    for (const [index, privateKey] of wallets.entries()) {
      const proxy = Utils.getRandomProxy(proxies);
      const provider = Blockchain.setupProvider(proxy);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      console.log(`\n${colors.yellow}${colors.bold}Wallet ${index + 1}/${wallets.length} • ${wallet.address}${colors.reset}\n`);
      
      try {
        const jwt = await API.performCheckIn(wallet, proxy);
        if (!jwt) continue;
        
        await API.claimFaucet(wallet, proxy, jwt);
        await PointsFarming.executeOperations(wallet, provider, jwt, proxy);
        
        // Jeda antar wallet
        logger.loading(`Mempersiapkan wallet berikutnya...`);
        await Utils.sleep(15000);
      } catch (error) {
        logger.error(`Wallet ${index+1} gagal: ${error.message}`);
      }
    }
    
    logger.success('Siklus farming selesai untuk semua wallet');
  }
}

// ==============================
// OPERASI LENDING LENGKAP
// ==============================
class LendingAutomation {
  static async mintFaucetToken(wallet, tokenSymbol) {
    try {
      const tokenAddress = LENDING_CONFIG.contracts.TOKENS[tokenSymbol];
      if (!tokenAddress) {
        logger.error(`Token ${tokenSymbol} tidak ditemukan`);
        return false;
      }
      
      const decimals = LENDING_CONFIG.tokenDecimals[tokenSymbol] || 18;
      const amountWei = ethers.parseUnits(
        LENDING_CONFIG.operations.mintAmount.toString(), 
        decimals
      );
      
      const faucetContract = new ethers.Contract(
        LENDING_CONFIG.contracts.FAUCET,
        LENDING_CONFIG.abi.FAUCET,
        wallet
      );
      
      logger.step(`Mencetak ${tokenSymbol}...`);
      const tx = await faucetContract.mint(
        tokenAddress,
        wallet.address,
        amountWei,
        { gasLimit: 150000 }
      );
      
      logger.transaction(tx.hash, 'MINT', 'PENDING', `Mint ${LENDING_CONFIG.operations.mintAmount} ${tokenSymbol}`);
      const receipt = await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'MINT');
      if (receipt.status === 1) {
        logger.success(`Berhasil mencetak ${tokenSymbol}`);
        return true;
      }
    } catch (error) {
      logger.error(`Mint ${tokenSymbol} gagal: ${error.message}`);
    }
    return false;
  }
  
  static async depositPHRS(wallet, amount) {
    try {
      const lendingPoolContract = new ethers.Contract(
        LENDING_CONFIG.contracts.LENDING_POOL,
        LENDING_CONFIG.abi.LENDING_POOL,
        wallet
      );
      
      const amountWei = ethers.parseEther(amount.toString());
      logger.step(`Menyimpan ${amount} PHRS ke lending pool...`);
      
      const tx = await lendingPoolContract.depositETH(
        LENDING_CONFIG.contracts.LENDING_POOL,
        wallet.address,
        0, // referralCode
        { value: amountWei, gasLimit: 300000 }
      );
      
      logger.transaction(tx.hash, 'DEPOSIT_PHRS', 'PENDING', `Deposit ${amount} PHRS`);
      const receipt = await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'DEPOSIT_PHRS');
      return receipt.status === 1;
    } catch (error) {
      logger.error(`Deposit PHRS gagal: ${error.message}`);
      return false;
    }
  }
  
  static async depositERC20(wallet, tokenSymbol, amount) {
    try {
      const tokenAddress = LENDING_CONFIG.contracts.TOKENS[tokenSymbol];
      if (!tokenAddress) {
        logger.error(`Token ${tokenSymbol} tidak ditemukan`);
        return false;
      }
      
      const decimals = LENDING_CONFIG.tokenDecimals[tokenSymbol] || 18;
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      // Approve token ke lending pool
      const tokenContract = new ethers.Contract(
        tokenAddress,
        LENDING_CONFIG.abi.ERC20,
        wallet
      );
      
      logger.step(`Menyetujui ${tokenSymbol} untuk lending pool...`);
      const approveTx = await tokenContract.approve(
        LENDING_CONFIG.contracts.LENDING_POOL, 
        amountWei, 
        { gasLimit: 150000 }
      );
      await Blockchain.waitForTransaction(wallet.provider, approveTx.hash, 'APPROVE');
      
      // Deposit token
      const lendingPoolContract = new ethers.Contract(
        LENDING_CONFIG.contracts.LENDING_POOL,
        LENDING_CONFIG.abi.LENDING_POOL,
        wallet
      );
      
      logger.step(`Menyimpan ${amount} ${tokenSymbol} ke lending pool...`);
      const tx = await lendingPoolContract.deposit(
        tokenAddress,
        amountWei,
        wallet.address,
        0, // referralCode
        { gasLimit: 300000 }
      );
      
      logger.transaction(tx.hash, 'DEPOSIT_ERC20', 'PENDING', `Deposit ${amount} ${tokenSymbol}`);
      const receipt = await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'DEPOSIT_ERC20');
      return receipt.status === 1;
    } catch (error) {
      logger.error(`Deposit ${tokenSymbol} gagal: ${error.message}`);
      return false;
    }
  }
  
  static async borrow(wallet, tokenSymbol, amount) {
    try {
      const tokenAddress = LENDING_CONFIG.contracts.TOKENS[tokenSymbol];
      if (!tokenAddress) {
        logger.error(`Token ${tokenSymbol} tidak ditemukan`);
        return false;
      }
      
      const decimals = LENDING_CONFIG.tokenDecimals[tokenSymbol] || 18;
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      const lendingPoolContract = new ethers.Contract(
        LENDING_CONFIG.contracts.LENDING_POOL,
        LENDING_CONFIG.abi.LENDING_POOL,
        wallet
      );
      
      logger.step(`Meminjam ${amount} ${tokenSymbol}...`);
      const tx = await lendingPoolContract.borrow(
        tokenAddress,
        amountWei,
        1, // interestRateMode: 1 = stable, 2 = variable
        0, // referralCode
        wallet.address,
        { gasLimit: 300000 }
      );
      
      logger.transaction(tx.hash, 'BORROW', 'PENDING', `Borrow ${amount} ${tokenSymbol}`);
      const receipt = await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'BORROW');
      return receipt.status === 1;
    } catch (error) {
      logger.error(`Borrow ${tokenSymbol} gagal: ${error.message}`);
      return false;
    }
  }
  
  static async withdraw(wallet, tokenSymbol, amount) {
    try {
      const tokenAddress = LENDING_CONFIG.contracts.TOKENS[tokenSymbol];
      if (!tokenAddress) {
        logger.error(`Token ${tokenSymbol} tidak ditemukan`);
        return false;
      }
      
      const decimals = LENDING_CONFIG.tokenDecimals[tokenSymbol] || 18;
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      const lendingPoolContract = new ethers.Contract(
        LENDING_CONFIG.contracts.LENDING_POOL,
        LENDING_CONFIG.abi.LENDING_POOL,
        wallet
      );
      
      logger.step(`Menarik ${amount} ${tokenSymbol}...`);
      const tx = await lendingPoolContract.withdraw(
        tokenAddress,
        amountWei,
        wallet.address,
        { gasLimit: 300000 }
      );
      
      logger.transaction(tx.hash, 'WITHDRAW', 'PENDING', `Withdraw ${amount} ${tokenSymbol}`);
      const receipt = await Blockchain.waitForTransaction(wallet.provider, tx.hash, 'WITHDRAW');
      return receipt.status === 1;
    } catch (error) {
      logger.error(`Withdraw ${tokenSymbol} gagal: ${error.message}`);
      return false;
    }
  }
  
  static async getUserLendingData(wallet) {
    try {
      const lendingPoolContract = new ethers.Contract(
        LENDING_CONFIG.contracts.LENDING_POOL,
        LENDING_CONFIG.abi.LENDING_POOL,
        wallet
      );
      
      const data = await lendingPoolContract.getUserAccountData(wallet.address);
      return {
        totalCollateralETH: parseFloat(ethers.formatUnits(data[0], 18)),
        totalDebtETH: parseFloat(ethers.formatUnits(data[1], 18)),
        availableBorrowsETH: parseFloat(ethers.formatUnits(data[2], 18)),
        currentLiquidationThreshold: parseFloat(ethers.formatUnits(data[3], 4)),
        ltv: parseFloat(ethers.formatUnits(data[4], 4)),
        healthFactor: parseFloat(ethers.formatUnits(data[5], 18))
      };
    } catch (error) {
      logger.error(`Gagal mendapatkan data lending: ${error.message}`);
      return null;
    }
  }

  static async executeOperations(wallet) {
    try {
      logger.step(`Memulai operasi lending untuk ${wallet.address}`);
      
      // 1. Mint semua token dari faucet
      const tokenSymbols = Object.keys(LENDING_CONFIG.contracts.TOKENS);
      for (const symbol of tokenSymbols) {
        await this.mintFaucetToken(wallet, symbol);
        await Utils.sleep(Utils.getRandomDelay(1000, 3000));
      }
      
      // 2. Deposit PHRS ke lending pool
      const phrsDepositAmount = LENDING_CONFIG.operations.supplyAmount;
      await this.depositPHRS(wallet, phrsDepositAmount);
      await Utils.sleep(Utils.getRandomDelay(2000, 4000));
      
      // 3. Deposit ERC20 tokens
      for (const symbol of tokenSymbols) {
        const depositAmount = LENDING_CONFIG.operations.mintAmount * 0.5; // Deposit setengah dari yang dicetak
        await this.depositERC20(wallet, symbol, depositAmount);
        await Utils.sleep(Utils.getRandomDelay(2000, 4000));
      }
      
      // 4. Borrow token
      const borrowToken = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
      const borrowAmount = LENDING_CONFIG.operations.borrowAmount;
      await this.borrow(wallet, borrowToken, borrowAmount);
      await Utils.sleep(Utils.getRandomDelay(2000, 4000));
      
      // 5. Withdraw token
      const withdrawToken = tokenSymbols[Math.floor(Math.random() * tokenSymbols.length)];
      const withdrawAmount = LENDING_CONFIG.operations.borrowAmount * 0.5;
      await this.withdraw(wallet, withdrawToken, withdrawAmount);
      
      // 6. Tampilkan status lending
      const lendingData = await this.getUserLendingData(wallet);
      if (lendingData) {
        logger.info(`Lending Status: 
  Collateral: ${lendingData.totalCollateralETH} ETH
  Debt: ${lendingData.totalDebtETH} ETH
  Borrow Limit: ${lendingData.availableBorrowsETH} ETH
  Health Factor: ${lendingData.healthFactor}`);
      }

      logger.success(`Operasi lending selesai untuk ${wallet.address}`);
    } catch (error) {
      logger.error(`Operasi lending gagal: ${error.message}`);
    }
  }

  static async run(wallets, proxies) {
    logger.banner('Lending Operations');
    
    for (const [index, privateKey] of wallets.entries()) {
      const proxy = Utils.getRandomProxy(proxies);
      const provider = Blockchain.setupProvider(proxy);
      const wallet = new ethers.Wallet(privateKey, provider);
      
      console.log(`\n${colors.yellow}${colors.bold}Wallet ${index + 1}/${wallets.length} • ${wallet.address}${colors.reset}\n`);
      
      try {
        await this.executeOperations(wallet);
        
        // Jeda antar wallet
        logger.loading(`Mempersiapkan wallet berikutnya...`);
        await Utils.sleep(15000);
      } catch (error) {
        logger.error(`Wallet ${index+1} gagal: ${error.message}`);
      }
    }
    
    logger.success('Siklus lending selesai untuk semua wallet');
  }
}

// ==============================
// BOT UTAMA
// ==============================
class PharosBot {
  constructor() {
    this.proxies = Utils.loadProxies();
    this.wallets = Utils.getWalletKeys();
    this.cycleCount = 0;
    this.cycleInterval = POINTS_CONFIG.operations.delayMinutes * 60 * 1000;
  }

  async runCycle() {
    this.cycleCount++;
    console.clear();
    logger.banner(`Siklus #${this.cycleCount}`);

    try {
      // Menjalankan operasi farming
      await PointsFarming.run(this.wallets, this.proxies);
      
      // Menjalankan operasi lending
      await LendingAutomation.run(this.wallets, this.proxies);
      
      logger.success(`Siklus #${this.cycleCount} selesai`);
      
      // Jeda antar siklus
      const delay = this.cycleInterval;
      const minsLeft = Math.ceil(delay / 60000);
      logger.loading(`Siklus berikutnya dalam ${minsLeft} menit...`);
      await Utils.sleep(delay);
    } catch (error) {
      logger.error(`Siklus error: ${error.message}`);
    }
  }

  async start() {
    try {
      // Menjalankan siklus terus menerus
      while (true) {
        await this.runCycle();
      }
    } catch (error) {
      logger.error(`Bot error: ${error.message}`);
      process.exit(1);
    }
  }
}

// ==============================
// MEMULAI BOT
// ==============================
const bot = new PharosBot();
bot.start().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});