import { useState, useEffect } from 'react';

export default function Trade() {
  const [view, setView] = useState('browse');
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [categories, setCategories] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [sortOptions, setSortOptions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bidHistory, setBidHistory] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [username] = useState(`user_${Math.floor(Math.random() * 1000)}`);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    condition: '',
    min_price: '',
    max_price: '',
    search: '',
    location: '',
    allow_bidding: null,
    negotiable: null,
    sort_by: 'recent',
    featured_only: false
  });
  
  // Form states
  const [listingForm, setListingForm] = useState({
    title: '',
    price: '',
    desc: '',
    category: 'textbooks',
    condition: 'used',
    quantity: 1,
    allow_bidding: false,
    minimum_bid: '',
    tags: '',
    location: '',
    negotiable: false,
    photo: null
  });
  
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [orderForm, setOrderForm] = useState({
    quantity: 1,
    payment_method: 'cash',
    shipping_address: '',
    shipping_method: 'pickup'
  });
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: '',
    order_id: ''
  });
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  
  useEffect(() => {
    loadCategories();
    loadItems();
    loadWishlist();
    loadOrders();
    loadNegotiations();
  }, []);
  
  const loadCategories = async () => {
    const res = await fetch('/api/edutrade/categories');
    const data = await res.json();
    setCategories(data.categories || []);
    setConditions(data.conditions || []);
    setSortOptions(data.sort_options || []);
  };
  
  const loadItems = async () => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== '' && filters[key] !== null) {
        params.append(key, filters[key]);
      }
    });
    
    const res = await fetch(`/api/edutrade/list?${params}`);
    const data = await res.json();
    setItems(data.items || []);
  };
  
  const loadWishlist = async () => {
    const res = await fetch(`/api/edutrade/wishlist/${username}`);
    const data = await res.json();
    setWishlist(data.items || []);
  };
  
  const loadOrders = async () => {
    const res = await fetch(`/api/edutrade/orders?user=${username}`);
    const data = await res.json();
    setMyOrders(data.orders || []);
  };
  
  const loadNegotiations = async () => {
    const res = await fetch(`/api/edutrade/negotiate/list?user=${username}`);
    const data = await res.json();
    setNegotiations(data.negotiations || []);
  };
  
  const loadMyListings = async () => {
    const params = new URLSearchParams({ seller: username });
    const res = await fetch(`/api/edutrade/list?${params}`);
    const data = await res.json();
    setMyListings(data.items || []);
  };
  
  const loadAnalytics = async () => {
    const res = await fetch('/api/edutrade/analytics/platform');
    const data = await res.json();
    setAnalytics(data);
  };
  
  const viewItem = async (item) => {
    const formData = new FormData();
    formData.append('item_id', item.id);
    await fetch('/api/edutrade/item/view', { method: 'POST', body: formData });
    
    setSelectedItem(item);
    setView('detail');
    
    // Load reviews
    const res = await fetch(`/api/edutrade/review/list/${item.id}`);
    const data = await res.json();
    setReviews(data.reviews || []);
    
    // Load bid history if bidding allowed
    if (item.allow_bidding) {
      const bidRes = await fetch(`/api/edutrade/bid/history/${item.id}`);
      const bidData = await bidRes.json();
      setBidHistory(bidData.bids || []);
    }
  };
  
  const createListing = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(listingForm).forEach(key => {
      if (listingForm[key] !== null && listingForm[key] !== '') {
        formData.append(key, listingForm[key]);
      }
    });
    formData.append('seller', username);
    
    const res = await fetch('/api/edutrade/list/create', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    if (data.ok) {
      alert('Listing created successfully!');
      setView('browse');
      loadItems();
      setListingForm({
        title: '', price: '', desc: '', category: 'textbooks',
        condition: 'used', quantity: 1, allow_bidding: false,
        minimum_bid: '', tags: '', location: '', negotiable: false, photo: null
      });
    } else {
      alert(data.error || 'Failed to create listing');
    }
  };
  
  const placeBid = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/edutrade/bid/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        bidder: username,
        amount: parseFloat(bidAmount),
        message: bidMessage
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      alert('Bid placed successfully!');
      setBidAmount('');
      setBidMessage('');
      viewItem(data.item);
    } else {
      alert(data.error || 'Failed to place bid');
    }
  };
  
  const makeOffer = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/edutrade/negotiate/offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        buyer: username,
        offered_price: parseFloat(offerPrice),
        message: offerMessage
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      alert('Offer sent to seller!');
      setOfferPrice('');
      setOfferMessage('');
      loadNegotiations();
    } else {
      alert(data.error || 'Failed to send offer');
    }
  };
  
  const buyNow = async () => {
    const res = await fetch('/api/edutrade/order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        buyer: username,
        ...orderForm
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      alert(`Order placed! Total: $${data.order.total}`);
      setView('orders');
      loadOrders();
      loadItems();
    } else {
      alert(data.error || 'Failed to create order');
    }
  };
  
  const addToWishlist = async (itemId) => {
    const res = await fetch('/api/edutrade/wishlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, item_id: itemId })
    });
    
    const data = await res.json();
    if (data.ok) {
      alert('Added to wishlist!');
      loadWishlist();
    } else {
      alert(data.error || 'Already in wishlist');
    }
  };
  
  const removeFromWishlist = async (itemId) => {
    await fetch(`/api/edutrade/wishlist/remove?user=${username}&item_id=${itemId}`, {
      method: 'DELETE'
    });
    loadWishlist();
  };
  
  const submitReview = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/edutrade/review/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        order_id: reviewForm.order_id,
        reviewer: username,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        review_type: 'product'
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      alert('Review submitted!');
      setReviewForm({ rating: 5, comment: '', order_id: '' });
      viewItem(selectedItem);
    } else {
      alert(data.error || 'Failed to submit review');
    }
  };
  
  const viewSellerProfile = async (sellerName) => {
    const res = await fetch(`/api/edutrade/seller/profile/${sellerName}`);
    const data = await res.json();
    setSellerProfile(data);
    setView('seller');
  };
  
  const respondToOffer = async (offerId, action, counterPrice = null) => {
    const formData = new FormData();
    formData.append('offer_id', offerId);
    formData.append('action', action);
    if (counterPrice) formData.append('counter_price', counterPrice);
    
    const res = await fetch('/api/edutrade/negotiate/respond', {
      method: 'POST',
      body: formData
    });
    
    const data = await res.json();
    if (data.ok) {
      alert(`Offer ${action}ed!`);
      loadNegotiations();
    }
  };
  
  const sendChat = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const res = await fetch('/api/edutrade/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: selectedItem.id,
        sender: username,
        receiver: selectedItem.seller,
        message: chatMessage
      })
    });
    
    const data = await res.json();
    if (data.ok) {
      setChatMessage('');
      loadChat();
    }
  };
  
  const loadChat = async () => {
    if (!selectedItem) return;
    const res = await fetch(
      `/api/edutrade/chat/conversation?item_id=${selectedItem.id}&user1=${username}&user2=${selectedItem.seller}`
    );
    const data = await res.json();
    setChatMessages(data.messages || []);
  };
  
  const ItemCard = ({ item, showActions = true }) => {
    const inWishlist = wishlist.some(w => w.id === item.id);
    
    return (
      <div style={styles.card}>
        {item.featured && <div style={styles.featuredBadge}>⭐ Featured</div>}
        {item.photo && (
          <img src={item.photo} alt={item.title} style={styles.itemImage} />
        )}
        <div style={styles.cardContent}>
          <h3 style={styles.itemTitle}>{item.title}</h3>
          <div style={styles.itemMeta}>
            <span style={styles.badge}>{item.category}</span>
            <span style={styles.badge}>{item.condition}</span>
            {item.negotiable && <span style={styles.negotiableBadge}>💬 Negotiable</span>}
          </div>
          
          <div style={styles.priceSection}>
            <div style={styles.price}>${item.price}</div>
            {item.allow_bidding && item.current_bid && (
              <div style={styles.currentBid}>
                Current Bid: ${item.current_bid}
              </div>
            )}
          </div>
          
          <p style={styles.itemDesc}>{item.desc.substring(0, 100)}{item.desc.length > 100 ? '...' : ''}</p>
          
          <div style={styles.itemStats}>
            <span>👁️ {item.views || 0} views</span>
            <span>❤️ {item.favorites || 0}</span>
            <span>📦 {item.quantity_available || 0} left</span>
            {item.average_rating && (
              <span>⭐ {item.average_rating} ({item.review_count})</span>
            )}
          </div>
          
          {item.tags && item.tags.length > 0 && (
            <div style={styles.tags}>
              {item.tags.map((tag, i) => (
                <span key={i} style={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
          
          {showActions && (
            <div style={styles.cardActions}>
              <button onClick={() => viewItem(item)} style={styles.btnPrimary}>
                View Details
              </button>
              <button
                onClick={() => inWishlist ? removeFromWishlist(item.id) : addToWishlist(item.id)}
                style={inWishlist ? styles.btnSecondary : styles.btnOutline}
              >
                {inWishlist ? '❤️ Saved' : '🤍 Save'}
              </button>
            </div>
          )}
          
          <div style={styles.sellerInfo}>
            <small>
              Seller: <span style={styles.sellerLink} onClick={() => viewSellerProfile(item.seller)}>
                {item.seller}
              </span>
            </small>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2>🛒 EduTrade Marketplace</h2>
        <div style={styles.userInfo}>
          <span>👤 {username}</span>
        </div>
      </div>
      
      {/* Navigation */}
      <div style={styles.nav}>
        <button
          onClick={() => { setView('browse'); loadItems(); }}
          style={view === 'browse' ? styles.navBtnActive : styles.navBtn}
        >
          Browse
        </button>
        <button
          onClick={() => { setView('wishlist'); }}
          style={view === 'wishlist' ? styles.navBtnActive : styles.navBtn}
        >
          Wishlist ({wishlist.length})
        </button>
        <button
          onClick={() => { setView('orders'); loadOrders(); }}
          style={view === 'orders' ? styles.navBtnActive : styles.navBtn}
        >
          My Orders ({myOrders.length})
        </button>
        <button
          onClick={() => { setView('negotiations'); loadNegotiations(); }}
          style={view === 'negotiations' ? styles.navBtnActive : styles.navBtn}
        >
          Negotiations ({negotiations.length})
        </button>
        <button
          onClick={() => { setView('sell'); }}
          style={view === 'sell' ? styles.navBtnActive : styles.navBtn}
        >
          Sell Item
        </button>
        <button
          onClick={() => { setView('dashboard'); loadMyListings(); }}
          style={view === 'dashboard' ? styles.navBtnActive : styles.navBtn}
        >
          My Listings
        </button>
        <button
          onClick={() => { setView('analytics'); loadAnalytics(); }}
          style={view === 'analytics' ? styles.navBtnActive : styles.navBtn}
        >
          Analytics
        </button>
      </div>
      
      {/* Browse View */}
      {view === 'browse' && (
        <div>
          <div style={styles.filterSection}>
            <input
              type="text"
              placeholder="Search items..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={styles.input}
            />
            
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={styles.select}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <select
              value={filters.condition}
              onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
              style={styles.select}
            >
              <option value="">All Conditions</option>
              {conditions.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
            
            <input
              type="number"
              placeholder="Min Price"
              value={filters.min_price}
              onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
              style={styles.inputSmall}
            />
            
            <input
              type="number"
              placeholder="Max Price"
              value={filters.max_price}
              onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
              style={styles.inputSmall}
            />
            
            <select
              value={filters.sort_by}
              onChange={(e) => setFilters({ ...filters, sort_by: e.target.value })}
              style={styles.select}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={filters.featured_only}
                onChange={(e) => setFilters({ ...filters, featured_only: e.target.checked })}
              />
              Featured Only
            </label>
            
            <button onClick={loadItems} style={styles.btnPrimary}>
              Apply Filters
            </button>
          </div>
          
          <div style={styles.grid}>
            {items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          
          {items.length === 0 && (
            <div style={styles.emptyState}>
              <p>No items found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Item Detail View */}
      {view === 'detail' && selectedItem && (
        <div style={styles.detailView}>
          <button onClick={() => setView('browse')} style={styles.btnBack}>
            ← Back to Browse
          </button>
          
          <div style={styles.detailContent}>
            <div style={styles.detailLeft}>
              {selectedItem.photo && (
                <img src={selectedItem.photo} alt={selectedItem.title} style={styles.detailImage} />
              )}
              
              <h2>{selectedItem.title}</h2>
              
              <div style={styles.itemMeta}>
                <span style={styles.badge}>{selectedItem.category}</span>
                <span style={styles.badge}>{selectedItem.condition}</span>
                {selectedItem.negotiable && <span style={styles.negotiableBadge}>💬 Negotiable</span>}
                {selectedItem.allow_bidding && <span style={styles.biddingBadge}>🔨 Bidding</span>}
              </div>
              
              <p style={styles.detailDesc}>{selectedItem.desc}</p>
              
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div style={styles.tags}>
                  {selectedItem.tags.map((tag, i) => (
                    <span key={i} style={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
              
              <div style={styles.detailStats}>
                <div>👁️ {selectedItem.views || 0} views</div>
                <div>❤️ {selectedItem.favorites || 0} favorites</div>
                <div>📍 {selectedItem.location || 'Not specified'}</div>
                <div>📦 {selectedItem.quantity_available || 0} available</div>
              </div>
              
              {/* Reviews Section */}
              <div style={styles.reviewsSection}>
                <h3>Reviews ({reviews.length})</h3>
                {reviews.map(review => (
                  <div key={review.id} style={styles.reviewCard}>
                    <div style={styles.reviewHeader}>
                      <span>👤 {review.reviewer}</span>
                      <span>{'⭐'.repeat(review.rating)}</span>
                    </div>
                    <p>{review.comment}</p>
                    <small>{new Date(review.created_at).toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={styles.detailRight}>
              <div style={styles.priceCard}>
                <h3 style={styles.price}>${selectedItem.price}</h3>
                
                {selectedItem.allow_bidding && (
                  <div style={styles.biddingSection}>
                    <h4>Current Bid: ${selectedItem.current_bid || selectedItem.minimum_bid || selectedItem.price}</h4>
                    <p>Minimum Bid: ${selectedItem.minimum_bid || selectedItem.price}</p>
                    
                    {bidHistory.length > 0 && (
                      <div style={styles.bidHistory}>
                        <h5>Bid History:</h5>
                        {bidHistory.slice(0, 5).map(bid => (
                          <div key={bid.id} style={styles.bidEntry}>
                            <span>{bid.bidder}: ${bid.amount}</span>
                            <small>{new Date(bid.created_at).toLocaleString()}</small>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <form onSubmit={placeBid} style={styles.form}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Your bid amount"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        style={styles.input}
                        required
                      />
                      <textarea
                        placeholder="Optional message"
                        value={bidMessage}
                        onChange={(e) => setBidMessage(e.target.value)}
                        style={styles.textarea}
                      />
                      <button type="submit" style={styles.btnPrimary}>
                        🔨 Place Bid
                      </button>
                    </form>
                  </div>
                )}
                
                {!selectedItem.allow_bidding && (
                  <div style={styles.buySection}>
                    <div style={styles.formGroup}>
                      <label>Quantity:</label>
                      <input
                        type="number"
                        min="1"
                        max={selectedItem.quantity_available}
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) })}
                        style={styles.input}
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label>Payment Method:</label>
                      <select
                        value={orderForm.payment_method}
                        onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                        style={styles.select}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="paypal">PayPal</option>
                        <option value="venmo">Venmo</option>
                      </select>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label>Shipping Method:</label>
                      <select
                        value={orderForm.shipping_method}
                        onChange={(e) => setOrderForm({ ...orderForm, shipping_method: e.target.value })}
                        style={styles.select}
                      >
                        <option value="pickup">Pickup</option>
                        <option value="delivery">Delivery</option>
                        <option value="shipping">Shipping</option>
                      </select>
                    </div>
                    
                    {orderForm.shipping_method !== 'pickup' && (
                      <div style={styles.formGroup}>
                        <label>Shipping Address:</label>
                        <input
                          type="text"
                          value={orderForm.shipping_address}
                          onChange={(e) => setOrderForm({ ...orderForm, shipping_address: e.target.value })}
                          style={styles.input}
                        />
                      </div>
                    )}
                    
                    <div style={styles.totalSection}>
                      <strong>Total: ${(selectedItem.price * orderForm.quantity).toFixed(2)}</strong>
                      {orderForm.quantity >= 5 && (
                        <small style={styles.discount}>10% bulk discount applied!</small>
                      )}
                    </div>
                    
                    <button onClick={buyNow} style={styles.btnBuyNow}>
                      🛒 Buy Now
                    </button>
                  </div>
                )}
                
                {selectedItem.negotiable && (
                  <div style={styles.negotiationSection}>
                    <h4>Make an Offer</h4>
                    <form onSubmit={makeOffer} style={styles.form}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Your offer"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        style={styles.input}
                        required
                      />
                      <textarea
                        placeholder="Message to seller"
                        value={offerMessage}
                        onChange={(e) => setOfferMessage(e.target.value)}
                        style={styles.textarea}
                      />
                      <button type="submit" style={styles.btnSecondary}>
                        💬 Send Offer
                      </button>
                    </form>
                  </div>
                )}
                
                <button
                  onClick={() => addToWishlist(selectedItem.id)}
                  style={styles.btnOutline}
                >
                  ❤️ Add to Wishlist
                </button>
              </div>
              
              <div style={styles.sellerCard}>
                <h4>Seller Information</h4>
                <p>👤 {selectedItem.seller}</p>
                <button
                  onClick={() => viewSellerProfile(selectedItem.seller)}
                  style={styles.btnOutline}
                >
                  View Seller Profile
                </button>
                <button
                  onClick={loadChat}
                  style={styles.btnSecondary}
                >
                  💬 Message Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Wishlist View */}
      {view === 'wishlist' && (
        <div>
          <h3>My Wishlist ({wishlist.length})</h3>
          <div style={styles.grid}>
            {wishlist.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {wishlist.length === 0 && (
            <div style={styles.emptyState}>
              <p>Your wishlist is empty</p>
            </div>
          )}
        </div>
      )}
      
      {/* Orders View */}
      {view === 'orders' && (
        <div>
          <h3>My Orders ({myOrders.length})</h3>
          <div style={styles.ordersList}>
            {myOrders.map(order => (
              <div key={order.id} style={styles.orderCard}>
                <h4>{order.item_title}</h4>
                <div style={styles.orderDetails}>
                  <p>Order ID: {order.id}</p>
                  <p>Quantity: {order.quantity}</p>
                  <p>Total: ${order.total}</p>
                  <p>Status: <span style={styles.statusBadge}>{order.status}</span></p>
                  <p>Payment: {order.payment_method} ({order.payment_status})</p>
                  <p>Shipping: {order.shipping_method} ({order.shipping_status})</p>
                  {order.tracking_number && <p>Tracking: {order.tracking_number}</p>}
                  <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                
                {order.status === 'completed' && order.buyer === username && (
                  <div style={styles.reviewForm}>
                    <h5>Leave a Review</h5>
                    <form onSubmit={submitReview}>
                      <input
                        type="hidden"
                        value={order.id}
                        onChange={(e) => setReviewForm({ ...reviewForm, order_id: order.id })}
                      />
                      <select
                        value={reviewForm.rating}
                        onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                        style={styles.select}
                      >
                        {[5, 4, 3, 2, 1].map(r => (
                          <option key={r} value={r}>{'⭐'.repeat(r)}</option>
                        ))}
                      </select>
                      <textarea
                        placeholder="Your review"
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value, order_id: order.id })}
                        style={styles.textarea}
                        required
                      />
                      <button type="submit" style={styles.btnPrimary}>Submit Review</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
          {myOrders.length === 0 && (
            <div style={styles.emptyState}>
              <p>No orders yet</p>
            </div>
          )}
        </div>
      )}
      
      {/* Negotiations View */}
      {view === 'negotiations' && (
        <div>
          <h3>Price Negotiations ({negotiations.length})</h3>
          <div style={styles.negotiationsList}>
            {negotiations.map(neg => (
              <div key={neg.id} style={styles.negotiationCard}>
                <h4>Item ID: {neg.item_id}</h4>
                <p>Original Price: ${neg.original_price}</p>
                <p>Your Offer: ${neg.offered_price}</p>
                {neg.counter_offer && <p>Counter Offer: ${neg.counter_offer}</p>}
                <p>Status: <span style={styles.statusBadge}>{neg.status}</span></p>
                <p>Message: {neg.message}</p>
                
                {neg.status === 'pending' && neg.seller === username && (
                  <div style={styles.negotiationActions}>
                    <button
                      onClick={() => respondToOffer(neg.id, 'accept')}
                      style={styles.btnPrimary}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        const counter = prompt('Enter counter offer:');
                        if (counter) respondToOffer(neg.id, 'counter', parseFloat(counter));
                      }}
                      style={styles.btnSecondary}
                    >
                      Counter Offer
                    </button>
                    <button
                      onClick={() => respondToOffer(neg.id, 'reject')}
                      style={styles.btnDanger}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {negotiations.length === 0 && (
            <div style={styles.emptyState}>
              <p>No negotiations yet</p>
            </div>
          )}
        </div>
      )}
      
      {/* Sell Item View */}
      {view === 'sell' && (
        <div style={styles.sellForm}>
          <h3>List an Item for Sale</h3>
          <form onSubmit={createListing}>
            <div style={styles.formGroup}>
              <label>Title *</label>
              <input
                type="text"
                value={listingForm.title}
                onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })}
                style={styles.input}
                required
              />
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={listingForm.price}
                  onChange={(e) => setListingForm({ ...listingForm, price: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={listingForm.quantity}
                  onChange={(e) => setListingForm({ ...listingForm, quantity: parseInt(e.target.value) })}
                  style={styles.input}
                  required
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>Category *</label>
                <select
                  value={listingForm.category}
                  onChange={(e) => setListingForm({ ...listingForm, category: e.target.value })}
                  style={styles.select}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label>Condition *</label>
                <select
                  value={listingForm.condition}
                  onChange={(e) => setListingForm({ ...listingForm, condition: e.target.value })}
                  style={styles.select}
                >
                  {conditions.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={listingForm.desc}
                onChange={(e) => setListingForm({ ...listingForm, desc: e.target.value })}
                style={styles.textarea}
                rows={4}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Location</label>
              <input
                type="text"
                value={listingForm.location}
                onChange={(e) => setListingForm({ ...listingForm, location: e.target.value })}
                style={styles.input}
                placeholder="City, State"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={listingForm.tags}
                onChange={(e) => setListingForm({ ...listingForm, tags: e.target.value })}
                style={styles.input}
                placeholder="calculus, engineering, hardcover"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={listingForm.negotiable}
                  onChange={(e) => setListingForm({ ...listingForm, negotiable: e.target.checked })}
                />
                Price is negotiable
              </label>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={listingForm.allow_bidding}
                  onChange={(e) => setListingForm({ ...listingForm, allow_bidding: e.target.checked })}
                />
                Allow bidding
              </label>
            </div>
            
            {listingForm.allow_bidding && (
              <div style={styles.formGroup}>
                <label>Minimum Bid ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={listingForm.minimum_bid}
                  onChange={(e) => setListingForm({ ...listingForm, minimum_bid: e.target.value })}
                  style={styles.input}
                />
              </div>
            )}
            
            <div style={styles.formGroup}>
              <label>Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setListingForm({ ...listingForm, photo: e.target.files[0] })}
                style={styles.input}
              />
            </div>
            
            <button type="submit" style={styles.btnBuyNow}>
              📝 Create Listing
            </button>
          </form>
        </div>
      )}
      
      {/* My Listings Dashboard */}
      {view === 'dashboard' && (
        <div>
          <h3>My Listings ({myListings.length})</h3>
          <div style={styles.grid}>
            {myListings.map(item => (
              <ItemCard key={item.id} item={item} showActions={false} />
            ))}
          </div>
          {myListings.length === 0 && (
            <div style={styles.emptyState}>
              <p>You haven't listed any items yet</p>
              <button onClick={() => setView('sell')} style={styles.btnPrimary}>
                List Your First Item
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Seller Profile View */}
      {view === 'seller' && sellerProfile && (
        <div style={styles.sellerProfileView}>
          <button onClick={() => setView('browse')} style={styles.btnBack}>
            ← Back
          </button>
          
          <h2>Seller Profile: {sellerProfile.username}</h2>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3>{sellerProfile.active_listings}</h3>
              <p>Active Listings</p>
            </div>
            <div style={styles.statCard}>
              <h3>{sellerProfile.total_sales}</h3>
              <p>Total Sales</p>
            </div>
            <div style={styles.statCard}>
              <h3>${sellerProfile.total_revenue}</h3>
              <p>Revenue</p>
            </div>
            <div style={styles.statCard}>
              <h3>⭐ {sellerProfile.average_rating}</h3>
              <p>{sellerProfile.review_count} Reviews</p>
            </div>
          </div>
          
          <h3>Recent Listings</h3>
          <div style={styles.grid}>
            {sellerProfile.items && sellerProfile.items.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
      
      {/* Analytics View */}
      {view === 'analytics' && analytics && (
        <div style={styles.analyticsView}>
          <h2>Platform Analytics</h2>
          
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <h3>{analytics.total_listings}</h3>
              <p>Total Listings</p>
            </div>
            <div style={styles.statCard}>
              <h3>{analytics.active_listings}</h3>
              <p>Active Listings</p>
            </div>
            <div style={styles.statCard}>
              <h3>{analytics.total_orders}</h3>
              <p>Total Orders</p>
            </div>
            <div style={styles.statCard}>
              <h3>${analytics.total_revenue}</h3>
              <p>Total Revenue</p>
            </div>
            <div style={styles.statCard}>
              <h3>${analytics.average_order_value}</h3>
              <p>Avg Order Value</p>
            </div>
            <div style={styles.statCard}>
              <h3>{analytics.total_reviews}</h3>
              <p>Total Reviews</p>
            </div>
          </div>
          
          <h3>Top Sellers</h3>
          <div style={styles.topSellersList}>
            {analytics.top_sellers && analytics.top_sellers.map((seller, i) => (
              <div key={i} style={styles.topSellerCard}>
                <span>{i + 1}. {seller.seller}</span>
                <span>${seller.revenue}</span>
              </div>
            ))}
          </div>
          
          <h3>Category Breakdown</h3>
          <div style={styles.categoryStats}>
            {analytics.category_stats && Object.entries(analytics.category_stats).map(([cat, stats]) => (
              <div key={cat} style={styles.categoryCard}>
                <h4>{cat}</h4>
                <p>{stats.count} items</p>
                <p>${stats.total_value.toFixed(2)} value</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #eee'
  },
  userInfo: {
    fontSize: '14px',
    color: '#666'
  },
  nav: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  navBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    background: 'white',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '14px'
  },
  navBtnActive: {
    padding: '10px 20px',
    border: '1px solid #4CAF50',
    background: '#4CAF50',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  filterSection: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    padding: '15px',
    background: '#f9f9f9',
    borderRadius: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'white',
    position: 'relative',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer'
  },
  featuredBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#FFD700',
    color: '#333',
    padding: '5px 10px',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 'bold',
    zIndex: 1
  },
  itemImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover'
  },
  cardContent: {
    padding: '15px'
  },
  itemTitle: {
    fontSize: '18px',
    margin: '0 0 10px 0',
    fontWeight: 'bold'
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  badge: {
    padding: '4px 8px',
    background: '#e0e0e0',
    borderRadius: '4px',
    fontSize: '12px',
    textTransform: 'capitalize'
  },
  negotiableBadge: {
    padding: '4px 8px',
    background: '#FFF3CD',
    borderRadius: '4px',
    fontSize: '12px'
  },
  biddingBadge: {
    padding: '4px 8px',
    background: '#D1ECF1',
    borderRadius: '4px',
    fontSize: '12px'
  },
  priceSection: {
    margin: '10px 0'
  },
  price: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4CAF50',
    margin: '0'
  },
  currentBid: {
    fontSize: '14px',
    color: '#2196F3',
    marginTop: '5px'
  },
  itemDesc: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px'
  },
  itemStats: {
    display: 'flex',
    gap: '15px',
    fontSize: '13px',
    color: '#888',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  tags: {
    display: 'flex',
    gap: '5px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  tag: {
    padding: '3px 8px',
    background: '#E3F2FD',
    borderRadius: '3px',
    fontSize: '11px',
    color: '#1976D2'
  },
  cardActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  sellerInfo: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #eee'
  },
  sellerLink: {
    color: '#2196F3',
    cursor: 'pointer',
    textDecoration: 'underline'
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    flex: 1,
    minWidth: '200px'
  },
  inputSmall: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    width: '120px'
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    minWidth: '150px'
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  btnSecondary: {
    padding: '10px 20px',
    background: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnOutline: {
    padding: '10px 20px',
    background: 'white',
    color: '#4CAF50',
    border: '1px solid #4CAF50',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnBuyNow: {
    padding: '15px',
    background: '#FF5722',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    width: '100%'
  },
  btnDanger: {
    padding: '10px 20px',
    background: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  btnBack: {
    padding: '8px 16px',
    background: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  },
  detailView: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  detailContent: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '30px'
  },
  detailLeft: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  detailRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  detailImage: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'contain',
    marginBottom: '20px',
    borderRadius: '8px'
  },
  detailDesc: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#333',
    marginBottom: '20px'
  },
  detailStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    padding: '15px',
    background: '#f9f9f9',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  priceCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    position: 'sticky',
    top: '20px'
  },
  biddingSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee'
  },
  bidHistory: {
    marginTop: '15px',
    padding: '10px',
    background: '#f9f9f9',
    borderRadius: '5px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  bidEntry: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px solid #eee',
    fontSize: '13px'
  },
  buySection: {
    marginTop: '20px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  totalSection: {
    padding: '15px',
    background: '#f9f9f9',
    borderRadius: '5px',
    marginBottom: '15px',
    textAlign: 'center'
  },
  discount: {
    display: 'block',
    color: '#4CAF50',
    marginTop: '5px'
  },
  negotiationSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee'
  },
  sellerCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '15px'
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px'
  },
  reviewsSection: {
    marginTop: '30px',
    paddingTop: '30px',
    borderTop: '2px solid #eee'
  },
  reviewCard: {
    background: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px'
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  orderCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  orderDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginTop: '15px'
  },
  statusBadge: {
    padding: '4px 8px',
    background: '#4CAF50',
    color: 'white',
    borderRadius: '4px',
    fontSize: '12px',
    textTransform: 'uppercase'
  },
  reviewForm: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee'
  },
  negotiationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  negotiationCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  negotiationActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  sellForm: {
    maxWidth: '800px',
    margin: '0 auto',
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px'
  },
  sellerProfileView: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    textAlign: 'center'
  },
  analyticsView: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  topSellersList: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    marginBottom: '30px'
  },
  topSellerCard: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid #eee'
  },
  categoryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  },
  categoryCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ddd'
  }
};
