// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MeldraNFTMarket is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    
    uint256 public constant QUIZ_ENTRY_FEE = 0.001 ether;
    uint256 public constant MINT_FEE = 0.002 ether;
    
    struct NFTListing {
        uint256 price;
        address seller;
        bool isListed;
    }
    
    struct QuizEntry {
        uint256 score;
        address player;
        uint256 timestamp;
    }
    
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => NFTListing) public listings;
    mapping(address => bool) public isAdmin;
    mapping(address => uint256) public meldraCoins;
    
    QuizEntry[] public quizEntries;
    uint256 public totalQuizFees;
    uint256 public totalMintFees;
    
    event NFTMinted(address indexed to, uint256 tokenId, string tokenURI);
    event NFTListed(uint256 tokenId, uint256 price, address seller);
    event NFTBought(uint256 tokenId, address buyer, address seller, uint256 price);
    event QuizSubmitted(address indexed player, uint256 score, uint256 entryFee);
    event MeldraCoinRewarded(address indexed user, uint256 amount);
    event AdminWithdrawal(address indexed admin, uint256 amount);
    
    constructor() ERC721("MeldraNFT", "MNFT") {
        isAdmin[msg.sender] = true;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == owner() || isAdmin[msg.sender], "Not admin");
        _;
    }
    
    modifier tokenExists(uint256 tokenId) {
        require(_exists(tokenId), "Token does not exist");
        _;
    }
    
    // Admin functions
    function setAdmin(address user, bool allowed) external onlyOwner {
        isAdmin[user] = allowed;
    }
    
    function withdrawFees(address payable to, uint256 amount) external onlyAdmin {
        require(amount <= address(this).balance, "Insufficient contract balance");
        totalQuizFees = 0;
        totalMintFees = 0;
        to.transfer(amount);
        emit AdminWithdrawal(msg.sender, amount);
    }
    
    function rewardMeldraCoins(address user, uint256 amount) external onlyAdmin {
        meldraCoins[user] += amount;
        emit MeldraCoinRewarded(user, amount);
    }
    
    // NFT functions
    function mint(string calldata tokenURI) external payable {
        require(msg.value >= MINT_FEE, "Insufficient mint fee");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        totalMintFees += msg.value;
        
        // Reward user with Meldra Coins for minting
        meldraCoins[msg.sender] += 10;
        
        emit NFTMinted(msg.sender, tokenId, tokenURI);
    }
    
    function listForSale(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(price > 0, "Price must be greater than 0");
        
        listings[tokenId] = NFTListing(price, msg.sender, true);
        emit NFTListed(tokenId, price, msg.sender);
    }
    
    function buy(uint256 tokenId) external payable tokenExists(tokenId) {
        NFTListing memory listing = listings[tokenId];
        require(listing.isListed, "NFT not listed for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        
        address seller = listing.seller;
        _transfer(seller, msg.sender, tokenId);
        
        // Clear listing
        delete listings[tokenId];
        
        // Transfer payment to seller
        payable(seller).transfer(msg.value);
        
        // Reward both buyer and seller with Meldra Coins
        meldraCoins[msg.sender] += 5;
        meldraCoins[seller] += 5;
        
        emit NFTBought(tokenId, msg.sender, seller, msg.value);
    }
    
    // Quiz functions
    function submitQuiz(uint256 score) external payable {
        require(msg.value >= QUIZ_ENTRY_FEE, "Insufficient quiz entry fee");
        
        quizEntries.push(QuizEntry(score, msg.sender, block.timestamp));
        totalQuizFees += msg.value;
        
        // Reward based on score
        uint256 coinReward = score >= 80 ? 20 : (score >= 60 ? 10 : 5);
        meldraCoins[msg.sender] += coinReward;
        
        emit QuizSubmitted(msg.sender, score, msg.value);
    }
    
    // View functions
    function getQuizEntries() external view returns (QuizEntry[] memory) {
        return quizEntries;
    }
    
    function getTokenURI(uint256 tokenId) external view tokenExists(tokenId) returns (string memory) {
        return _tokenURIs[tokenId];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getMeldraCoins(address user) external view returns (uint256) {
        return meldraCoins[user];
    }
    
    // Internal functions
    function _setTokenURI(uint256 tokenId, string memory tokenURI) internal virtual {
        require(_exists(tokenId), "URI set of nonexistent token");
        _tokenURIs[tokenId] = tokenURI;
    }
    
    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }
}
