import os
import uuid
from typing import Any, Dict
from datetime import datetime

from fastapi import APIRouter, Form, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

from app.utils.storage import STORAGE_ROOT, load_list, save_list

router = APIRouter()

ROOT = os.path.dirname(STORAGE_ROOT)
STORE = os.path.join(ROOT, "uploads", "market.json")
ORDERS_STORE = os.path.join(ROOT, "uploads", "market_orders.json")
REVIEWS_STORE = os.path.join(ROOT, "uploads", "market_reviews.json")
BIDS_STORE = os.path.join(ROOT, "uploads", "market_bids.json")
WISHLIST_STORE = os.path.join(ROOT, "uploads", "market_wishlist.json")
NEGOTIATIONS_STORE = os.path.join(ROOT, "uploads", "market_negotiations.json")
CHATS_STORE = os.path.join(ROOT, "uploads", "market_chats.json")
IMAGES_DIR = os.path.join(ROOT, "uploads", "market_images")
os.makedirs(IMAGES_DIR, exist_ok=True)


class OrderCreate(BaseModel):
    item_id: str
    buyer: str
    quantity: int = 1
    payment_method: str = "cash"
    shipping_address: Optional[str] = None
    shipping_method: Optional[str] = "pickup"

class ProductListing(BaseModel):
    title: str
    price: float
    seller: str
    desc: str
    category: str
    condition: str = "used"
    quantity: int = 1
    allow_bidding: bool = False
    minimum_bid: Optional[float] = None
    tags: List[str] = []
    location: Optional[str] = None
    negotiable: bool = False

class BidRequest(BaseModel):
    item_id: str
    bidder: str
    amount: float
    message: Optional[str] = None

class ReviewRequest(BaseModel):
    item_id: str
    order_id: str
    reviewer: str
    rating: int
    comment: str
    review_type: str = "product"

class WishlistAdd(BaseModel):
    user: str
    item_id: str

class NegotiationOffer(BaseModel):
    item_id: str
    buyer: str
    offered_price: float
    message: Optional[str] = None

class ChatMessage(BaseModel):
    item_id: str
    sender: str
    receiver: str
    message: str


@router.post("/list/create")
async def create_listing(
    title: str = Form(...), 
    price: float = Form(...), 
    seller: str = Form("anonymous"), 
    desc: str = Form(""),
    category: str = Form("other"),
    condition: str = Form("used"),
    quantity: int = Form(1),
    allow_bidding: bool = Form(False),
    minimum_bid: float = Form(None),
    tags: str = Form(""),
    location: str = Form(""),
    negotiable: bool = Form(False),
    photo: UploadFile = File(None)
) -> Dict[str, Any]:
    items = load_list(STORE)
    
    photo_url = None
    if photo:
        photo_id = str(uuid.uuid4())
        ext = os.path.splitext(photo.filename or "")[1] or ".jpg"
        photo_path = os.path.join(IMAGES_DIR, f"{photo_id}{ext}")
        data = await photo.read()
        with open(photo_path, 'wb') as f:
            f.write(data)
        photo_url = f"/files/market_images/{photo_id}{ext}"
    
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    
    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "price": price,
        "seller": seller,
        "desc": desc,
        "category": category,
        "condition": condition,
        "quantity": quantity,
        "quantity_available": quantity,
        "allow_bidding": allow_bidding,
        "minimum_bid": minimum_bid if allow_bidding else None,
        "current_bid": None,
        "highest_bidder": None,
        "tags": tag_list,
        "location": location,
        "negotiable": negotiable,
        "photo": photo_url,
        "status": "available",
        "views": 0,
        "favorites": 0,
        "sold_count": 0,
        "featured": False,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    items.append(item)
    save_list(STORE, items)
    return {"ok": True, "item": item}


@router.get("/list")
async def list_market(
    category: str = None,
    condition: str = None,
    min_price: float = None,
    max_price: float = None,
    search: str = None,
    location: str = None,
    allow_bidding: bool = None,
    negotiable: bool = None,
    seller: str = None,
    sort_by: str = "recent",
    featured_only: bool = False
) -> Dict[str, Any]:
    items = load_list(STORE)
    
    # Filter by availability
    items = [i for i in items if i.get("status") == "available" and i.get("quantity_available", 0) > 0]
    
    # Apply filters
    if category:
        items = [i for i in items if i.get("category") == category]
    if condition:
        items = [i for i in items if i.get("condition") == condition]
    if min_price is not None:
        items = [i for i in items if i.get("price", 0) >= min_price]
    if max_price is not None:
        items = [i for i in items if i.get("price", 0) <= max_price]
    if location:
        items = [i for i in items if location.lower() in i.get("location", "").lower()]
    if allow_bidding is not None:
        items = [i for i in items if i.get("allow_bidding") == allow_bidding]
    if negotiable is not None:
        items = [i for i in items if i.get("negotiable") == negotiable]
    if seller:
        items = [i for i in items if i.get("seller") == seller]
    if search:
        search_lower = search.lower()
        items = [i for i in items if 
                search_lower in i.get("title", "").lower() or 
                search_lower in i.get("desc", "").lower() or
                any(search_lower in tag.lower() for tag in i.get("tags", []))]
    if featured_only:
        items = [i for i in items if i.get("featured")]
    
    # Sorting
    if sort_by == "price_low":
        items.sort(key=lambda x: x.get("price", 0))
    elif sort_by == "price_high":
        items.sort(key=lambda x: x.get("price", 0), reverse=True)
    elif sort_by == "popular":
        items.sort(key=lambda x: x.get("views", 0) + x.get("favorites", 0) * 2, reverse=True)
    elif sort_by == "recent":
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {"count": len(items), "items": items}


@router.get("/categories")
async def get_categories() -> Dict[str, Any]:
    return {
        "categories": [
            "textbooks", "notebooks", "electronics", "laptops", "tablets",
            "furniture", "clothing", "sports", "art", "music", 
            "calculators", "lab_equipment", "software", "courses", "other"
        ],
        "conditions": ["new", "like_new", "good", "fair", "used"],
        "sort_options": [
            {"value": "recent", "label": "Most Recent"},
            {"value": "popular", "label": "Most Popular"},
            {"value": "price_low", "label": "Price: Low to High"},
            {"value": "price_high", "label": "Price: High to Low"}
        ]
    }


@router.post("/bid/place")
async def place_bid(req: BidRequest) -> Dict[str, Any]:
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == req.item_id), None)
    if not item:
        return {"error": "Item not found"}
    
    if not item.get("allow_bidding"):
        return {"error": "Bidding not allowed on this item"}
    
    if item.get("status") != "available":
        return {"error": "Item not available for bidding"}
    
    minimum = item.get("minimum_bid") or item.get("price", 0)
    current = item.get("current_bid") or minimum
    
    if req.amount <= current:
        return {"error": f"Bid must be higher than current bid of ${current:.2f}"}
    
    bids = load_list(BIDS_STORE)
    bid = {
        "id": str(uuid.uuid4()),
        "item_id": req.item_id,
        "bidder": req.bidder,
        "amount": req.amount,
        "message": req.message,
        "status": "active",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    bids.append(bid)
    save_list(BIDS_STORE, bids)
    
    # Update item with highest bid
    item["current_bid"] = req.amount
    item["highest_bidder"] = req.bidder
    save_list(STORE, items)
    
    return {"ok": True, "bid": bid, "item": item}


@router.get("/bid/history/{item_id}")
async def get_bid_history(item_id: str) -> Dict[str, Any]:
    bids = load_list(BIDS_STORE)
    item_bids = [b for b in bids if b.get("item_id") == item_id]
    item_bids.sort(key=lambda x: x.get("amount", 0), reverse=True)
    return {"count": len(item_bids), "bids": item_bids}


@router.post("/bid/accept")
async def accept_bid(bid_id: str = Form(...)) -> Dict[str, Any]:
    bids = load_list(BIDS_STORE)
    bid = next((b for b in bids if b["id"] == bid_id), None)
    if not bid:
        return {"error": "Bid not found"}
    
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == bid["item_id"]), None)
    if not item:
        return {"error": "Item not found"}
    
    # Create order from accepted bid
    orders = load_list(ORDERS_STORE)
    order = {
        "id": str(uuid.uuid4()),
        "item_id": bid["item_id"],
        "item_title": item["title"],
        "seller": item["seller"],
        "buyer": bid["bidder"],
        "quantity": 1,
        "unit_price": bid["amount"],
        "total": bid["amount"],
        "status": "confirmed",
        "payment_method": "pending",
        "payment_status": "pending",
        "shipping_status": "pending",
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    orders.append(order)
    save_list(ORDERS_STORE, orders)
    
    # Mark bid as accepted
    bid["status"] = "accepted"
    save_list(BIDS_STORE, bids)
    
    # Update item
    item["quantity_available"] -= 1
    if item["quantity_available"] <= 0:
        item["status"] = "sold"
    save_list(STORE, items)
    
    return {"ok": True, "order": order}


@router.post("/order/create")
async def create_order(req: OrderCreate) -> Dict[str, Any]:
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == req.item_id), None)
    if not item:
        return {"error": "Item not found"}
    
    if item.get("status") != "available":
        return {"error": "Item not available"}
    
    available_qty = item.get("quantity_available", 0)
    if req.quantity > available_qty:
        return {"error": f"Only {available_qty} items available"}
    
    orders = load_list(ORDERS_STORE)
    total = item["price"] * req.quantity
    
    # Apply discount for bulk orders
    if req.quantity >= 5:
        total *= 0.9  # 10% discount
    
    order = {
        "id": str(uuid.uuid4()),
        "item_id": req.item_id,
        "item_title": item["title"],
        "seller": item["seller"],
        "buyer": req.buyer,
        "quantity": req.quantity,
        "unit_price": item["price"],
        "total": round(total, 2),
        "status": "confirmed",
        "payment_method": req.payment_method,
        "payment_status": "pending",
        "shipping_address": req.shipping_address,
        "shipping_method": req.shipping_method,
        "shipping_status": "pending",
        "tracking_number": None,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    orders.append(order)
    save_list(ORDERS_STORE, orders)
    
    # Update item quantity
    item["quantity_available"] -= req.quantity
    item["sold_count"] = item.get("sold_count", 0) + req.quantity
    if item["quantity_available"] <= 0:
        item["status"] = "sold"
    save_list(STORE, items)
    
    return {"ok": True, "order": order}


@router.get("/orders")
async def get_orders(user: str = None) -> Dict[str, Any]:
    orders = load_list(ORDERS_STORE)
    if user:
        orders = [o for o in orders if o.get("buyer") == user or o.get("seller") == user]
    return {"count": len(orders), "orders": orders}


@router.post("/order/complete")
async def complete_order(order_id: str = Form(...)) -> Dict[str, Any]:
    orders = load_list(ORDERS_STORE)
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        return {"error": "Order not found"}
    
    order["status"] = "completed"
    order["completed_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(ORDERS_STORE, orders)
    
    # Mark item as sold
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == order["item_id"]), None)
    if item:
        item["status"] = "sold"
        save_list(STORE, items)
    
    return {"ok": True, "order": order}


@router.post("/item/view")
async def view_item(item_id: str = Form(...)) -> Dict[str, Any]:
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return {"error": "Item not found"}
    
    item["views"] = item.get("views", 0) + 1
    save_list(STORE, items)
    return {"ok": True, "item": item}


@router.post("/review/create")
async def create_review(req: ReviewRequest) -> Dict[str, Any]:
    reviews = load_list(REVIEWS_STORE)
    
    # Check if already reviewed
    existing = next((r for r in reviews if r.get("order_id") == req.order_id and r.get("reviewer") == req.reviewer), None)
    if existing:
        return {"error": "Already reviewed this order"}
    
    review = {
        "id": str(uuid.uuid4()),
        "item_id": req.item_id,
        "order_id": req.order_id,
        "reviewer": req.reviewer,
        "rating": max(1, min(5, req.rating)),
        "comment": req.comment,
        "review_type": req.review_type,
        "helpful_count": 0,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    reviews.append(review)
    save_list(REVIEWS_STORE, reviews)
    
    # Update item average rating
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == req.item_id), None)
    if item:
        item_reviews = [r for r in reviews if r.get("item_id") == req.item_id]
        avg_rating = sum(r.get("rating", 0) for r in item_reviews) / len(item_reviews)
        item["average_rating"] = round(avg_rating, 1)
        item["review_count"] = len(item_reviews)
        save_list(STORE, items)
    
    return {"ok": True, "review": review}


@router.get("/review/list/{item_id}")
async def get_reviews(item_id: str) -> Dict[str, Any]:
    reviews = load_list(REVIEWS_STORE)
    item_reviews = [r for r in reviews if r.get("item_id") == item_id]
    item_reviews.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"count": len(item_reviews), "reviews": item_reviews}


@router.post("/wishlist/add")
async def add_to_wishlist(req: WishlistAdd) -> Dict[str, Any]:
    wishlist = load_list(WISHLIST_STORE)
    
    # Check if already in wishlist
    existing = next((w for w in wishlist if w.get("user") == req.user and w.get("item_id") == req.item_id), None)
    if existing:
        return {"error": "Already in wishlist"}
    
    entry = {
        "id": str(uuid.uuid4()),
        "user": req.user,
        "item_id": req.item_id,
        "added_at": datetime.utcnow().isoformat() + "Z"
    }
    wishlist.append(entry)
    save_list(WISHLIST_STORE, wishlist)
    
    # Update item favorites count
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == req.item_id), None)
    if item:
        item["favorites"] = item.get("favorites", 0) + 1
        save_list(STORE, items)
    
    return {"ok": True}


@router.delete("/wishlist/remove")
async def remove_from_wishlist(user: str, item_id: str) -> Dict[str, Any]:
    wishlist = load_list(WISHLIST_STORE)
    wishlist = [w for w in wishlist if not (w.get("user") == user and w.get("item_id") == item_id)]
    save_list(WISHLIST_STORE, wishlist)
    
    # Update item favorites count
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == item_id), None)
    if item:
        item["favorites"] = max(0, item.get("favorites", 0) - 1)
        save_list(STORE, items)
    
    return {"ok": True}


@router.get("/wishlist/{user}")
async def get_wishlist(user: str) -> Dict[str, Any]:
    wishlist = load_list(WISHLIST_STORE)
    user_wishlist = [w for w in wishlist if w.get("user") == user]
    
    # Get full item details
    items = load_list(STORE)
    item_ids = [w.get("item_id") for w in user_wishlist]
    wishlist_items = [i for i in items if i.get("id") in item_ids]
    
    return {"count": len(wishlist_items), "items": wishlist_items}


@router.post("/negotiate/offer")
async def make_offer(req: NegotiationOffer) -> Dict[str, Any]:
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == req.item_id), None)
    if not item:
        return {"error": "Item not found"}
    
    if not item.get("negotiable"):
        return {"error": "Item price is not negotiable"}
    
    negotiations = load_list(NEGOTIATIONS_STORE)
    offer = {
        "id": str(uuid.uuid4()),
        "item_id": req.item_id,
        "seller": item["seller"],
        "buyer": req.buyer,
        "original_price": item["price"],
        "offered_price": req.offered_price,
        "message": req.message,
        "status": "pending",
        "counter_offer": None,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    negotiations.append(offer)
    save_list(NEGOTIATIONS_STORE, negotiations)
    
    return {"ok": True, "offer": offer}


@router.post("/negotiate/respond")
async def respond_to_offer(
    offer_id: str = Form(...),
    action: str = Form(...),
    counter_price: float = Form(None)
) -> Dict[str, Any]:
    negotiations = load_list(NEGOTIATIONS_STORE)
    offer = next((n for n in negotiations if n["id"] == offer_id), None)
    if not offer:
        return {"error": "Offer not found"}
    
    if action == "accept":
        offer["status"] = "accepted"
        # Create order
        items = load_list(STORE)
        item = next((i for i in items if i["id"] == offer["item_id"]), None)
        if item:
            orders = load_list(ORDERS_STORE)
            order = {
                "id": str(uuid.uuid4()),
                "item_id": offer["item_id"],
                "item_title": item["title"],
                "seller": offer["seller"],
                "buyer": offer["buyer"],
                "quantity": 1,
                "unit_price": counter_price or offer["offered_price"],
                "total": counter_price or offer["offered_price"],
                "status": "confirmed",
                "payment_method": "pending",
                "payment_status": "pending",
                "shipping_status": "pending",
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            orders.append(order)
            save_list(ORDERS_STORE, orders)
            item["quantity_available"] -= 1
            if item["quantity_available"] <= 0:
                item["status"] = "sold"
            save_list(STORE, items)
    elif action == "counter":
        offer["status"] = "countered"
        offer["counter_offer"] = counter_price
    elif action == "reject":
        offer["status"] = "rejected"
    
    save_list(NEGOTIATIONS_STORE, negotiations)
    return {"ok": True, "offer": offer}


@router.get("/negotiate/list")
async def get_negotiations(user: str) -> Dict[str, Any]:
    negotiations = load_list(NEGOTIATIONS_STORE)
    user_negotiations = [n for n in negotiations if n.get("buyer") == user or n.get("seller") == user]
    user_negotiations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"count": len(user_negotiations), "negotiations": user_negotiations}


@router.post("/chat/send")
async def send_message(req: ChatMessage) -> Dict[str, Any]:
    chats = load_list(CHATS_STORE)
    message = {
        "id": str(uuid.uuid4()),
        "item_id": req.item_id,
        "sender": req.sender,
        "receiver": req.receiver,
        "message": req.message,
        "read": False,
        "created_at": datetime.utcnow().isoformat() + "Z"
    }
    chats.append(message)
    save_list(CHATS_STORE, chats)
    return {"ok": True, "message": message}


@router.get("/chat/conversation")
async def get_conversation(item_id: str, user1: str, user2: str) -> Dict[str, Any]:
    chats = load_list(CHATS_STORE)
    conversation = [
        c for c in chats 
        if c.get("item_id") == item_id and 
        ((c.get("sender") == user1 and c.get("receiver") == user2) or
         (c.get("sender") == user2 and c.get("receiver") == user1))
    ]
    conversation.sort(key=lambda x: x.get("created_at", ""))
    return {"count": len(conversation), "messages": conversation}


@router.get("/seller/profile/{username}")
async def get_seller_profile(username: str) -> Dict[str, Any]:
    items = load_list(STORE)
    orders = load_list(ORDERS_STORE)
    reviews = load_list(REVIEWS_STORE)
    
    # Get seller's items
    seller_items = [i for i in items if i.get("seller") == username]
    active_listings = [i for i in seller_items if i.get("status") == "available"]
    
    # Get seller's orders
    seller_orders = [o for o in orders if o.get("seller") == username]
    completed = [o for o in seller_orders if o.get("status") == "completed"]
    
    # Get seller reviews
    seller_reviews = [r for r in reviews if r.get("review_type") == "seller"]
    avg_rating = sum(r.get("rating", 0) for r in seller_reviews) / len(seller_reviews) if seller_reviews else 0
    
    # Calculate stats
    total_sales = sum(i.get("sold_count", 0) for i in seller_items)
    total_revenue = sum(o.get("total", 0) for o in completed)
    
    return {
        "username": username,
        "active_listings": len(active_listings),
        "total_sales": total_sales,
        "total_revenue": round(total_revenue, 2),
        "completed_orders": len(completed),
        "average_rating": round(avg_rating, 1),
        "review_count": len(seller_reviews),
        "join_date": seller_items[0].get("created_at") if seller_items else None,
        "items": seller_items[:10]
    }


@router.get("/analytics/platform")
async def get_platform_analytics() -> Dict[str, Any]:
    items = load_list(STORE)
    orders = load_list(ORDERS_STORE)
    reviews = load_list(REVIEWS_STORE)
    
    total_listings = len(items)
    active_listings = len([i for i in items if i.get("status") == "available"])
    total_orders = len(orders)
    completed_orders = len([o for o in orders if o.get("status") == "completed"])
    total_revenue = sum(o.get("total", 0) for o in orders if o.get("status") == "completed")
    
    # Category breakdown
    category_stats = {}
    for item in items:
        cat = item.get("category", "other")
        if cat not in category_stats:
            category_stats[cat] = {"count": 0, "total_value": 0}
        category_stats[cat]["count"] += 1
        category_stats[cat]["total_value"] += item.get("price", 0)
    
    # Top sellers
    seller_sales = {}
    for order in orders:
        if order.get("status") == "completed":
            seller = order.get("seller")
            seller_sales[seller] = seller_sales.get(seller, 0) + order.get("total", 0)
    top_sellers = sorted(seller_sales.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "total_listings": total_listings,
        "active_listings": active_listings,
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "total_revenue": round(total_revenue, 2),
        "average_order_value": round(total_revenue / completed_orders, 2) if completed_orders > 0 else 0,
        "total_reviews": len(reviews),
        "category_stats": category_stats,
        "top_sellers": [{"seller": s[0], "revenue": round(s[1], 2)} for s in top_sellers]
    }


@router.post("/order/update_shipping")
async def update_shipping(
    order_id: str = Form(...),
    tracking_number: str = Form(None),
    shipping_status: str = Form(...)
) -> Dict[str, Any]:
    orders = load_list(ORDERS_STORE)
    order = next((o for o in orders if o["id"] == order_id), None)
    if not order:
        return {"error": "Order not found"}
    
    order["shipping_status"] = shipping_status
    if tracking_number:
        order["tracking_number"] = tracking_number
    if shipping_status == "delivered":
        order["delivered_at"] = datetime.utcnow().isoformat() + "Z"
    
    save_list(ORDERS_STORE, orders)
    return {"ok": True, "order": order}


@router.post("/item/feature")
async def feature_item(item_id: str = Form(...), featured: bool = Form(True)) -> Dict[str, Any]:
    items = load_list(STORE)
    item = next((i for i in items if i["id"] == item_id), None)
    if not item:
        return {"error": "Item not found"}
    
    item["featured"] = featured
    if featured:
        item["featured_at"] = datetime.utcnow().isoformat() + "Z"
    save_list(STORE, items)
    
    return {"ok": True, "item": item}
