// ===========================
// Currency Converter Application
// ===========================

// Configuration
const CONFIG = {
    API_URL: 'https://api.exchangerate-api.com/v4/latest/',
    UPDATE_INTERVAL: 3600000, // 1 hour in milliseconds
    POPULAR_PAIRS: [
        { from: 'USD', to: 'EUR', fromFlag: '🇺🇸', toFlag: '🇪🇺' },
        { from: 'GBP', to: 'USD', fromFlag: '🇬🇧', toFlag: '🇺🇸' },
        { from: 'EUR', to: 'GBP', fromFlag: '🇪🇺', toFlag: '🇬🇧' },
        { from: 'USD', to: 'JPY', fromFlag: '🇺🇸', toFlag: '🇯🇵' },
        { from: 'USD', to: 'CAD', fromFlag: '🇺🇸', toFlag: '🇨🇦' },
        { from: 'USD', to: 'AUD', fromFlag: '🇺🇸', toFlag: '🇦🇺' }
    ],
    CURRENCY_NAMES: {
        'USD': 'US Dollar',
        'EUR': 'Euro',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'AUD': 'Australian Dollar',
        'CAD': 'Canadian Dollar',
        'CHF': 'Swiss Franc',
        'CNY': 'Chinese Yuan',
        'INR': 'Indian Rupee',
        'MXN': 'Mexican Peso',
        'BRL': 'Brazilian Real',
        'ZAR': 'South African Rand',
        'SGD': 'Singapore Dollar',
        'HKD': 'Hong Kong Dollar',
        'SEK': 'Swedish Krona',
        'NOK': 'Norwegian Krone',
        'DKK': 'Danish Krone',
        'NZD': 'New Zealand Dollar',
        'KRW': 'South Korean Won',
        'TRY': 'Turkish Lira',
        'RUB': 'Russian Ruble',
        'PLN': 'Polish Zloty',
        'THB': 'Thai Baht',
        'MYR': 'Malaysian Ringgit',
        'IDR': 'Indonesian Rupiah',
        'PHP': 'Philippine Peso',
        'CZK': 'Czech Koruna',
        'ILS': 'Israeli Shekel',
        'AED': 'UAE Dirham',
                'SAR': 'Saudi Riyal',
        'DOP': 'Dominican Peso'

    }
};

// State Management
const state = {
    exchangeRates: {},
    baseCurrency: 'USD',
    lastUpdate: null,
    isLoading: false
};

// Cache Configuration
const CACHE_KEY = 'quickcurrency_rates';
const CACHE_DURATION = 3600000; // 1 hour

// DOM Elements
const elements = {
    fromAmount: document.getElementById('fromAmount'),
    toAmount: document.getElementById('toAmount'),
    fromCurrency: document.getElementById('fromCurrency'),
    toCurrency: document.getElementById('toCurrency'),
    swapBtn: document.getElementById('swapBtn'),
    convertBtn: document.getElementById('convertBtn'),
    rateText: document.getElementById('rateText'),
    lastUpdate: document.getElementById('lastUpdate'),
    popularGrid: document.getElementById('popularGrid'),
    ratesTableBody: document.getElementById('ratesTableBody')
};

// ===========================
// API Functions
// ===========================

/**
 * Load cached rates from localStorage
 */
function loadCachedRates() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const { rates, baseCurrency, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (less than 1 hour old)
        if (now - timestamp < CACHE_DURATION) {
            console.log('Using cached rates (valid for ' + Math.round((CACHE_DURATION - (now - timestamp)) / 60000) + ' more minutes)');
            state.exchangeRates = rates;
            state.baseCurrency = baseCurrency;
            state.lastUpdate = new Date(timestamp);
            return rates;
        }
        
        console.log('Cache expired, will fetch fresh data');
        return null;
    } catch (error) {
        console.error('Error loading cached rates:', error);
        return null;
    }
}

/**
 * Save rates to localStorage cache
 */
function cacheRates(rates, baseCurrency) {
    try {
        const cacheData = {
            rates,
            baseCurrency,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('Rates cached successfully');
    } catch (error) {
        console.error('Error caching rates:', error);
    }
}

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(baseCurrency = 'USD') {
    try {
        state.isLoading = true;
        const response = await fetch(`${CONFIG.API_URL}${baseCurrency}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch exchange rates');
        }
        
        const data = await response.json();
        state.exchangeRates = data.rates;
        state.baseCurrency = baseCurrency;
        state.lastUpdate = new Date(data.time_last_updated || Date.now());
        
        // Cache the fresh data
        cacheRates(data.rates, baseCurrency);
        
        return data.rates;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        
        // Try to load from cache if API fails
        const cachedRates = loadCachedRates();
        if (cachedRates) {
            console.log('API failed, using cached data');
            return cachedRates;
        }
        
        showErrorMessage('Unable to fetch exchange rates. Please try again.');
        return null;
    } finally {
        state.isLoading = false;
    }
}

/**
 * Convert currency amount
 */
function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!state.exchangeRates || Object.keys(state.exchangeRates).length === 0) {
        return 0;
    }

    // If converting from base currency
    if (fromCurrency === state.baseCurrency) {
        return amount * state.exchangeRates[toCurrency];
    }
    
    // If converting to base currency
    if (toCurrency === state.baseCurrency) {
        return amount / state.exchangeRates[fromCurrency];
    }
    
    // Converting between two non-base currencies
    const amountInBase = amount / state.exchangeRates[fromCurrency];
    return amountInBase * state.exchangeRates[toCurrency];
}

/**
 * Get exchange rate between two currencies
 */
function getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1;
    
    if (fromCurrency === state.baseCurrency) {
        return state.exchangeRates[toCurrency];
    }
    
    if (toCurrency === state.baseCurrency) {
        return 1 / state.exchangeRates[fromCurrency];
    }
    
    return state.exchangeRates[toCurrency] / state.exchangeRates[fromCurrency];
}

// ===========================
// UI Update Functions
// ===========================

/**
 * Update conversion display
 */
function updateConversion() {
    const amount = parseFloat(elements.fromAmount.value) || 0;
    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    
    const convertedAmount = convertCurrency(amount, fromCurrency, toCurrency);
    elements.toAmount.value = convertedAmount.toFixed(2);
    
    // Update rate info
    const rate = getExchangeRate(fromCurrency, toCurrency);
    elements.rateText.textContent = `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`;
    
    // Update last update time
    if (state.lastUpdate) {
        elements.lastUpdate.textContent = `Last updated: ${formatTime(state.lastUpdate)}`;
    }
}

/**
 * Swap currencies
 */
function swapCurrencies() {
    const tempCurrency = elements.fromCurrency.value;
    const tempAmount = elements.fromAmount.value;
    
    elements.fromCurrency.value = elements.toCurrency.value;
    elements.toCurrency.value = tempCurrency;
    elements.fromAmount.value = elements.toAmount.value;
    
    updateConversion();
}

/**
 * Populate popular conversions grid
 */
function populatePopularConversions() {
    elements.popularGrid.innerHTML = '';
    
    CONFIG.POPULAR_PAIRS.forEach(pair => {
        const rate = getExchangeRate(pair.from, pair.to);
        const randomChange = (Math.random() * 2 - 1).toFixed(2); // Random change for demo
        const isPositive = randomChange >= 0;
        
        const card = document.createElement('div');
        card.className = 'popular-card';
        card.innerHTML = `
            <div class="popular-card-header">
                <div class="currency-pair">${pair.from}/${pair.to}</div>
                <div class="currency-flags">${pair.fromFlag} ${pair.toFlag}</div>
            </div>
            <div class="popular-rate">${rate.toFixed(4)}</div>
            <div class="rate-change ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '▲' : '▼'} ${Math.abs(randomChange)}%
            </div>
        `;
        
        // Add click handler to populate converter
        card.addEventListener('click', () => {
            elements.fromCurrency.value = pair.from;
            elements.toCurrency.value = pair.to;
            updateConversion();
            scrollToConverter();
        });
        
        elements.popularGrid.appendChild(card);
    });
}

/**
 * Populate exchange rates table
 */
function populateRatesTable() {
    const currencies = Object.keys(CONFIG.CURRENCY_NAMES);
    elements.ratesTableBody.innerHTML = '';
    
    currencies.forEach(currency => {
        if (currency === state.baseCurrency) return;
        
        const rate = state.exchangeRates[currency];
        const randomChange = (Math.random() * 2 - 1).toFixed(2);
        const isPositive = randomChange >= 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="currency-name">${CONFIG.CURRENCY_NAMES[currency]}</div>
            </td>
            <td><span class="currency-code">${currency}</span></td>
            <td><strong>${rate.toFixed(4)}</strong></td>
            <td>
                <span class="rate-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(randomChange)}%
                </span>
            </td>
        `;
        
        // Add click handler
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            elements.fromCurrency.value = state.baseCurrency;
            elements.toCurrency.value = currency;
            updateConversion();
            scrollToConverter();
        });
        
        elements.ratesTableBody.appendChild(row);
    });
}

// ===========================
// Utility Functions
// ===========================

/**
 * Format time for display
 */
function formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 3000);
}

/**
 * Scroll to converter section
 */
function scrollToConverter() {
    document.getElementById('converter').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ===========================
// Event Listeners
// ===========================

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Amount input change
    elements.fromAmount.addEventListener('input', updateConversion);
    
    // Currency selection change
    elements.fromCurrency.addEventListener('change', updateConversion);
    elements.toCurrency.addEventListener('change', updateConversion);
    
    // Swap button
    elements.swapBtn.addEventListener('click', swapCurrencies);
    
    // Convert button (updates conversion and refreshes rates)
    elements.convertBtn.addEventListener('click', async () => {
        // Immediate visual feedback
        updateConversion();
        
        // Show loading state
        elements.convertBtn.disabled = true;
        elements.convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        
        // Fetch fresh rates in background
        await fetchExchangeRates(state.baseCurrency);
        updateConversion();
        populatePopularConversions();
        populateRatesTable();
        
        // Reset button
        elements.convertBtn.disabled = false;
        elements.convertBtn.innerHTML = '<i class="fas fa-check-circle"></i> Updated!';
        
        // Change back to normal after 2 seconds
        setTimeout(() => {
            elements.convertBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Convert Now';
        }, 2000);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.activeElement === elements.fromAmount) {
            updateConversion();
        }
    });
}

// ===========================
// Initialization
// ===========================

/**
 * Show loading state
 */
function showLoading() {
    if (elements.convertBtn) {
        elements.convertBtn.disabled = true;
        elements.convertBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading rates...';
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    if (elements.convertBtn) {
        elements.convertBtn.disabled = false;
        elements.convertBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Convert Now';
    }
}

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Currency Converter...');
    
    // Try to load cached rates first for instant display
    const cachedRates = loadCachedRates();
    
    if (cachedRates) {
        // Show cached data immediately (INSTANT LOAD!)
        console.log('✅ Instant load from cache!');
        updateConversion();
        populatePopularConversions();
        populateRatesTable();
        
        // Fetch fresh data in background (non-blocking)
        fetchExchangeRates('USD').then(() => {
            console.log('✅ Fresh rates loaded in background');
            updateConversion();
            populatePopularConversions();
            populateRatesTable();
        });
    } else {
        // No cache, show loading and fetch
        console.log('⏳ First visit, fetching rates...');
        showLoading();
        await fetchExchangeRates('USD');
        hideLoading();
        
        // Initial display
        updateConversion();
        populatePopularConversions();
        populateRatesTable();
    }
    
    // Initialize event listeners
    initEventListeners();
    
    // Auto-update rates periodically
    setInterval(async () => {
        console.log('🔄 Auto-refreshing rates...');
        await fetchExchangeRates(state.baseCurrency);
        updateConversion();
        populatePopularConversions();
        populateRatesTable();
    }, CONFIG.UPDATE_INTERVAL);
    
    console.log('Currency Converter initialized successfully!');
}

// ===========================
// Animations
// ===========================

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===========================
// Start Application
// ===========================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===========================
// Export for testing (optional)
// ===========================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        convertCurrency,
        getExchangeRate,
        formatTime,
        CONFIG
    };
}

