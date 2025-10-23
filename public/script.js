class MeldraApp {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.userAddress = null;
        this.isAdmin = false;
        
        this.contractAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS';
        this.contractABI = []; // Will be filled with actual ABI
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadContractABI();
        await this.checkConnectedWallet();
    }

    bindEvents() {
        // Wallet connection
        document.getElementById('connect-wallet').addEventListener('click', () => this.connectWallet());
        
        // Navigation
        document.getElementById('nft-marketplace-btn').addEventListener('click', () => this.loadNFTMarketplace());
        document.getElementById('quiz-battle-btn').addEventListener('click', () => this.loadQuizBattle());
        document.getElementById('admin-panel-btn').addEventListener('click', () => this.loadAdminPanel());
        
        // Back buttons
        document.getElementById('back-to-main').addEventListener('click', () => this.showLanding());
        document.getElementById('back-to-main-from-quiz').addEventListener('click', () => this.showLanding());
        document.getElementById('back-to-main-from-admin').addEventListener('click', () => this.showLanding());
    }

    async loadContractABI() {
        try {
            // In production, load from external file or hardcode
            const response = await fetch('/contract-abi.json');
            this.contractABI = await response.json();
        } catch (error) {
            console.error('Failed to load contract ABI:', error);
            this.showNotification('Failed to load contract ABI', 'error');
        }
    }

    async connectWallet() {
        try {
            this.showLoading(true);
            
            if (typeof window.ethereum !== 'undefined') {
                this.provider = window.ethereum;
                
                // Request account access
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                this.userAddress = accounts[0];
                this.signer = this.provider; // In real app, use ethers.js signer
                
                await this.initializeContract();
                await this.updateUI();
                await this.checkAdminStatus();
                
                this.showNotification('Wallet connected successfully!', 'success');
                
            } else {
                this.showNotification('Please install MetaMask!', 'error');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showNotification('Failed to connect wallet', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async initializeContract() {
        if (window.ethers) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = provider.getSigner();
            this.contract = new ethers.Contract(this.contractAddress, this.contractABI, this.signer);
        }
    }

    async checkAdminStatus() {
        try {
            if (this.contract && this.userAddress) {
                this.isAdmin = await this.contract.isAdmin(this.userAddress);
                
                if (this.isAdmin) {
                    document.getElementById('admin-access').classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }

    async updateUI() {
        if (this.userAddress) {
            document.getElementById('connect-wallet').classList.add('hidden');
            document.getElementById('wallet-info').classList.remove('hidden');
            
            const shortAddress = `${this.userAddress.slice(0, 6)}...${this.userAddress.slice(-4)}`;
            document.getElementById('wallet-address').textContent = shortAddress;
            
            // Update Meldra Coins balance
            if (this.contract) {
                try {
                    const coins = await this.contract.getMeldraCoins(this.userAddress);
                    document.getElementById('meldra-coins').textContent = `${coins} MC`;
                } catch (error) {
                    console.error('Error fetching coins:', error);
                }
            }
        }
    }

    async loadNFTMarketplace() {
        try {
            this.showLoading(true);
            this.hideAllSections();
            document.getElementById('nft-section').classList.remove('hidden');
            
            // Dynamically load NFT module
            const { loadNFTMarketplace } = await import('./nft.js');
            await loadNFTMarketplace(this.contract, this.signer, this.userAddress);
            
        } catch (error) {
            console.error('Error loading NFT marketplace:', error);
            this.showNotification('Failed to load NFT marketplace', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadQuizBattle() {
        try {
            this.showLoading(true);
            this.hideAllSections();
            document.getElementById('quiz-section').classList.remove('hidden');
            
            // Dynamically load Quiz module
            const { loadQuizBattle } = await import('./quiz.js');
            await loadQuizBattle(this.contract, this.signer, this.userAddress);
            
        } catch (error) {
            console.error('Error loading quiz battle:', error);
            this.showNotification('Failed to load quiz battle', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loadAdminPanel() {
        try {
            this.showLoading(true);
            this.hideAllSections();
            document.getElementById('admin-section').classList.remove('hidden');
            
            // Dynamically load Admin module only if user is admin
            if (this.isAdmin) {
                const { loadAdminPanel } = await import('./admin.js');
                await loadAdminPanel(this.contract, this.signer, this.userAddress);
            } else {
                this.showNotification('Access denied: Admin only', 'error');
                this.showLanding();
            }
            
        } catch (error) {
            console.error('Error loading admin panel:', error);
            this.showNotification('Failed to load admin panel', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    showLanding() {
        this.hideAllSections();
        document.getElementById('landing').classList.remove('hidden');
    }

    hideAllSections() {
        const sections = document.querySelectorAll('.content-section, #landing');
        sections.forEach(section => section.classList.add('hidden'));
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    async checkConnectedWallet() {
        if (typeof window.ethereum !== 'undefined') {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.userAddress = accounts[0];
                await this.initializeContract();
                await this.updateUI();
                await this.checkAdminStatus();
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MeldraApp();
});

// Handle wallet changes
if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', (accounts) => {
        window.location.reload();
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
    });
}
