document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    initGame();
});

class Card {
    constructor(value, suit, faceUp = false) {
        this.value = value;
        this.suit = suit;
        this.faceUp = faceUp;
    }

    get color() {
        return ['♥', '♦'].includes(this.suit) ? 'red' : 'black';
    }

    get display() {
        return `${this.value}${this.suit}`;
    }
}

let deck = [];
let tableau = Array(7).fill().map(() => []);
let foundation = Array(4).fill().map(() => []);
let stock = [];
let waste = [];

function initGame() {
    createDeck();
    shuffleDeck();
    dealCards();
    setupEventListeners();
}

function createDeck() {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    deck = [];

    for (let suit of suits) {
        for (let value of values) {
            deck.push(new Card(value, suit));
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealCards() {
    // Deal to tableau
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            const card = deck.pop();
            card.faceUp = i === j;
            tableau[j].push(card);
        }
    }
    
    // Remaining cards go to stock
    stock = deck;
    deck = [];
    renderGame();
}

function renderGame() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.innerHTML = '';

    // Render stock and waste
    const topRow = document.createElement('div');
    topRow.className = 'top-row';
    
    const stockPile = createPile('stock', stock);
    const wastePile = createPile('waste', waste);
    const foundationPiles = foundation.map((f, i) => createPile(`foundation-${i}`, f));
    
    topRow.append(stockPile, wastePile, ...foundationPiles);
    gameContainer.appendChild(topRow);

    // Render tableau
    const tableauRow = document.createElement('div');
    tableauRow.className = 'tableau-row';
    tableau.forEach((pile, i) => {
        tableauRow.appendChild(createPile(`tableau-${i}`, pile));
    });
    gameContainer.appendChild(tableauRow);

    // Reattach stock click listener after rendering
    document.querySelector('#stock')?.addEventListener('click', handleStockClick);
}

function createPile(id, cards) {
    const pile = document.createElement('div');
    pile.className = 'pile';
    pile.id = id;
    
    if (id === 'stock') {
        if (cards.length > 0) {
            const cardElement = document.createElement('div');
            cardElement.className = 'card face-down';
            pile.appendChild(cardElement);
        }
        return pile;
    }

    if (id === 'waste') {
        const visibleCards = cards.slice(-3);
        visibleCards.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            cardElement.style.left = `${index * 20}px`;
            cardElement.dataset.index = (cards.length - visibleCards.length + index).toString();
            pile.appendChild(cardElement);
        });
        return pile;
    }
    
    cards.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        cardElement.style.top = `${index * 20}px`;
        pile.appendChild(cardElement);
    });
    
    return pile;
}

function createCardElement(card, index) {
    const cardElement = document.createElement('div');
    cardElement.className = `card ${card.faceUp ? 'face-up' : 'face-down'} ${card.color}`;
    
    if (card.faceUp) {
        // Add corner values
        const cornerTop = document.createElement('div');
        cornerTop.className = 'corner top';
        cornerTop.innerHTML = `
            <span class="value">${card.value}</span>
            <span class="suit">${card.suit}</span>
        `;
        
        const cornerBottom = document.createElement('div');
        cornerBottom.className = 'corner bottom';
        cornerBottom.innerHTML = `
            <span class="value">${card.value}</span>
            <span class="suit">${card.suit}</span>
        `;
        
        // Add center content
        const center = document.createElement('div');
        center.className = 'center';
        
        if (['J', 'Q', 'K'].includes(card.value)) {
            center.className += ' face';
            // Add suit class for image selection
            const suitName = {
                '♠': 'spades',
                '♥': 'hearts',
                '♦': 'diamonds',
                '♣': 'clubs'
            }[card.suit];
            center.className += ` ${suitName} ${card.value}`;
        } else {
            center.className += ` rank-${card.value}`;
            const pipCount = isNaN(card.value) ? 1 : parseInt(card.value);
            
            // Create pips based on card value
            for (let i = 0; i < pipCount; i++) {
                const pip = document.createElement('div');
                pip.className = 'pip';
                pip.textContent = card.suit;
                center.appendChild(pip);
            }
        }
        
        cardElement.appendChild(cornerTop);
        cardElement.appendChild(center);
        cardElement.appendChild(cornerBottom);
        cardElement.draggable = true;
        cardElement.dataset.index = index.toString();
    }
    
    return cardElement;
}

function setupEventListeners() {
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    // Remove stock click listener from here as it needs to be reattached after each render
}

function handleDragStart(e) {
    if (!e.target.classList.contains('card')) return;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.parentElement.id);
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const draggedFromId = e.dataTransfer.getData('text/plain');
    const dropTarget = e.target.closest('.pile') || e.target;
    
    if (!dropTarget.classList.contains('pile')) return;
    
    const sourceArray = getArrayFromId(draggedFromId);
    const targetArray = getArrayFromId(dropTarget.id);
    
    // Get the dragged card's source index
    const draggedCard = document.querySelector('.dragging');
    const cardIndex = parseInt(draggedCard.dataset.index) || Array.from(draggedCard.parentElement.children)
        .filter(card => !card.classList.contains('face-down'))
        .indexOf(draggedCard);
    
    if (cardIndex === -1) return;
    
    let draggedCards;
    if (draggedFromId === 'waste') {
        // Only move single card from waste
        draggedCards = [sourceArray.pop()];
    } else {
        // Move all cards from the dragged card to the end
        draggedCards = sourceArray.splice(cardIndex);
    }
    
    if (isValidMove(draggedCards[0], targetArray, dropTarget.id, draggedCards.length)) {
        targetArray.push(...draggedCards);
        // Flip the top card of the source pile if it exists
        if (sourceArray.length > 0 && draggedFromId.startsWith('tableau-')) {
            sourceArray[sourceArray.length - 1].faceUp = true;
        }
    } else {
        sourceArray.push(...draggedCards);
    }
    
    renderGame();
    document.querySelector('.dragging')?.classList.remove('dragging');
}

function getArrayFromId(id) {
    if (id.startsWith('tableau-')) {
        return tableau[parseInt(id.split('-')[1])];
    } else if (id.startsWith('foundation-')) {
        return foundation[parseInt(id.split('-')[1])];
    } else if (id === 'waste') {
        return waste;
    }
    return [];
}

function isValidMove(card, targetPile, targetId, cardCount) {
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    // Foundation pile rules
    if (targetId.startsWith('foundation-')) {
        if (cardCount > 1) return false; // Only single cards on foundation
        if (targetPile.length === 0) {
            return card.value === 'A';
        }
        const targetCard = targetPile[targetPile.length - 1];
        return card.suit === targetCard.suit && 
               values.indexOf(card.value) === values.indexOf(targetCard.value) + 1;
    }
    
    // Tableau pile rules
    if (targetPile.length === 0) {
        return card.value === 'K';
    }
    
    const targetCard = targetPile[targetPile.length - 1];
    return targetCard.faceUp && 
           card.color !== targetCard.color && 
           values.indexOf(card.value) === values.indexOf(targetCard.value) - 1;
}

function handleStockClick() {
    if (stock.length === 0 && waste.length > 0) {
        // Reset stock from waste
        stock = waste.map(card => card).reverse();
        waste = [];
    } else if (stock.length > 0) {
        // Deal one card to waste
        const card = stock.pop();
        if (card) {
            card.faceUp = true;
            waste.push(card);
        }
    }
    renderGame();
}
