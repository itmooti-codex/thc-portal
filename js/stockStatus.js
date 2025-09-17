// Stock status handling for product cards
(function () {
    const GRID_SELECTOR = '.grid-root[data-dynamic-list]';

    function isOutOfStock(status) {
        if (!status) return false;
        const statusLower = String(status).toLowerCase();
        return statusLower.includes('out of stock') || 
               statusLower.includes('not available') || 
               statusLower.includes('unavailable');
    }

    function updateCardStockStatus(card) {
        if (!card) return;

        // Find status from hidden data attributes or visible text
        const searchIndex = card.querySelector('.search-index');
        let status = '';
        
        if (searchIndex) {
            status = searchIndex.getAttribute('data-status') || '';
        }
        
        // Fallback to visible status text
        if (!status) {
            const statusSpan = card.querySelector('.px-5.pb-4 .flex.items-center.gap-2:last-child span:last-child');
            if (statusSpan) {
                status = statusSpan.textContent || '';
            }
        }

        const outOfStock = isOutOfStock(status);
        
        // Update status dot
        const statusDot = card.querySelector('.status-dot');
        if (statusDot) {
            statusDot.setAttribute('data-status', status);
            if (outOfStock) {
                statusDot.style.backgroundColor = '#ef4444'; // red-500
            } else {
                statusDot.style.backgroundColor = '#10b981'; // emerald-500
            }
        }

        // Update create script section
        const createScriptSection = card.querySelector('.create-script-section');
        const outOfStockMessage = card.querySelector('.out-of-stock-message');
        
        if (createScriptSection) {
            createScriptSection.setAttribute('data-status', status);
            createScriptSection.style.display = outOfStock ? 'none' : 'flex';
        }
        
        if (outOfStockMessage) {
            outOfStockMessage.setAttribute('data-status', status);
            outOfStockMessage.style.display = outOfStock ? 'flex' : 'none';
        }
    }

    function updateAllCards() {
        const grid = document.querySelector(GRID_SELECTOR);
        if (!grid) return;

        const cards = grid.querySelectorAll('.group, .flex.flex-col');
        cards.forEach(card => {
            // Only process cards that have the create script section
            if (card.querySelector('.create-script-section')) {
                updateCardStockStatus(card);
            }
        });
    }

    function initStockStatus() {
        // Initial update
        updateAllCards();

        // Set up observer for dynamic content changes
        const grid = document.querySelector(GRID_SELECTOR);
        if (!grid) return;

        const observer = new MutationObserver((mutations) => {
            let needsUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes contain product cards
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && (node.classList.contains('group') || node.classList.contains('flex'))) {
                                needsUpdate = true;
                                break;
                            }
                            // Also check for cards within the added node
                            if (node.querySelector && node.querySelector('.create-script-section')) {
                                needsUpdate = true;
                                break;
                            }
                        }
                    }
                }
            }
            if (needsUpdate) {
                // Use a small delay to ensure DOM is fully updated
                setTimeout(updateAllCards, 100);
            }
        });

        observer.observe(grid, {
            childList: true,
            subtree: true
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStockStatus);
    } else {
        initStockStatus();
    }
})();
