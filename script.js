// Constants and Global Variables
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSLAdm3vi00C8DPaMRjbxB9GWYiW_DHDFRRrdZtRP_qfifxZC6rMkcSIE2vavWWmicwW-jEfNf9IPh2/pub?output=csv';
let products = [];
let groupedProducts = {};
const cart = [];
const productsPerPage = 50;
let currentPage = 1;
let currentCategory = 'Featured';

// Stock icon SVG
const stockIcon = `
    <svg class="stock-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
`;

// Fetch products from the Google Sheet CSV
function fetchProducts() {
    fetch(sheetUrl)
        .then(response => response.text())
        .then(data => {
            products = parseCSV(data);
            groupProducts();
            displayCategories();
            displayProducts(currentCategory, currentPage);
            updateCart(); // Initialize cart display
        })
        .catch(error => console.error('Error fetching products:', error));
}

// Parse CSV data into an array of product objects
function parseCSV(data) {
    return data.split('\n').slice(1).map(row => {
        const cols = row.split(/(?=(?:[^"]*"[^"]*")*[^"]*$),/).map(col => col.replace(/^"|"$/g, '').trim());
        return {
            SKU: cols[0],
            Model: cols[1],
            Color: cols[2],
            Size: cols[3],
            Title: cols[4],
            Description: cols[5],
            Category: cols[6],
            CostPrice: parseFloat(cols[7]) || 0,
            WholesalePrice: parseFloat(cols[8]) || 0,
            SellingPrice: parseFloat(cols[9]) || 0,
            SalePrice: parseFloat(cols[10]) || 0,
            Quantity: parseInt(cols[11]) || 0,
            Image: cols[12],
            ImageLink: cols[13],
            ListUnlist: cols[14],
            Featured: cols[15]
        };
    }).filter(p => p.ListUnlist === 'List');
}

// Group products by Model for efficient display
function groupProducts() {
    groupedProducts = products.reduce((acc, product) => {
        if (!acc[product.Model]) {
            acc[product.Model] = {
                Title: product.Title,
                Description: product.Description,
                Category: product.Category,
                Variants: [],
                Images: [],
                Featured: product.Featured,
                TotalQuantity: 0
            };
        }
        acc[product.Model].Variants.push({
            SKU: product.SKU,
            Color: product.Color,
            Size: product.Size,
            SellingPrice: product.SellingPrice,
            SalePrice: product.SalePrice,
            Quantity: product.Quantity,
            Image: product.Image
        });
        if (product.Image && !acc[product.Model].Images.includes(product.Image)) {
            acc[product.Model].Images.push(product.Image);
        }
        acc[product.Model].TotalQuantity += product.Quantity;
        return acc;
    }, {});
}

// Display category buttons in the top bar
function displayCategories() {
    const categories = [...new Set(products.map(p => p.Category))];
    const container = document.getElementById('top-categories');
    container.innerHTML = '';
    const featuredButton = document.createElement('button');
    featuredButton.className = currentCategory === 'Featured' ? 'active' : '';
    featuredButton.textContent = 'Featured';
    featuredButton.onclick = () => {
        backToHome();
        filterByCategory('Featured', 1);
    };
    container.appendChild(featuredButton);

    const allButton = document.createElement('button');
    allButton.className = currentCategory === 'All' ? 'active' : '';
    allButton.textContent = 'All';
    allButton.onclick = () => {
        backToHome();
        filterByCategory('All', 1);
    };
    container.appendChild(allButton);

    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = currentCategory === category ? 'active' : '';
        button.textContent = category;
        button.onclick = () => {
            backToHome();
            filterByCategory(category, 1);
        };
        container.appendChild(button);
    });
}

// Display products in a grid on the homepage with pagination
function displayProducts(category = 'Featured', page = 1) {
    const container = document.getElementById('product-list');
    let filteredProducts = products;

    // Filter products based on category
    if (category && category !== 'All' && category !== 'Featured') {
        filteredProducts = products.filter(p => p.Category === category);
    } else if (category === 'Featured') {
        filteredProducts = products.filter(p => p.Featured === 'Y');
    }

    // Get unique models to avoid duplicates
    const uniqueModels = [...new Set(filteredProducts.map(p => p.Model))];

    // Pagination logic
    const totalItems = uniqueModels.length;
    const totalPages = Math.ceil(totalItems / productsPerPage);
    currentPage = Math.min(page, totalPages);
    currentCategory = category;

    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedModels = uniqueModels.slice(startIndex, endIndex);

    container.innerHTML = paginatedModels.map(model => {
        const product = groupedProducts[model];
        const firstVariant = product.Variants[0];
        const hasSale = firstVariant.SalePrice && firstVariant.SalePrice !== firstVariant.SellingPrice;
        const hasMultipleVariants = product.Variants.length > 1;

        return `
            <div class="product-item">
                <div class="image-wrapper" onclick="${hasMultipleVariants ? `viewProduct('${model}')` : `openZoomPopup('./assets/Product_Images/${product.Images[0] || ''}')`}">
                    <img src="./assets/Product_Images/${product.Images[0] || ''}" alt="${product.Title}" onload="this.classList.add('visible')" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.add('visible');">
                    <div class="no-image">No Image</div>
                    ${hasSale ? '<span class="badge sale">Sale</span>' : ''}
                </div>
                <div class="product-details">
                    <div class="sku-container">
                        <p class="sku">${model.toUpperCase()}</p>
                        <span class="stock-info">${stockIcon}${product.TotalQuantity}</span>
                    </div>
                    <h3>${product.Title}</h3>
                </div>
                <div class="price-container">
                    <div>
                        ${hasSale ? `<p class="selling-price">${firstVariant.SellingPrice.toFixed(2)}</p>` : ''}
                        <p class="price">AED ${(hasSale ? firstVariant.SalePrice : firstVariant.SellingPrice).toFixed(2)}</p>
                    </div>
                    ${hasMultipleVariants
                        ? `<button class="choose-button" onclick="viewProduct('${model}')">Choose</button>`
                        : `<button class="add-to-cart-button" onclick="addToCart('${model}', '${firstVariant.SKU}')">Add to Cart</button>`}
                </div>
            </div>
        `;
    }).join('');

    // Display pagination controls
    displayPagination(totalPages);
}

// Display pagination controls
function displayPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
    `;
}

// Change page for pagination
function changePage(page) {
    displayProducts(currentCategory, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Filter products by category
function filterByCategory(category, page = 1) {
    currentCategory = category;
    currentPage = page;
    displayProducts(category, page);
    displayCategories(); // Ensure categories are updated
}

// Display the product details page with variants as cards
function viewProduct(model) {
    const product = groupedProducts[model];
    const main = document.querySelector('main');

    main.innerHTML = `
        <section id="products">
            <div id="product-page">
                <h2>${product.Title}</h2>
                <p>${product.Description}</p>
                <div class="variants-grid">
                    ${product.Variants.map(variant => {
                        const hasSale = variant.SalePrice && variant.SalePrice !== variant.SellingPrice;
                        return `
                            <div class="product-item">
                                <div class="image-wrapper" onclick="openZoomPopup('./assets/Product_Images/${variant.Image || ''}')">
                                    <img src="./assets/Product_Images/${variant.Image || ''}" alt="${variant.SKU}" onload="this.classList.add('visible')" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.add('visible');">
                                    <div class="no-image">No Image</div>
                                    ${hasSale ? '<span class="badge sale">Sale</span>' : ''}
                                </div>
                                <div class="product-details">
                                    <div class="sku-container">
                                        <p class="sku">${variant.SKU}</p>
                                        <span class="stock-info">${stockIcon}${variant.Quantity}</span>
                                    </div>
                                    <h3>${product.Title}</h3>
                                </div>
                                <div class="price-container">
                                    <div>
                                        ${hasSale ? `<p class="selling-price">${variant.SellingPrice.toFixed(2)}</p>` : ''}
                                        <p class="price">AED ${(variant.SalePrice || variant.SellingPrice).toFixed(2)}</p>
                                    </div>
                                    <button class="add-to-cart-button" onclick="addToCart('${model}', '${variant.SKU}')">Add to Cart</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </section>
    `;
    // Add the Back to Home button dynamically
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = 'Back to Home';
    backButton.onclick = backToHome;
    document.body.appendChild(backButton);

    // Re-display category buttons on the product page
    displayCategories();
}

// Open a zoom popup for the image
function openZoomPopup(imageSrc) {
    const popup = document.createElement('div');
    popup.className = 'zoom-popup';
    popup.innerHTML = `
        <img src="${imageSrc}" alt="Zoomed Image">
        <button class="close-button">Close</button>
    `;
    document.body.appendChild(popup);

    // Close on outside click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    });

    // Close on button click
    popup.querySelector('.close-button').addEventListener('click', () => {
        popup.remove();
    });

    const img = popup.querySelector('img');
    let scale = 1;
    popup.addEventListener('wheel', (e) => {
        e.preventDefault();
        scale += e.deltaY * -0.01;
        scale = Math.min(Math.max(0.5, scale), 3);
        img.style.transform = `scale(${scale})`;
    });
}

// Return to the homepage
function backToHome() {
    // Remove the Back to Home button
    const backButton = document.querySelector('.back-button');
    if (backButton) backButton.remove();

    const main = document.querySelector('main');
    main.innerHTML = `
        <section id="products">
            <div id="product-list"></div>
            <div id="pagination" class="pagination"></div>
        </section>
    `;
    displayProducts(currentCategory, currentPage);
    displayCategories();
}

// Add a product to the cart
function addToCart(model, sku) {
    console.log(`Adding to cart: Model=${model}, SKU=${sku}`); // Debug log
    const product = products.find(p => p.SKU === sku);
    if (!product) {
        console.error(`Product with SKU ${sku} not found`);
        alert('Product not found');
        return;
    }
    const existingItem = cart.find(item => item.SKU === sku);

    if (existingItem) {
        if (existingItem.quantity < product.Quantity) {
            existingItem.quantity++;
        } else {
            alert('Maximum quantity reached');
            return;
        }
    } else {
        cart.push({
            SKU: sku,
            Image: product.Image,
            Price: product.SalePrice || product.SellingPrice,
            quantity: 1,
            maxQuantity: product.Quantity,
            Title: product.Title
        });
    }
    updateCart();
    showCartNotification(product);
}

// Show cart notification
function showCartNotification(product) {
    const existingNotification = document.querySelector('#cart-notification');
    if (existingNotification) existingNotification.remove();

    const notification = document.createElement('div');
    notification.id = 'cart-notification';
    document.getElementById('cart').appendChild(notification);
    notification.innerHTML = `
        <img src="./assets/cart-icon.png" class="icon" alt="Added to Cart">
        <img src="./assets/Product_Images/${product.Image || ''}" class="product-image" alt="${product.Title}" onload="this.classList.add('visible')" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.add('visible');">
        <div class="no-image">No Image</div>
        <div class="notification-text">
            <p>Added to Cart!</p>
            <p class="sku">SKU: ${product.SKU}</p>
        </div>
    `;

    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Update the cart display
function updateCart() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-image-container">
                <img src="./assets/Product_Images/${item.Image || ''}" alt="${item.SKU}" onload="this.classList.add('visible')" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.add('visible');">
                <div class="no-image">No Image</div>
            </div>
            <div class="cart-item-details">
                <p>${item.SKU}</p>
                <p>AED ${item.Price.toFixed(2)}</p>
            </div>
            <div class="quantity-control">
                <button onclick="updateQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity(${index}, 1)">+</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
    const vat = subtotal * 0.05;
    const shipping = subtotal < 100 ? 15 : 0;
    const total = subtotal + vat + shipping;

    cartTotal.innerHTML = `
        <p>Subtotal: AED ${subtotal.toFixed(2)}</p>
        <p>VAT (5%): AED ${vat.toFixed(2)}</p>
        <p>Shipping: AED ${shipping.toFixed(2)}</p>
        <p>Total: AED ${total.toFixed(2)}</p>
    `;
}

// Update the quantity of an item in the cart
function updateQuantity(index, change) {
    console.log(`Updating quantity: Index=${index}, Change=${change}`); // Debug log
    const item = cart[index];
    if (!item) {
        console.error(`Item at index ${index} not found in cart`);
        return;
    }
    const newQuantity = item.quantity + change;

    if (newQuantity > item.maxQuantity) {
        alert('Maximum quantity reached');
        return;
    }
    if (newQuantity <= 0) {
        cart.splice(index, 1);
    } else {
        item.quantity = newQuantity;
    }
    updateCart();
}

// Search products by title or model
function searchProducts() {
    const query = document.getElementById('search-bar').value.toLowerCase();
    const filteredProducts = products.filter(p =>
        p.Title.toLowerCase().includes(query) || p.Model.toLowerCase().includes(query)
    );
    const uniqueModels = [...new Set(filteredProducts.map(p => p.Model))];
    const container = document.getElementById('product-list');

    const totalItems = uniqueModels.length;
    const totalPages = Math.ceil(totalItems / productsPerPage);
    currentPage = 1;
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedModels = uniqueModels.slice(startIndex, endIndex);

    container.innerHTML = paginatedModels.map(model => {
        const product = groupedProducts[model];
        const firstVariant = product.Variants[0];
        const hasSale = firstVariant.SalePrice && firstVariant.SalePrice !== firstVariant.SellingPrice;
        const hasMultipleVariants = product.Variants.length > 1;

        return `
            <div class="product-item">
                <div class="image-wrapper" onclick="${hasMultipleVariants ? `viewProduct('${model}')` : `openZoomPopup('./assets/Product_Images/${product.Images[0] || ''}')`}">
                    <img src="./assets/Product_Images/${product.Images[0] || ''}" alt="${product.Title}" onload="this.classList.add('visible')" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.add('visible');">
                    <div class="no-image">No Image</div>
                    ${hasSale ? '<span class="badge sale">Sale</span>' : ''}
                </div>
                <div class="product-details">
                    <div class="sku-container">
                        <p class="sku">${model.toUpperCase()}</p>
                        <span class="stock-info">${stockIcon}${product.TotalQuantity}</span>
                    </div>
                    <h3>${product.Title}</h3>
                </div>
                <div class="price-container">
                    <div>
                        ${hasSale ? `<p class="selling-price">${firstVariant.SellingPrice.toFixed(2)}</p>` : ''}
                        <p class="price">AED ${(hasSale ? firstVariant.SalePrice : firstVariant.SellingPrice).toFixed(2)}</p>
                    </div>
                    ${hasMultipleVariants
                        ? `<button class="choose-button" onclick="viewProduct('${model}')">Choose</button>`
                        : `<button class="add-to-cart-button" onclick="addToCart('${model}', '${firstVariant.SKU}')">Add to Cart</button>`}
                </div>
            </div>
        `;
    }).join('');

    displayPagination(totalPages);
}

// Initialize the page with event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('checkout-button').addEventListener('click', (e) => {
        e.stopPropagation();
        const orderItems = cart.map(item => `${item.SKU} x ${item.quantity}`).join('\n');
        const subtotal = cart.reduce((sum, item) => sum + item.Price * item.quantity, 0);
        const vat = subtotal * 0.05;
        const shipping = subtotal < 100 ? 15 : 0;
        const total = subtotal + vat + shipping;

        const message = `I would like to place order for the following items:\n\n${orderItems}\n\nSubtotal: AED ${subtotal.toFixed(2)}\nVAT (5%): AED ${vat.toFixed(2)}\nShipping: AED ${shipping.toFixed(2)}\nTotal: AED ${total.toFixed(2)}\n\nPlease provide your name, phone, and address.`;
        window.open(`https://wa.me/+971568743529?text=${encodeURIComponent(message)}`);

        cart.length = 0;
        updateCart();
    });

    document.getElementById('cart').addEventListener('click', (e) => {
        if (e.target.closest('.quantity-control') || e.target.id === 'checkout-button') return;
        const dropdown = document.getElementById('cart-dropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('search-bar').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });

    // Add click event for search button in header
    document.querySelector('.search-container button').addEventListener('click', searchProducts);

    fetchProducts();
});