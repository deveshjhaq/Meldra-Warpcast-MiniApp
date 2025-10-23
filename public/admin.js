export async function loadAdminPanel(contract, signer, userAddress) {
    const adminContent = document.getElementById('admin-content');
    adminContent.innerHTML = `
        <div class="admin-panel">
            <div class="admin-stats">
                <h3>📊 Admin Dashboard</h3>
                <div class="stats-grid" id="stats-grid">
                    <div class="stat-card">
                        <h4>Contract Balance</h4>
                        <p id="contract-balance">Loading...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Total Quiz Fees</h4>
                        <p id="total-quiz-fees">Loading...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Total Mint Fees</h4>
                        <p id="total-mint-fees">Loading...</p>
                    </div>
                    <div class="stat-card">
                        <h4>Quiz Participants</h4>
                        <p id="quiz-participants">Loading...</p>
                    </div>
                </div>
            </div>
            
            <div class="admin-actions">
                <div class="action-card">
                    <h4>💰 Withdraw Funds</h4>
                    <div class="withdraw-form">
                        <input type="text" id="withdraw-amount" placeholder="Amount in ETH" class="input">
                        <input type="text" id="withdraw-address" placeholder="Recipient Address" class="input">
                        <button id="withdraw-btn" class="btn btn-primary">Withdraw ETH</button>
                    </div>
                </div>
                
                <div class="action-card">
                    <h4>🎁 Reward Users</h4>
                    <div class="reward-form">
                        <input type="text" id="reward-address" placeholder="User Address" class="input">
                        <input type="number" id="reward-amount" placeholder="Meldra Coins" class="input">
                        <button id="reward-btn" class="btn btn-primary">Reward User</button>
                    </div>
                </div>
                
                <div class="action-card">
                    <h4>👑 Manage Admins</h4>
                    <div class="admin-form">
                        <input type="text" id="admin-address" placeholder="Address" class="input">
                        <select id="admin-action" class="input">
                            <option value="add">Add Admin</option>
                            <option value="remove">Remove Admin</option>
                        </select>
                        <button id="admin-btn" class="btn btn-primary">Update Admin</button>
                    </div>
                </div>
            </div>
            
            <div class="admin-tables">
                <div class="table-card">
                    <h4>📝 Quiz Leaderboard</h4>
                    <div id="quiz-leaderboard" class="table-container">
                        Loading quiz entries...
                    </div>
                </div>
                
                <div class="table-card">
                    <h4>🔄 Recent Transactions</h4>
                    <div id="recent-transactions" class="table-container">
                        Transaction history will appear here
                    </div>
                </div>
            </div>
        </div>
    `;

    await loadAdminStats(contract);
    bindAdminEvents(contract, signer);
    await loadQuizLeaderboard(contract);
}

async function loadAdminStats(contract) {
    try {
        const balance = await contract.getContractBalance();
        const quizFees = await contract.totalQuizFees();
        const mintFees = await contract.totalMintFees();
        
        document.getElementById('contract-balance').textContent = 
            `${ethers.utils.formatEther(balance)} ETH`;
        document.getElementById('total-quiz-fees').textContent = 
            `${ethers.utils.formatEther(quizFees)} ETH`;
        document.getElementById('total-mint-fees').textContent = 
            `${ethers.utils.formatEther(mintFees)} ETH`;
            
        // Get unique quiz participants
        const quizEntries = await contract.getQuizEntries();
        const uniqueParticipants = new Set(quizEntries.map(entry => entry.player));
        document.getElementById('quiz-participants').textContent = 
            `${uniqueParticipants.size} users`;
            
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadQuizLeaderboard(contract) {
    try {
        const quizEntries = await contract.getQuizEntries();
        
        // Sort by score (descending) and take top 10
        const sortedEntries = [...quizEntries]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        let leaderboardHTML = '';
        if (sortedEntries.length === 0) {
            leaderboardHTML = '<p>No quiz entries yet</p>';
        } else {
            leaderboardHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Score</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedEntries.map((entry, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${entry.player.slice(0, 8)}...</td>
                                <td>${entry.score}%</td>
                                <td>${new Date(entry.timestamp * 1000).toLocaleDateString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        
        document.getElementById('quiz-leaderboard').innerHTML = leaderboardHTML;
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        document.getElementById('quiz-leaderboard').innerHTML = '<p>Error loading leaderboard</p>';
    }
}

function bindAdminEvents(contract, signer) {
    // Withdraw funds
    document.getElementById('withdraw-btn').addEventListener('click', async () => {
        const amount = document.getElementById('withdraw-amount').value;
        const address = document.getElementById('withdraw-address').value;
        
        if (!amount || !address) {
            alert('Please fill all fields');
            return;
        }
        
        try {
            const amountWei = ethers.utils.parseEther(amount);
            const tx = await contract.withdrawFees(address, amountWei);
            await tx.wait();
            alert('Funds withdrawn successfully!');
            await loadAdminStats(contract);
        } catch (error) {
            console.error('Error withdrawing funds:', error);
            alert('Failed to withdraw funds');
        }
    });
    
    // Reward users
    document.getElementById('reward-btn').addEventListener('click', async () => {
        const address = document.getElementById('reward-address').value;
        const amount = document.getElementById('reward-amount').value;
        
        if (!address || !amount) {
            alert('Please fill all fields');
            return;
        }
        
        try {
            const tx = await contract.rewardMeldraCoins(address, parseInt(amount));
            await tx.wait();
            alert('User rewarded successfully!');
        } catch (error) {
            console.error('Error rewarding user:', error);
            alert('Failed to reward user');
        }
    });
    
    // Manage admins
    document.getElementById('admin-btn').addEventListener('click', async () => {
        const address = document.getElementById('admin-address').value;
        const action = document.getElementById('admin-action').value;
        
        if (!address) {
            alert('Please enter an address');
            return;
        }
        
        try {
            const tx = await contract.setAdmin(address, action === 'add');
            await tx.wait();
            alert(`Admin ${action === 'add' ? 'added' : 'removed'} successfully!`);
        } catch (error) {
            console.error('Error updating admin:', error);
            alert('Failed to update admin');
        }
    });
}
