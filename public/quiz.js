const QUIZ_QUESTIONS = [
    {
        question: "What is the native token of Base blockchain?",
        options: ["ETH", "BTC", "BASE", "USDC"],
        correct: 0
    },
    {
        question: "Which year was Ethereum launched?",
        options: ["2013", "2014", "2015", "2016"],
        correct: 2
    },
    {
        question: "What does NFT stand for?",
        options: [
            "Non-Fungible Token",
            "New Financial Technology", 
            "Network File Transfer",
            "Non-Functional Test"
        ],
        correct: 0
    },
    {
        question: "Which protocol is used for decentralized storage?",
        options: ["IPFS", "HTTP", "FTP", "SMTP"],
        correct: 0
    },
    {
        question: "What is the gas fee used for in Ethereum?",
        options: [
            "Network computation costs",
            "Buying actual gas",
            "Token minting only",
            "Exchange fees"
        ],
        correct: 0
    }
];

export async function loadQuizBattle(contract, signer, userAddress) {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = `
        <div class="quiz-battle">
            <div class="quiz-info">
                <h3>🧠 Quiz Battle</h3>
                <p>Test your knowledge and earn Meldra Coins!</p>
                <div class="quiz-stats">
                    <p>Entry Fee: <strong>0.001 ETH</strong></p>
                    <p>Rewards: <strong>5-20 Meldra Coins</strong> based on score</p>
                </div>
            </div>
            
            <div id="quiz-container">
                <div class="quiz-start">
                    <button id="start-quiz" class="btn btn-primary btn-large">
                        Start Quiz Battle
                    </button>
                </div>
            </div>
            
            <div class="quiz-history hidden" id="quiz-history">
                <h4>Your Quiz History</h4>
                <div id="history-list"></div>
            </div>
        </div>
    `;

    await loadQuizHistory(contract, userAddress);
    bindQuizEvents(contract, signer, userAddress);
}

async function loadQuizHistory(contract, userAddress) {
    try {
        const historyList = document.getElementById('history-list');
        const allEntries = await contract.getQuizEntries();
        
        const userEntries = allEntries.filter(entry => 
            entry.player.toLowerCase() === userAddress.toLowerCase()
        ).slice(-5); // Show last 5 entries
        
        if (userEntries.length === 0) {
            historyList.innerHTML = '<p>No quiz history yet</p>';
            return;
        }
        
        let historyHTML = '';
        userEntries.forEach((entry, index) => {
            const date = new Date(entry.timestamp * 1000).toLocaleDateString();
            historyHTML += `
                <div class="history-item">
                    <span>Quiz ${index + 1}:</span>
                    <span>Score: ${entry.score}%</span>
                    <span>Date: ${date}</span>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
        document.getElementById('quiz-history').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading quiz history:', error);
    }
}

function bindQuizEvents(contract, signer, userAddress) {
    document.getElementById('start-quiz').addEventListener('click', () => {
        startQuiz(contract, signer, userAddress);
    });
}

function startQuiz(contract, signer, userAddress) {
    let currentQuestion = 0;
    let userAnswers = [];
    
    function showQuestion() {
        if (currentQuestion >= QUIZ_QUESTIONS.length) {
            showResults();
            return;
        }
        
        const question = QUIZ_QUESTIONS[currentQuestion];
        const questionHTML = `
            <div class="quiz-question">
                <div class="question-header">
                    <h4>Question ${currentQuestion + 1}/${QUIZ_QUESTIONS.length}</h4>
                    <p>${question.question}</p>
                </div>
                <div class="question-options">
                    ${question.options.map((option, index) => `
                        <button class="option-btn" data-answer="${index}">
                            ${option}
                        </button>
                    `).join('')}
                </div>
                <div class="quiz-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${((currentQuestion + 1) / QUIZ_QUESTIONS.length) * 100}%"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('quiz-container').innerHTML = questionHTML;
        
        // Add event listeners to options
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const answer = parseInt(e.target.dataset.answer);
                userAnswers.push(answer);
                currentQuestion++;
                showQuestion();
            });
        });
    }
    
    function showResults() {
        const score = calculateScore(userAnswers);
        const resultsHTML = `
            <div class="quiz-results">
                <h3>Quiz Completed! 🎉</h3>
                <div class="score-display">
                    <h2>Your Score: ${score}%</h2>
                    <p>Correct: ${userAnswers.filter((answer, index) => 
                        answer === QUIZ_QUESTIONS[index].correct
                    ).length}/${QUIZ_QUESTIONS.length}</p>
                </div>
                <button id="submit-quiz" class="btn btn-primary">
                    Submit Score & Claim Rewards (0.001 ETH)
                </button>
                <button id="restart-quiz" class="btn btn-secondary">
                    Try Again
                </button>
            </div>
        `;
        
        document.getElementById('quiz-container').innerHTML = resultsHTML;
        
        document.getElementById('submit-quiz').addEventListener('click', async () => {
            try {
                const entryFee = ethers.utils.parseEther('0.001');
                const tx = await contract.submitQuiz(score, { value: entryFee });
                await tx.wait();
                
                alert(`Quiz submitted successfully! You earned Meldra Coins based on your score.`);
                await loadQuizHistory(contract, userAddress);
                
            } catch (error) {
                console.error('Error submitting quiz:', error);
                alert('Failed to submit quiz');
            }
        });
        
        document.getElementById('restart-quiz').addEventListener('click', () => {
            loadQuizBattle(contract, signer, userAddress);
        });
    }
    
    function calculateScore(answers) {
        let correct = 0;
        answers.forEach((answer, index) => {
            if (answer === QUIZ_QUESTIONS[index].correct) {
                correct++;
            }
        });
        return Math.round((correct / QUIZ_QUESTIONS.length) * 100);
    }
    
    showQuestion();
}
