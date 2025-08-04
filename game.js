class FreeCellGame {
    constructor() {
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deck = [];
        this.tableau = Array(8).fill().map(() => []);
        this.freeCells = Array(4).fill(null);
        this.foundations = Array(4).fill().map(() => []);
        this.moveCount = 0;
        this.startTime = Date.now();
        this.selectedCard = null;
        this.gameHistory = [];
        
        this.init();
    }

    init() {
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.setupEventListeners();
        this.updateDisplay();
        this.startTimer();
    }

    createDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({
                    suit,
                    rank,
                    value: this.ranks.indexOf(rank) + 1,
                    color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black'
                });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        let cardIndex = 0;
        for (let col = 0; col < 8; col++) {
            const cardsInColumn = col < 4 ? 7 : 6;
            for (let row = 0; row < cardsInColumn; row++) {
                this.tableau[col].push(this.deck[cardIndex++]);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.newGame());
        
        document.addEventListener('click', (e) => this.handleClick(e));
    }

    handleClick(e) {
        const card = e.target.closest('.card');
        const freeCell = e.target.closest('.free-cell');
        const foundationPile = e.target.closest('.foundation-pile');
        const tableauColumn = e.target.closest('.tableau-column');

        // 如果点击的是卡片
        if (card) {
            const cardData = this.getCardFromElement(card);
            if (!cardData) return;

            if (this.selectedCard) {
                if (this.canMoveSequence(this.selectedCard.sequence, cardData.location)) {
                    this.makeSequenceMove(this.selectedCard, cardData.location);
                    this.selectedCard = null;
                    this.updateDisplay();
                } else {
                    this.selectedCard = null;
                    this.updateDisplay();
                }
            } else {
                // 检查是否可以选择序列
                if (cardData.location.type === 'tableau') {
                    const { column, row } = cardData.location;
                    const sequence = this.getValidSequence(column, row);
                    
                    this.selectedCard = {
                        card: cardData.card,
                        location: cardData.location,
                        sequence: sequence
                    };
                    this.updateDisplay();
                } else if (this.isTopCard(cardData)) {
                    this.selectedCard = {
                        card: cardData.card,
                        location: cardData.location,
                        sequence: [cardData.card]
                    };
                    this.updateDisplay();
                }
            }
            return;
        }

        // 如果点击的是空的自由单元格
        if (freeCell && this.selectedCard) {
            const index = parseInt(freeCell.id.split('-')[2]);
            const targetLocation = { type: 'freecell', index: index };
            if (this.canMoveSequence(this.selectedCard.sequence, targetLocation)) {
                this.makeSequenceMove(this.selectedCard, targetLocation);
                this.selectedCard = null;
                this.updateDisplay();
            } else {
                this.selectedCard = null;
                this.updateDisplay();
            }
            return;
        }

        // 如果点击的是基础堆
        if (foundationPile && this.selectedCard) {
            const index = parseInt(foundationPile.id.split('-')[1]);
            const targetLocation = { type: 'foundation', index: index };
            if (this.canMoveSequence(this.selectedCard.sequence, targetLocation)) {
                this.makeSequenceMove(this.selectedCard, targetLocation);
                this.selectedCard = null;
                this.updateDisplay();
            } else {
                this.selectedCard = null;
                this.updateDisplay();
            }
            return;
        }

        // 如果点击的是空的游戏列
        if (tableauColumn && this.selectedCard) {
            const index = parseInt(tableauColumn.id.split('-')[1]);
            const targetLocation = { type: 'tableau', column: index };
            if (this.canMoveSequence(this.selectedCard.sequence, targetLocation)) {
                this.makeSequenceMove(this.selectedCard, targetLocation);
                this.selectedCard = null;
                this.updateDisplay();
            } else {
                this.selectedCard = null;
                this.updateDisplay();
            }
            return;
        }

        // 如果点击其他地方，取消选择
        if (this.selectedCard) {
            this.selectedCard = null;
            this.updateDisplay();
        }
    }

    getCardFromElement(element) {
        const cardId = element.dataset.cardId;
        const [type, index, subIndex] = cardId.split('-');
        
        switch (type) {
            case 'tableau':
                return {
                    card: this.tableau[index][subIndex],
                    location: { type: 'tableau', column: parseInt(index), row: parseInt(subIndex) }
                };
            case 'freecell':
                return {
                    card: this.freeCells[index],
                    location: { type: 'freecell', index: parseInt(index) }
                };
            case 'foundation':
                return {
                    card: this.foundations[index][this.foundations[index].length - 1],
                    location: { type: 'foundation', index: parseInt(index) }
                };
        }
    }

    isTopCard(cardData) {
        const { type, column, row, index } = cardData.location;
        switch (type) {
            case 'tableau':
                return row === this.tableau[column].length - 1;
            case 'freecell':
                return this.freeCells[index] !== null;
            case 'foundation':
                return this.foundations[index].length > 0;
        }
        return false;
    }

    // 检测从指定位置开始的有效序列
    getValidSequence(column, startRow) {
        const cards = this.tableau[column];
        if (startRow >= cards.length) return [];
        
        const sequence = [cards[startRow]];
        
        for (let i = startRow + 1; i < cards.length; i++) {
            const currentCard = cards[i];
            const prevCard = cards[i - 1];
            
            // 检查是否符合降序且红黑交替
            if (currentCard.value === prevCard.value - 1 && 
                currentCard.color !== prevCard.color) {
                sequence.push(currentCard);
            } else {
                break;
            }
        }
        
        return sequence;
    }

    // 计算最大可移动的牌数（基于空闲单元格和空列数）
    getMaxMovableCards() {
        const freeCells = this.freeCells.filter(cell => cell === null).length;
        const emptyColumns = this.tableau.filter(col => col.length === 0).length;
        
        // 公式：(1 + 空闲单元格数) * 2^空列数
        return (1 + freeCells) * Math.pow(2, emptyColumns);
    }

    // 检查序列是否可以移动到目标位置
    canMoveSequence(sequence, targetLocation) {
        if (sequence.length === 0) return false;
        
        // 只有移动到tableau列才允许序列移动
        if (targetLocation.type !== 'tableau') {
            return sequence.length === 1;
        }
        
        // 检查序列长度是否超过最大可移动数
        if (sequence.length > this.getMaxMovableCards()) {
            return false;
        }
        
        // 检查序列的第一张牌是否可以放到目标位置
        const firstCard = sequence[0];
        const targetColumn = this.tableau[targetLocation.column];
        
        if (targetColumn.length === 0) return true;
        
        const topCard = targetColumn[targetColumn.length - 1];
        return firstCard.value === topCard.value - 1 && 
               firstCard.color !== topCard.color;
    }

    canMove(card, targetLocation) {
        const sourceLocation = card.location;
        const cardToMove = card.card;

        if (targetLocation.type === 'foundation') {
            const foundation = this.foundations[targetLocation.index];
            if (foundation.length === 0) {
                return cardToMove.value === 1;
            }
            const topCard = foundation[foundation.length - 1];
            return cardToMove.suit === topCard.suit && cardToMove.value === topCard.value + 1;
        }

        if (targetLocation.type === 'tableau') {
            const column = this.tableau[targetLocation.column];
            if (column.length === 0) return true;
            const topCard = column[column.length - 1];
            return cardToMove.value === topCard.value - 1 && 
                   ((cardToMove.color === 'red' && topCard.color === 'black') ||
                    (cardToMove.color === 'black' && topCard.color === 'red'));
        }

        if (targetLocation.type === 'freecell') {
            return this.freeCells[targetLocation.index] === null;
        }

        return false;
    }

    makeMove(card, targetLocation) {
        this.saveState();
        
        const cardToMove = card.card;
        const sourceLocation = card.location;

        // 从源位置移除
        switch (sourceLocation.type) {
            case 'tableau':
                this.tableau[sourceLocation.column].pop();
                break;
            case 'freecell':
                this.freeCells[sourceLocation.index] = null;
                break;
            case 'foundation':
                this.foundations[sourceLocation.index].pop();
                break;
        }

        // 添加到目标位置
        switch (targetLocation.type) {
            case 'tableau':
                this.tableau[targetLocation.column].push(cardToMove);
                break;
            case 'freecell':
                this.freeCells[targetLocation.index] = cardToMove;
                break;
            case 'foundation':
                this.foundations[targetLocation.index].push(cardToMove);
                break;
        }

        this.moveCount++;
        this.checkWin();
    }

    makeSequenceMove(selectedData, targetLocation) {
        this.saveState();
        
        const { sequence, location } = selectedData;
        
        // 如果只有一张牌，使用原来的移动逻辑
        if (sequence.length === 1) {
            this.makeMove({ card: sequence[0], location: location }, targetLocation);
            return;
        }
        
        // 序列移动只能在tableau列之间进行
        if (location.type === 'tableau' && targetLocation.type === 'tableau') {
            // 从原列移除序列
            for (let i = 0; i < sequence.length; i++) {
                this.tableau[location.column].pop();
            }
            
            // 添加到目标列
            for (const card of sequence) {
                this.tableau[targetLocation.column].push(card);
            }
            
            this.moves++;
            this.checkWin();
        }
    }

    saveState() {
        const state = {
            tableau: JSON.parse(JSON.stringify(this.tableau)),
            freeCells: [...this.freeCells],
            foundations: JSON.parse(JSON.stringify(this.foundations)),
            moveCount: this.moveCount
        };
        this.gameHistory.push(state);
        if (this.gameHistory.length > 10) {
            this.gameHistory.shift();
        }
    }

    undo() {
        if (this.gameHistory.length === 0) return;
        
        const lastState = this.gameHistory.pop();
        this.tableau = lastState.tableau;
        this.freeCells = lastState.freeCells;
        this.foundations = lastState.foundations;
        this.moveCount = lastState.moveCount;
        
        this.updateDisplay();
    }

    checkWin() {
        const totalFoundationCards = this.foundations.reduce((sum, pile) => sum + pile.length, 0);
        if (totalFoundationCards === 52) {
            this.showWinModal();
        }
    }

    showWinModal() {
        const modal = document.getElementById('winModal');
        const finalTime = document.getElementById('finalTime');
        const finalMoves = document.getElementById('finalMoves');
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        finalTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        finalMoves.textContent = this.moveCount;
        
        modal.style.display = 'block';
    }

    newGame() {
        this.tableau = Array(8).fill().map(() => []);
        this.freeCells = Array(4).fill(null);
        this.foundations = Array(4).fill().map(() => []);
        this.moveCount = 0;
        this.startTime = Date.now();
        this.selectedCard = null;
        this.gameHistory = [];
        
        document.getElementById('winModal').style.display = 'none';
        
        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.updateDisplay();
    }

    startTimer() {
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    updateDisplay() {
        this.renderTableau();
        this.renderFreeCells();
        this.renderFoundations();
        this.updateControls();
    }

    renderTableau() {
        for (let col = 0; col < 8; col++) {
            const column = document.getElementById(`tableau-${col}`);
            column.innerHTML = '';
            
            this.tableau[col].forEach((card, index) => {
                const cardElement = this.createCardElement(card, 'tableau', col, index);
                cardElement.style.top = `${index * 20}px`;
                column.appendChild(cardElement);
            });
        }
    }

    renderFreeCells() {
        for (let i = 0; i < 4; i++) {
            const cell = document.getElementById(`free-cell-${i}`);
            cell.innerHTML = '';
            
            if (this.freeCells[i]) {
                const cardElement = this.createCardElement(this.freeCells[i], 'freecell', i);
                cell.appendChild(cardElement);
            }
        }
    }

    renderFoundations() {
        for (let i = 0; i < 4; i++) {
            const foundation = document.getElementById(`foundation-${i}`);
            foundation.innerHTML = '';
            
            if (this.foundations[i].length > 0) {
                const topCard = this.foundations[i][this.foundations[i].length - 1];
                const cardElement = this.createCardElement(topCard, 'foundation', i);
                foundation.appendChild(cardElement);
            }
        }
    }

    createCardElement(card, type, ...indices) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.color}`;
        cardElement.dataset.cardId = `${type}-${indices.join('-')}`;
        
        const suitSymbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };

        cardElement.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${suitSymbols[card.suit]}</div>
        `;

        if (this.selectedCard) {
            // 检查是否是选中序列中的卡牌
            const isInSequence = this.selectedCard.sequence && 
                this.selectedCard.sequence.includes(card);
            
            if (isInSequence || 
                (this.selectedCard.card === card && 
                 this.selectedCard.location.type === type)) {
                cardElement.classList.add('selected');
            }
        }

        return cardElement;
    }

    updateControls() {
        document.getElementById('moveCount').textContent = this.moves;
        document.getElementById('undoBtn').disabled = this.gameHistory.length === 0;
    }

    showHint() {
        // 简单的提示逻辑：寻找可以移动到foundation的牌
        for (let col = 0; col < 8; col++) {
            if (this.tableau[col].length > 0) {
                const topCard = this.tableau[col][this.tableau[col].length - 1];
                for (let i = 0; i < 4; i++) {
                    if (this.canMove({ card: topCard, location: { type: 'tableau', column: col } }, 
                                   { type: 'foundation', index: i })) {
                        alert(`提示：可以将 ${topCard.rank}${topCard.suit} 移动到 ${this.suits[i]} 基础堆`);
                        return;
                    }
                }
            }
        }
        
        for (let i = 0; i < 4; i++) {
            if (this.freeCells[i]) {
                const card = this.freeCells[i];
                for (let j = 0; j < 4; j++) {
                    if (this.canMove({ card: card, location: { type: 'freecell', index: i } }, 
                                   { type: 'foundation', index: j })) {
                        alert(`提示：可以将 ${card.rank}${card.suit} 移动到 ${this.suits[j]} 基础堆`);
                        return;
                    }
                }
            }
        }
        
        alert('暂无可用提示');
    }
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new FreeCellGame();
});