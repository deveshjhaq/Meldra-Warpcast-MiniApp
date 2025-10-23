export async function loadNFTMarketplace(contract, signer, userAddress) {
    const nftContent = document.getElementById('nft-content');
    nftContent.innerHTML = `
        <div class="nft-marketplace">
            <div class="nft-actions">
                <button id="mint-nft-btn" class="btn btn-primary">Mint New NFT</button>
                <button id="refresh-nfts-btn" class="btn btn-secondary">Refresh NFTs</button>
            </div>
            <div class="mint-form hidden" id="mint-form">
                <h3>Mint New NFT</h3>
                <input type="text" id="nft-uri" placeholder="IPFS URI (e.g., ipfs://Qm...)" class="input">
                <button id="submit-mint" class="btn btn-primary">Mint NFT (0.002 ETH)</button>
            </div>
            <div class="nft-grid" id="nft-grid">
                <div class="loading-text">Loading NFTs...</div>
            </div>
        </div>
    `;

    await loadNFTs(contract, userAddress);
    bindNFTEvents(contract, signer, userAddress);
}

async function loadNFTs(contract, userAddress) {
    try {
        const nftGrid = document.getElementById('nft-grid');
        nftGrid.innerHTML = '<div class="loading-text">Loading NFTs...</div>';

        // In a real implementation, you would fetch all token IDs and their metadata
        // This is a simplified version
        const totalSupply = await contract.nextTokenId();
        
        if (totalSupply == 0) {
            nftGrid.innerHTML = '<div class="no-items">No NFTs minted yet</div>';
            return;
        }

        let nftHTML = '';
        for (let i = 0; i < totalSupply; i++) {
            try {
                const owner = await contract.ownerOf(i);
                const listing = await contract.listings(i);
                const tokenURI = await contract.getTokenURI(i);
                
                nftHTML += createNFTCard(i, owner, listing, tokenURI, userAddress);
            } catch (error) {
                console.error(`Error loading NFT ${i}:`, error);
            }
        }

        nftGrid.innerHTML = nftHTML || '<div class="no-items">No NFTs available</div>';
        
    } catch (error) {
        console.error('Error loading NFTs:', error);
        document.getElementById('nft-grid').innerHTML = '<div class="error">Error loading NFTs</div>';
    }
}

function createNFTCard(tokenId, owner, listing, tokenURI, userAddress) {
    const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
    const isListed = listing.isListed;
    const price = ethers.utils.formatEther(listing.price || '0');
    
    return `
        <div class="nft-card">
            <div class="nft-image">
                <img src="https://via.placeholder.com/200x200/4A90E2/FFFFFF?text=Meldra+NFT" alt="NFT ${tokenId}">
            </div>
            <div class="nft-info">
                <h4>Meldra NFT #${tokenId}</h4>
                <p class="nft-owner">Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}</p>
                <p class="nft-uri">${tokenURI.slice(0, 30)}...</p>
                
                ${isListed ? `
                    <p class="nft-price">Price: ${price} ETH</p>
                    ${!isOwner ? `
                        <button class="btn btn-buy" data-tokenid="${tokenId}" data-price="${listing.price}">
                            Buy NFT
                        </button>
                    ` : ''}
                ` : ''}
                
                ${isOwner && !isListed ? `
                    <div class="list-form">
                        <input type="number" id="price-${tokenId}" placeholder="Price in ETH" step="0.001" min="0.001" class="input">
                        <button class="btn btn-list" data-tokenid="${tokenId}">
                            List for Sale
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function bindNFTEvents(contract, signer, userAddress) {
    // Mint NFT
    document.getElementById('mint-nft-btn').addEventListener('click', () => {
        document.getElementById('mint-form').classList.toggle('hidden');
    });

    document.getElementById('submit-mint').addEventListener('click', async () => {
        const uri = document.getElementById('nft-uri').value;
        if (!uri) {
            alert('Please enter IPFS URI');
            return;
        }

        try {
            const mintFee = ethers.utils.parseEther('0.002');
            const tx = await contract.mint(uri, { value: mintFee });
            await tx.wait();
            alert('NFT minted successfully!');
            await loadNFTs(contract, userAddress);
        } catch (error) {
            console.error('Error minting NFT:', error);
            alert('Failed to mint NFT');
        }
    });

    // Refresh NFTs
    document.getElementById('refresh-nfts-btn').addEventListener('click', () => {
        loadNFTs(contract, userAddress);
    });

    // Buy NFT
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-buy')) {
            const tokenId = e.target.dataset.tokenid;
            const price = e.target.dataset.price;
            
            try {
                const tx = await contract.buy(tokenId, { value: price });
                await tx.wait();
                alert('NFT purchased successfully!');
                await loadNFTs(contract, userAddress);
            } catch (error) {
                console.error('Error buying NFT:', error);
                alert('Failed to buy NFT');
            }
        }
    });

    // List NFT for sale
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-list')) {
            const tokenId = e.target.dataset.tokenid;
            const priceInput = document.getElementById(`price-${tokenId}`);
            const price = ethers.utils.parseEther(priceInput.value);
            
            if (!priceInput.value || price.lte(0)) {
                alert('Please enter a valid price');
                return;
            }

            try {
                const tx = await contract.listForSale(tokenId, price);
                await tx.wait();
                alert('NFT listed for sale successfully!');
                await loadNFTs(contract, userAddress);
            } catch (error) {
                console.error('Error listing NFT:', error);
                alert('Failed to list NFT');
            }
        }
    });
}
