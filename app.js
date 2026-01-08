
/*****************************************************************************
 * ADOBE CLIENT DATA LAYER (ACDL) – XDM TEMPLATE
 * Implements standard events: pageLoaded, linkClicked, addToCart, removeFromCart,
 * beginCheckout, purchase
 * No custom event names, no PII, no URLs
 *****************************************************************************/

window.adobeDataLayer = window.adobeDataLayer || [];
console.log('Adobe Data Layer initialized:', window.adobeDataLayer);

// ✅ Global customer object (guest by default)
var custData = {
  loginStatus: "guest",      // guest | logged-in
  platform: "desktop web",   // desktop web | mobile web | app
  language: "en"             // ISO code
};

// ✅ Site metadata
var siteData = {
  siteName: "Shopeze",
  channel: "web/home"
};

/* ---------- 0️⃣ HELPER: Fire pageLoaded Event (ALL PAGES) ---------- */
function firePageLoaded() {
  const page = document.body.dataset.page;

  const pageMap = {
    home: { pageName: "home", pageType: "home", channel: "web/home" },
    plp: { pageName: "products", pageType: "category", channel: "web/category" },
    pdp: { pageName: "product-detail", pageType: "pdp", channel: "web/product" },
    cart: { pageName: "cart", pageType: "cart", channel: "web/cart" },
    checkout: { pageName: "checkout", pageType: "checkout", channel: "web/checkout" },
    "payment-method": { pageName: "payment-method", pageType: "checkout", channel: "web/checkout" },
    payment: { pageName: "payment", pageType: "checkout", channel: "web/checkout" },
    processing: { pageName: "processing", pageType: "checkout", channel: "web/checkout" },
    thankyou: { pageName: "confirmation", pageType: "confirmation", channel: "web/confirmation" }
  };

  const pageData = pageMap[page] || { pageName: page, pageType: page, channel: "web/" + page };

  // Get product details if on PDP or Cart
  let productDetails = {};
  
  // PDP: Single product
  if (page === 'pdp') {
    const prodId = qParam('id');
    const prod = PRODUCTS.find(p => p.id === prodId);
    if (prod) {
      productDetails = {
        product: {
          productID: prod.id,        // Product ID
          productName: prod.title,   // Product Name
          price: prod.price          // Product Price
        }
      };
    }
  }
  
  // CART: All products in cart
  if (page === 'cart') {
    const cartData = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (cartData.length > 0) {
      const products = cartData.map(item => ({
        productID: item.id,
        productName: item.title,
        price: item.price,
        quantity: item.qty
      }));
      
      const totalQuantity = cartData.reduce((sum, item) => sum + item.qty, 0);
      const totalValue = cartData.reduce((sum, item) => sum + (item.price * item.qty), 0);
      
      productDetails = {
        products: products,
        order: {
          totalQuantity: totalQuantity,
          totalValue: totalValue
        }
      };
    }
  }

  // 2️⃣ PAGE LOAD EVENT (XDM Schema) - with product details if on PDP
  const pageLoadEvent = {
    event: "pageLoaded",
    xdmPageLoad: {
      custData: custData,
      web: {
        webPageDetails: {
          siteName: siteData.siteName,
          pageName: pageData.pageName,
          pageType: pageData.pageType,
          channel: pageData.channel,
          pageURL: window.location.href
        }
      }
    }
  };

  // Add product details if available (PDP page)
  if (Object.keys(productDetails).length > 0) {
    pageLoadEvent.xdmPageLoad.xdmCommerce = productDetails;
  }

  window.adobeDataLayer.push(pageLoadEvent);
}

/* ---------- 1️⃣ HELPER: Fire linkClicked Event (ALL CLICKS) ---------- */
function fireLinkClicked(linkName, linkType, linkPosition) {
  const page = document.body.dataset.page;
  
  // 3️⃣ GENERIC CLICK EVENT (XDM Schema) - Click Level Info
  window.adobeDataLayer.push({
    event: "linkClicked",
    xdmActionDetails: {
      web: {
        webInteraction: {
          linkName: linkName || "Unknown Link",          // Link text/label
          linkType: linkType || "nav",                   // nav | cta | banner | card | footer
          linkPosition: linkPosition || "page",          // header, hero-section, product-tile, footer, etc.
          linkPageName: page,
          pageURL: window.location.href                  // Page URL where click occurred
        }
      }
    }
  });
}

/* ---------- 2️⃣ HELPER: Fire addToCart Event (PDP) ---------- */
function fireAddToCart(prod, qty) {
  // 4️⃣ ADD TO CART EVENT (XDM Schema) - Product Info: ID, Name, Price
  window.adobeDataLayer.push({
    event: "addToCart",
    xdmCommerce: {
      product: {
        productID: prod.id,                    // Product ID
        productName: prod.title,               // Product Name
        category: "General",
        price: prod.price,                     // Product Price
        quantity: qty                          // Quantity added
      }
    }
  });

  if (window._satellite) {
    _satellite.track("addToCart");
  }
}

/* ---------- 3️⃣ HELPER: Fire removeFromCart Event (CART) ---------- */
function fireRemoveFromCart(prod, qty) {
  // 5️⃣ REMOVE FROM CART EVENT (XDM Schema) - Cart Item Info: ID, Name, Quantity, Price
  window.adobeDataLayer.push({
    event: "removeFromCart",
    xdmCommerce: {
      product: {
        productID: prod.id,                    // Item ID
        productName: prod.title,               // Item Name
        price: prod.price,                     // Item Price
        quantity: qty                          // Item Quantity
      }
    }
  });
}

/* ---------- 4️⃣ HELPER: Fire beginCheckout Event (CART) ---------- */
function fireBeginCheckout(cart) {
  const totalQuantity = cart.reduce((s, i) => s + i.qty, 0);
  const totalValue = cart.reduce((s, i) => s + i.qty * i.price, 0);

  // 6️⃣ BEGIN CHECKOUT EVENT (XDM Schema)
  window.adobeDataLayer.push({
    event: "beginCheckout",
    xdmCommerce: {
      cart: {
        totalQuantity: totalQuantity,
        totalValue: totalValue
      }
    }
  });
}

/* ---------- 5️⃣ HELPER: Fire purchase Event (THANK YOU PAGE) ---------- */
function firePurchase(order) {
  // 7️⃣ PURCHASE EVENT (XDM Schema) - Purchase Info: ID, Total Price
  window.adobeDataLayer.push({
    event: "purchase",
    xdmCommerce: {
      order: {
        orderID: order.id,                     // Purchase ID
        totalValue: order.total,               // Total Price
        currency: "INR"
      },
      products: order.items.map(item => ({
        productID: item.id,
        productName: item.title,
        category: "General",
        price: item.price,
        quantity: item.qty
      }))
    }
  });

  if (window._satellite) {
    _satellite.track("purchase");
  }
}

/* ---------- LEGACY CART DATA LAYER (kept for reference) ---------- */
function setCartDL(cart) {
  const page = document.body.dataset.page;

  const cartItems = cart.map(i => ({
    productId: i.id,
    name: i.title,
    price: i.price,
    quantity: i.qty
  }));

  const totalQuantity = cart.reduce((s, i) => s + i.qty, 0);
  const totalValue = cart.reduce((s, i) => s + i.qty * i.price, 0);

  // Legacy format (kept for tag manager reference)
  if (page === "cart") {
    window.adobeDataLayer.push({
      event: "scView",
      custData: custData,
      cart: {
        items: cartItems,
        totalQuantity: totalQuantity,
        totalValue: totalValue,
        currency: "INR"
      }
    });
  } else if (page === "checkout") {
    window.adobeDataLayer.push({
      event: "scCheckout",
      custData: custData,
      cart: {
        items: cartItems,
        totalQuantity: totalQuantity,
        totalValue: totalValue,
        currency: "INR"
      }
    });
  }
}

/* ---------- LEGACY PRODUCT CLICK (for reference) ---------- */
function fireProductClick(prodId, position) {
  const prod = PRODUCTS.find(p => p.id === prodId);
  if (!prod) return;

  // Fire link click instead (standard ACDL)
  fireLinkClicked("View Product: " + prod.title, "card", "product-tile-" + position);

  window.adobeDataLayer.push({
    event: "productClick",
    custData: custData,
    eventInfo: {
      eventName: "productClick",
      component: "plp_tile"
    },
    product: [{
      productId: prod.id,
      name: prod.title,
      price: prod.price,
      position: position,
      list: "PLP"
    }]
  });
}



































/* app.js - shared by all pages
   Single source of truth: PRODUCTS list + cart & order functions.
   Pages detect their role by body[data-page].
*/
// window.digitalData = window.digitalData || [];
const PRODUCTS = [
  { uid:'UID-001', id:'p-101', title:'Classic White Tee', price:299, img:'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', sku:'WT-001', desc:"Soft cotton t-shirt, comfortable fit. Upgrade your everyday essentials with Nobero’s premium 180 GSM T-Shirts, crafted from 100% combed cotton and treated with bio-wash and pre-shrunk technology for long-lasting comfort and durability. Designed with a classic crew neck and short sleeves, these tees are lightweight, breathable, and built for all-day wear "},

  { uid:'UID-002', id:'p-102', title:'Blue Denim Jeans', price:1499, img:'https://wrogn.com/cdn/shop/files/1_6b8140c5-6f1f-4483-9452-2c5fa2f45e09.jpg?v=1749210688', sku:'DJ-002', desc:'Slim fit denim with stretch.'},

  { uid:'UID-003', id:'p-103', title:'Running Sneakers', price:3499, img:'https://images.puma.com/image/upload/f_auto,q_auto,w_600,b_rgb:FAFAFA/global/310088/14/fnd/ZAF/fmt/png', sku:'SN-003', desc:'Lightweight running shoes.'},

  { uid:'UID-004', id:'p-104', title:'Leather Wallet', price:799, img:'https://urbanforest.co.in/cdn/shop/files/A7402041.jpg?v=1733571068', sku:'WL-004', desc:'Genuine leather, multiple slots.'},

  { uid:'UID-005', id:'p-105', title:'Smartwatch', price:8999, img:'https://gourban.in/cdn/shop/files/Pulse.jpg?v=1749553994&width=2048', sku:'SW-005', desc:'Activity tracking and notifications.'},

  { uid:'UID-006', id:'p-106', title:'Black Hoodie', price:1199, img:'https://nobero.com/cdn/shop/files/believe_in_yourself_83856a14-fcf8-49fe-b285-348391d538f6.jpg?v=1760173339', sku:'BH-006', desc:'Warm fleece hoodie with pockets.'},

  { uid:'UID-007', id:'p-107', title:'Sports Cap', price:399, img:'https://invincible.in/cdn/shop/products/InvincibleUnisexQuickDryLightWeightSportsCaps-3_2048x2048.jpg?v=1656311645', sku:'CP-007', desc:'Breathable cotton sports cap.'},

  { uid:'UID-008', id:'p-108', title:'Wireless Earbuds', price:2499, img:'https://elver.in/cdn/shop/files/Elver_Buds_X_True_Wireless_Earbuds.png?v=1755252622', sku:'EB-008', desc:'Noise-cancelling wireless earbuds.'},

  { uid:'UID-009', id:'p-109', title:'Travel Backpack', price:1999, img:'https://icon.in/cdn/shop/files/1_50b8664b-0c2b-477a-9d86-ed6fce060859.jpg?v=1756985540', sku:'BP-009', desc:'Durable backpack with spacious compartments.'},

  { uid:'UID-010', id:'p-110', title:'Analog Wrist Watch', price:1599, img:'https://images.unsplash.com/photo-1523275335684-37898b6baf30', sku:'AW-010', desc:'Stylish analog watch with leather strap.'},

  { uid:'UID-011', id:'p-111', title:'Sunglasses', price:899, img:'https://images.unsplash.com/photo-1511499767150-a48a237f0083', sku:'SG-011', desc:'UV-protected polarized sunglasses.'},

  { uid:'UID-012', id:'p-112', title:'Casual Sneakers', price:2799, img:'https://admin.mochishoes.com/product/71-264/660/71-264-16-40-1.JPG', sku:'CS-012', desc:'Comfortable sneakers for daily use.'},

  { uid:'UID-013', id:'p-113', title:'Formal Shirt', price:999, img:'https://images.meesho.com/images/products/398396769/lorj9_512.webp?width=512', sku:'FS-013', desc:'Slim-fit formal shirt for office wear.'},

  { uid:'UID-014', id:'p-114', title:'Laptop Sleeve', price:599, img:'https://www.thepostbox.in/cdn/shop/files/04_12434f64-cf19-4041-b119-f50c2bf20c8f_1800x1800.jpg?v=1736317493', sku:'LS-014', desc:'Protective sleeve for laptops up to 15 inches.'},

  { uid:'UID-015', id:'p-115', title:'Fitness Band', price:1999, img:'https://5.imimg.com/data5/SELLER/Default/2021/1/YP/LY/FV/78305368/m4-fitness-band.png', sku:'FB-015', desc:'Tracks heart rate, steps, and sleep.'},

  { uid:'UID-016', id:'p-116', title:'Perfume Spray', price:1299, img:'https://instamart-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,h_600/NI_CATALOG/IMAGES/CIW/2024/7/6/326a22c5-9bc6-4b4d-a5f4-67e445060f93_perfume_PZKFD3J0K2_MN.png', sku:'PF-016', desc:'Long-lasting refreshing fragrance.'}
];


const CART_KEY = 'mini_cart_v2';
const ORDER_KEY = 'mini_last_order_v2';

function getCart(){ try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch(e){return []} }
function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); srtCartDl(c); }
function clearCart(){ localStorage.removeItem(CART_KEY); updateCartCount(); }

function updateCartCount(){
  const c = getCart().reduce((s,i)=>s+i.qty,0);
  const els = document.querySelectorAll('#cartCount');
  els.forEach(e=>e.textContent = c);
}

/* utility to read query param from url */
function qParam(name){
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

/* PAGE: PLP */
function renderPLP(){
  const root = document.getElementById('productsGrid');
  if(!root) return;
  root.innerHTML = '';
  PRODUCTS.forEach((p, index)=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.title}">
      <h3>${p.title}</h3>
      <div class="muted">${p.sku}</div>
      <div class="price">₹${p.price.toLocaleString()}</div>
      <div style="margin-top:8px;">
        <a class="btn " href="pdp.html?id=${encodeURIComponent(p.id)}" onclick="fireProductClick('${p.id}', ${index + 1})">View</a>
        <button class="btn-ghost " onclick="quickAdd('${p.id}')">Add</button>
      </div>
    `;
    root.appendChild(card);
  });
}

function quickAdd(id){
  const prod = PRODUCTS.find(p=>p.id===id);
  if(!prod) return;

  const cart = getCart();
  const found = cart.find(i=>i.id===id);

  if(found) found.qty += 1; 
  else cart.push({id:prod.id, title:prod.title, price:prod.price, img:prod.img, qty:1});

  saveCart(cart);

  // Fire ACDL addToCart event
  fireAddToCart(prod, 1);

  alert('Added to cart');
}


/* PAGE: PDP */
function renderPDP(){
  const id = qParam('id');
  const prod = PRODUCTS.find(p=>p.id===id);
  if(!prod) {
    // fallback to products page if invalid id
    window.location = 'plp.html';
    return;
  }
  document.getElementById('pdpImage').src = prod.img;
  document.getElementById('pdpTitle').textContent = prod.title;
  document.getElementById('pdpSku').textContent = prod.sku;
  document.getElementById('pdpPrice').textContent = '₹' + prod.price.toLocaleString();
  document.getElementById('pdpDesc').textContent = prod.desc;
  const qtyInput = document.getElementById('pdpQty');

  document.getElementById('incQty').onclick = ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value||1)+1); };
  document.getElementById('decQty').onclick = ()=>{ qtyInput.value = Math.max(1, Number(qtyInput.value||1)-1); };

  document.getElementById('addToCartBtn').onclick = ()=>{
  const qty = Math.max(1, Number(qtyInput.value||1));
  const cart = getCart();
  const found = cart.find(i=>i.id===prod.id);

  if(found) found.qty += qty; 
  else cart.push({ id:prod.id, title:prod.title, price:prod.price, img:prod.img, qty });

  saveCart(cart);

  /* 🔥 ADOBE ADD TO CART EVENT */
  fireAddToCart(prod, qty);

  window.location = 'cart.html';
};

}

/* PAGE: CART */
function renderCart(){
  const root = document.getElementById('cartList');
  if(!root) return;
  const cart = getCart();
  root.innerHTML = '';
  if(cart.length===0){
    root.innerHTML = '<div class="card muted">Your cart is empty.</div>';
    document.getElementById('cartFooter').style.display = 'none';
    return;
  }
  document.getElementById('cartFooter').style.display = 'flex';
  cart.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${item.img}" style="width:80px;height:60px;object-fit:cover;border-radius:6px">
        <div>
          <strong>${item.title}</strong>
          <div class="muted">ID: ${item.id}</div>
          <div class="muted">Price: ₹${item.price}</div>
          <div class="muted">Qty: ${item.qty} × ₹${item.price} = ₹${(item.qty * item.price).toLocaleString()}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div class="qty-control">
          <button onclick="changeItemQty('${item.id}', -1)">−</button>
          <div style="padding:8px 12px">${item.qty}</div>
          <button onclick="changeItemQty('${item.id}', 1)">+</button>
        </div>
        <button class="btn-ghost" onclick="removeFromCart('${item.id}')">Remove</button>
      </div>
    `;
    root.appendChild(row);
  });
  const total = cart.reduce((s,i)=>s + i.qty * i.price,0);
  document.getElementById('cartTotal').textContent = '₹' + total.toLocaleString();
}

function changeItemQty(id, delta){
  const cart = getCart();
  const item = cart.find(i=>i.id===id);
  if(!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(cart);
  renderCart();
}
function removeFromCart(id){
  let cart = getCart();
  const itemToRemove = cart.find(i => i.id === id);
  
  // Fire removeFromCart event before removing
  if (itemToRemove) {
    fireRemoveFromCart(itemToRemove, itemToRemove.qty);
  }
  
  cart = cart.filter(i=>i.id!==id);
  saveCart(cart);
  renderCart();
}

/* cart page handlers */
document.addEventListener('DOMContentLoaded', ()=>{
  // wire clear & proceed buttons if present
  const clearBtn = document.getElementById('clearCart');
  if(clearBtn) clearBtn.onclick = ()=>{ if(confirm('Clear cart?')){ clearCart(); renderCart(); } };

  const proceedBtn = document.getElementById('proceedCheckout');
  if(proceedBtn) proceedBtn.onclick = ()=> {
    const cart = getCart();
    if(cart.length===0){ alert('Cart is empty'); return; }
    // Fire beginCheckout event
    fireBeginCheckout(cart);
    window.location = 'checkout.html';
  };
});

/* PAGE: CHECKOUT */
function handleCheckout(){
  const form = document.getElementById('checkoutForm');
  if(!form) return;
  form.onsubmit = (ev)=>{
    ev.preventDefault();
    // build order
    const cart = getCart();
    if(cart.length===0){ alert('Cart empty'); return; }
    const formData = new FormData(form);
    const order = {
      id: 'ORD-' + Date.now().toString(36) + '-' + Math.floor(Math.random()*900+100),
      date: new Date().toISOString(),
      name: formData.get('name'),
      email: formData.get('email'),
      address: formData.get('address'),
      items: cart,
      total: cart.reduce((s,i)=>s + i.price * i.qty, 0)
    };
    // store order to session so payment pages can read
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
    // go to payment method selector
    window.location = 'payment-method.html';
  };
}

/* PAGE: PAYMENT METHOD */
function wirePaymentOptions(){
  const buttons = document.querySelectorAll('.pay-option');
  buttons.forEach(b=>{
    b.onclick = ()=>{
      const method = b.dataset.method;
      // store chosen method
      const orderStr = sessionStorage.getItem(ORDER_KEY);
      if(!orderStr){ alert('No order found. Go to checkout.'); window.location='checkout.html'; return; }
      const order = JSON.parse(orderStr);
      order.method = method;
      sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
      // go to payment page. We'll pass order id in query for clarity
      window.location = `payment.html?orderid=${encodeURIComponent(order.id)}`;
    };
  });
}

/* PAGE: PAYMENT (show product image and product id) */
function renderPaymentPage(){
  const paramsOrderId = qParam('orderid');
  const order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null');
  if(!order || order.id !== paramsOrderId){ alert('Problem with order. Redirecting to checkout.'); window.location='checkout.html'; return; }
  // show first product's image and id (as requested)
  const first = order.items[0];
  const product = PRODUCTS.find(p=>p.id === first.id) || first;
  const imgWrap = document.getElementById('payThumb');
  if(imgWrap) imgWrap.innerHTML = `<img src="${product.img}" alt="${product.title}" style="width:120px;height:90px;object-fit:cover;border-radius:6px">`;
  document.getElementById('payProductId').textContent = first.id;
  document.getElementById('payAmount').textContent = '₹' + order.total.toLocaleString();
  document.getElementById('payMethod').textContent = 'Method: ' + (order.method ? order.method.toUpperCase() : '—');

  document.getElementById('confirmPay').onclick = ()=>{
    // simulate payment: go to processing + finalize
    window.location = `processing.html?orderid=${encodeURIComponent(order.id)}`;
    // actual processing: handled in processing page loader
  };
}

/* PAGE: PROCESSING (simulate then go to thankyou) */
function renderProcessing(){
  const orderid = qParam('orderid');
  const order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null');
  if(!order || order.id !== orderid){ window.location = 'checkout.html'; return; }
  // simulate a 1.5s processing then finalize
  setTimeout(()=>{
    // clear cart
    clearCart();
    // keep order id in session for thankyou display (optional)
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
    window.location = `thankyou.html?orderid=${encodeURIComponent(order.id)}`;
  }, 1500);
}

/* PAGE: THANKYOU */
function renderThankyou(){
  const orderid = qParam('orderid');
  const order = JSON.parse(sessionStorage.getItem(ORDER_KEY) || 'null');
  if(!order || order.id !== orderid){
    // still try to show id if present in param
    const el = document.getElementById('thankOrderId');
    if(el) el.textContent = orderid || '—';
    return;
  }
  const el = document.getElementById('thankOrderId');
  if(el) el.textContent = order.id;
  const summary = document.getElementById('thankSummary');
  if(summary) {
    // Display purchase ID and total price
    let itemsList = order.items.map(i => `${i.title} (ID: ${i.id}) - ₹${i.price} × ${i.qty}`).join(', ');
    summary.innerHTML = `
      <strong>Purchase ID:</strong> ${order.id}<br>
      <strong>Total Price:</strong> ₹${order.total.toLocaleString()}<br>
      <strong>Items:</strong> ${itemsList}<br>
      <strong>Email:</strong> ${order.email || 'not provided'}<br>
      A confirmation has been sent to your email.
    `;
  }

  // Fire purchase event
  firePurchase(order);

  // remove last order from session if you want persistence cleared:
  sessionStorage.removeItem(ORDER_KEY);
}

/* On load: detect page and run renderers */
(function init(){
  updateCartCount();
  firePageLoaded();  // Fire ACDL pageLoaded event first
  const page = document.body.dataset.page;
  if(page === 'plp') renderPLP();
  else if(page === 'pdp') renderPDP();
  else if(page === 'cart') renderCart();
  else if(page === 'checkout') handleCheckout();
  else if(page === 'payment-method') wirePaymentOptions();
  else if(page === 'payment') renderPaymentPage();
  else if(page === 'processing') renderProcessing();
  else if(page === 'thankyou') renderThankyou();
})();



let currentSlide = 0;
const slides = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");
const slidesContainer = document.querySelector(".slides");

if (slidesContainer) {
  function showSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    currentSlide = index;
    slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot) => dot.classList.remove("active"));
    dots[currentSlide].classList.add("active");
  }

  setInterval(() => {
    showSlide(currentSlide + 1);
  }, 4000);

  dots.forEach((dot, idx) => {
    dot.addEventListener("click", () => showSlide(idx));
  });
}





/*****************************************************************************
 * ACDL EVENT TRACKING FOR CLICKS (All pages)
 *****************************************************************************/

// Attach click listeners to ALL links and buttons
function attachClickListeners() {
  console.log('🔄 Attaching click listeners to all links and buttons...');

  try {
    // Get ALL links
    const allLinks = document.querySelectorAll('a');
    console.log(`Found ${allLinks.length} links`);
    
    allLinks.forEach((link) => {
      link.addEventListener('click', function(e) {
        const text = (this.innerText || this.textContent || this.href).trim();
        
        // Determine link type and position based on context
        let linkType = 'link';
        let linkPosition = 'page';
        
        if (this.closest('nav')) {
          linkType = 'nav';
          linkPosition = 'header';
        } else if (this.closest('.footer-col')) {
          linkType = 'footer';
          linkPosition = 'footer';
        } else if (this.closest('.card')) {
          linkType = 'product';
          linkPosition = 'product-tile';
        } else if (this.classList.contains('btn') || this.classList.contains('btn-primary')) {
          linkType = 'cta';
          linkPosition = 'button';
        }
        
        console.log(`✅ LINK CLICKED: "${text}" (${linkType} - ${linkPosition})`);
        fireLinkClicked(text, linkType, linkPosition);
        
        // Prevent navigation briefly to allow event to fire
        if (this.href && !this.href.includes('javascript:') && !this.target) {
          e.preventDefault();
          const url = this.href;
          setTimeout(() => {
            window.location.href = url;
          }, 300);
        }
      });
    });

    // Get ALL buttons
    const allButtons = document.querySelectorAll('button');
    console.log(`Found ${allButtons.length} buttons`);
    
    allButtons.forEach((btn) => {
      btn.addEventListener('click', function() {
        const text = (this.innerText || this.textContent || 'Button').trim();
        
        // Determine button position based on context
        let buttonPosition = 'page';
        
        if (this.closest('.cart-row')) {
          buttonPosition = 'cart-action';
        } else if (this.closest('form')) {
          buttonPosition = 'form-button';
        } else if (this.classList.contains('secondary')) {
          buttonPosition = 'secondary-button';
        }
        
        console.log(`✅ BUTTON CLICKED: "${text}" (${buttonPosition})`);
        fireLinkClicked(text, 'button', buttonPosition);
      });
    });

    console.log('✅ Click listeners attached successfully');
  } catch(err) {
    console.error('❌ ERROR attaching listeners:', err);
  }
}

console.log('📍 Checking document ready state:', document.readyState);

// Try to attach immediately
if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', attachClickListeners);
} else {
  console.log('✅ DOM already loaded, attaching listeners now...');
  attachClickListeners();
}

// Store linkClicked events in localStorage to persist across page loads
const CLICK_LOG_KEY = 'acdl_click_log';

function storeClickLog(event) {
  let log = JSON.parse(localStorage.getItem(CLICK_LOG_KEY) || '[]');
  log.push({
    timestamp: new Date().toISOString(),
    ...event
  });
  // Keep only last 50 events
  if (log.length > 50) log.shift();
  localStorage.setItem(CLICK_LOG_KEY, JSON.stringify(log));
}

// Hook into fireLinkClicked to also store in localStorage
const originalFireLinkClicked = fireLinkClicked;
fireLinkClicked = function(linkName, linkType, linkPosition) {
  originalFireLinkClicked.call(this, linkName, linkType, linkPosition);
  storeClickLog({
    event: 'linkClicked',
    linkName: linkName,
    linkType: linkType,
    linkPosition: linkPosition
  });
};

// TEST FUNCTION - Call this in console to manually test linkClicked
function testLinkClicked() {
  console.log('🧪 TESTING linkClicked event...');
  fireLinkClicked('Test Link', 'test', 'test-position');
  console.log('📊 adobeDataLayer after test:', window.adobeDataLayer);
}

// VIEW STORED CLICK LOGS
function viewClickLogs() {
  const logs = JSON.parse(localStorage.getItem(CLICK_LOG_KEY) || '[]');
  console.log('📝 STORED CLICK EVENTS:', logs);
  console.table(logs);
  return logs;
}

// CLEAR CLICK LOGS
function clearClickLogs() {
  localStorage.removeItem(CLICK_LOG_KEY);
  console.log('🗑️ Click logs cleared');
}

console.log('💡 Commands:');
console.log('  testLinkClicked()     - Test fire a linkClicked event');
console.log('  viewClickLogs()       - See all captured click events');
console.log('  clearClickLogs()      - Clear stored click logs');
console.log('  testClickListener()   - Test if document.addEventListener works');

// TEST: Check if event listeners work at all
function testClickListener() {
  console.log('🧪 Testing basic click listener...');
  const testDiv = document.createElement('div');
  testDiv.innerHTML = '<button style="padding: 10px; margin: 10px; background: red; color: white; cursor: pointer;">TEST CLICK ME</button>';
  document.body.appendChild(testDiv);
  
  testDiv.querySelector('button').addEventListener('click', function() {
    console.log('✅ TEST BUTTON CLICKED - Listeners are working!');
    fireLinkClicked('TEST BUTTON', 'test', 'test');
    testDiv.remove();
  });
  
  console.log('A TEST BUTTON has been added to the page. Click it to verify listeners work.');
}


document.addEventListener("DOMContentLoaded", function () {
  // Track navbar navigation
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      const linkText = this.innerText.trim();
      fireLinkClicked(linkText, 'nav', 'header');
    });
  });

  // Track CTA buttons (Shop Products, Shop Now, Enquiry)
  document.querySelectorAll('a.btn.primary, button.btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const linkText = this.innerText.trim() || this.textContent.trim();
      fireLinkClicked(linkText, 'cta', 'hero-section');
    });
  });

  // Track footer links
  const footerLinks = document.querySelectorAll('.footer-col a');
  footerLinks.forEach(link => {
    link.addEventListener('click', function() {
      const linkText = this.innerText.trim();
      fireLinkClicked(linkText, 'footer', 'footer');
    });
  });

  // Page-specific tracking
  const page = document.body.dataset.page;

  /* PDP – Product View */
  if (page === "pdp") {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    if (PRODUCTS && id) {
      const prod = PRODUCTS.find(p => p.id === id);
      if (prod) {
        // Track "Add to Cart" button
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
          addToCartBtn.addEventListener('click', function() {
            fireLinkClicked('Add to cart: ' + prod.title, 'cta', 'pdp-cta');
          });
        }
      }
    }
  }

  /* CART – Remove button click */
  if (page === "cart") {
    // Remove buttons are wired in renderCart(), so we track via fireRemoveFromCart
  }

  /* CHECKOUT – Form submission tracking */
  if (page === "checkout") {
    const form = document.getElementById('checkoutForm');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', function() {
          fireLinkClicked('Confirm Order', 'cta', 'checkout-confirm');
        });
      }
    }
  }

  /* PAYMENT METHOD – Option selection */
  if (page === "payment-method") {
    const paymentOptions = document.querySelectorAll('.pay-option');
    paymentOptions.forEach(option => {
      option.addEventListener('click', function() {
        const method = this.dataset.method || 'unknown';
        fireLinkClicked('Select Payment: ' + method, 'cta', 'payment-option');
      });
    });
  }

  /* THANK YOU PAGE – Continue Shopping */
  if (page === "thankyou") {
    const continueBtn = document.querySelector('a[href="plp.html"]');
    if (continueBtn) {
      continueBtn.addEventListener('click', function() {
        fireLinkClicked('Continue Shopping', 'cta', 'confirmation-action');
      });
    }
  }

});

/*****************************************************************************
 * FALLBACK CLICK TRACKING - Direct element listeners on common elements
 *****************************************************************************/

// Attach click listeners to ALL links and buttons
function attachClickListeners() {
  console.log('🔄 Attaching click listeners to all links and buttons...');

  try {
    // Get ALL links
    const allLinks = document.querySelectorAll('a');
    console.log(`Found ${allLinks.length} links`);
    
    allLinks.forEach((link) => {
      link.addEventListener('click', function(e) {
        const text = (this.innerText || this.textContent || this.href).trim();
        console.log(`✅ LINK CLICKED: "${text}"`);
        fireLinkClicked(text, 'link', 'page');
        
        // Prevent navigation briefly to allow event to fire
        if (this.href && !this.href.includes('javascript:') && !this.target) {
          e.preventDefault();
          const url = this.href;
          setTimeout(() => {
            window.location.href = url;
          }, 200);
        }
      });
    });

    // Get ALL buttons
    const allButtons = document.querySelectorAll('button');
    console.log(`Found ${allButtons.length} buttons`);
    
    allButtons.forEach((btn) => {
      btn.addEventListener('click', function() {
        const text = (this.innerText || this.textContent || 'Button').trim();
        console.log(`✅ BUTTON CLICKED: "${text}"`);
        fireLinkClicked(text, 'button', 'page');
      });
    });

    console.log('✅ Click listeners attached successfully');
  } catch(err) {
    console.error('❌ ERROR attaching listeners:', err);
  }
}

console.log('📍 Checking document ready state:', document.readyState);

// Try to attach immediately
if (document.readyState === 'loading') {
  console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', attachClickListeners);
} else {
  console.log('✅ DOM already loaded, attaching listeners now...');
  attachClickListeners();
}





