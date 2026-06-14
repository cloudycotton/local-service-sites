import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const PRODUCTS = [
  {
    id: "field-flask",
    name: "Field Flask 01",
    category: "Hydration",
    price: 48,
    color: "Signal orange",
    image:
      "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=86",
    note: "Double-wall steel, 24-hour cold hold, repairable cap.",
  },
  {
    id: "orbit-lamp",
    name: "Orbit Lamp 02",
    category: "Light",
    price: 72,
    color: "Cobalt blue",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=86",
    note: "Warm dimmable light, USB-C power, weather-sealed body.",
  },
  {
    id: "transit-pack",
    name: "Transit Pack 03",
    category: "Carry",
    price: 118,
    color: "Graphite",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=86",
    note: "18-liter daily carry, hidden laptop sleeve, modular straps.",
  },
];

const STARTER_REVIEWS = {
  "field-flask": [
    { id: "demo-1", author: "Demo reviewer", rating: 5, text: "Clean shape and a cap that is easy to grip." },
  ],
  "orbit-lamp": [
    { id: "demo-2", author: "Demo reviewer", rating: 4, text: "The warm low setting is the useful one." },
  ],
  "transit-pack": [
    { id: "demo-3", author: "Demo reviewer", rating: 5, text: "Compact outside, organized inside." },
  ],
};

function readStorage(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    bag: (
      <>
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    star: <path d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z" />,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function App() {
  const [cart, setCart] = useState(() =>
    readStorage(window.sessionStorage, "axis-cart", {}),
  );
  const [wishlist, setWishlist] = useState(() =>
    readStorage(window.localStorage, "axis-wishlist", []),
  );
  const [reviews, setReviews] = useState(() =>
    readStorage(window.localStorage, "axis-reviews", STARTER_REVIEWS),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    window.sessionStorage.setItem("axis-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem("axis-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    window.localStorage.setItem("axis-reviews", JSON.stringify(reviews));
  }, [reviews]);

  const cartCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const cartItems = PRODUCTS.filter((product) => cart[product.id]).map((product) => ({
    ...product,
    quantity: cart[product.id],
  }));
  const subtotal = cartItems.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );

  const productRatings = useMemo(() => {
    return Object.fromEntries(
      PRODUCTS.map((product) => {
        const productReviews = reviews[product.id] ?? [];
        const average = productReviews.length
          ? productReviews.reduce((sum, review) => sum + Number(review.rating), 0) /
            productReviews.length
          : 0;
        return [product.id, average.toFixed(1)];
      }),
    );
  }, [reviews]);

  const addToCart = (product) => {
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + 1,
    }));
    setNotice(`${product.name} added to cart.`);
  };

  const changeQuantity = (productId, change) => {
    setCart((current) => {
      const quantity = Math.max(0, (current[productId] ?? 0) + change);
      const next = { ...current };
      if (quantity === 0) delete next[productId];
      else next[productId] = quantity;
      return next;
    });
  };

  const toggleWishlist = (productId) => {
    setWishlist((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const submitReview = (event) => {
    event.preventDefault();
    const text = reviewText.trim();
    if (!reviewProduct || !text) return;
    const nextReview = {
      id: `${reviewProduct.id}-${Date.now()}`,
      author: "Local demo review",
      rating: Number(reviewRating),
      text,
    };
    setReviews((current) => ({
      ...current,
      [reviewProduct.id]: [...(current[reviewProduct.id] ?? []), nextReview],
    }));
    setReviewText("");
    setReviewRating("5");
    setNotice(`Review saved locally for ${reviewProduct.name}.`);
    setReviewProduct(null);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="grain" />
      <div className="border-b-2 border-ink bg-lime px-5 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
        Working proposal: React + Tailwind, exactly three products, local demo data
      </div>

      <header className="border-b-2 border-ink bg-paper/90 backdrop-blur">
        <div className="mx-auto grid w-full max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-5 md:px-10">
          <a href="#" className="font-display text-xl tracking-[-0.06em] no-underline md:text-2xl">
            AXIS<span className="text-signal">/</span>GOODS
          </a>
          <nav className="hidden gap-8 text-sm font-bold md:flex">
            <a href="#catalog" className="no-underline">Shop</a>
            <a href="#system" className="no-underline">System</a>
          </nav>
          <div className="flex justify-end gap-2">
            <button
              className="relative grid h-11 w-11 place-items-center border-2 border-ink bg-transparent transition hover:-translate-y-0.5 hover:bg-sky"
              type="button"
              aria-label={`${wishlist.length} saved products`}
              onClick={() => document.querySelector("#catalog")?.scrollIntoView()}
            >
              <Icon name="heart" />
              {wishlist.length > 0 && (
                <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-signal px-1 text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </button>
            <button
              className="relative flex h-11 items-center gap-2 border-2 border-ink bg-ink px-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-signal"
              type="button"
              onClick={() => setCartOpen(true)}
            >
              <Icon name="bag" />
              <span className="hidden sm:inline">Cart</span>
              <span className="font-mono text-xs">{String(cartCount).padStart(2, "0")}</span>
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto grid min-h-[670px] max-w-[1440px] overflow-hidden border-x-0 border-ink lg:grid-cols-[1.15fr_.85fr] lg:border-x-2">
          <div className="relative z-10 flex flex-col justify-between px-5 py-16 md:px-12 md:py-20 lg:px-16">
            <div className="reveal">
              <p className="mb-7 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
                Edition 001 / Daily field objects
              </p>
              <h1 className="max-w-[850px] font-display text-[clamp(64px,10vw,148px)] uppercase leading-[0.82] tracking-[-0.075em]">
                Less stuff.<br /><span className="text-signal">Better gear.</span>
              </h1>
            </div>
            <div className="reveal reveal-delay-2 mt-14 grid gap-8 border-t-2 border-ink pt-8 md:grid-cols-[1fr_auto] md:items-end">
              <p className="max-w-xl text-lg leading-relaxed md:text-xl">
                Three durable objects designed for the commute, the campsite, and every
                improvised desk in between.
              </p>
              <a
                href="#catalog"
                className="flex w-max items-center gap-4 border-2 border-ink bg-lime px-6 py-4 font-bold no-underline shadow-[7px_7px_0_#0b1f2a] transition hover:-translate-y-1 hover:shadow-[10px_10px_0_#0b1f2a]"
              >
                Explore the three <Icon name="arrow" />
              </a>
            </div>
          </div>
          <div className="reveal reveal-delay-1 relative min-h-[440px] overflow-hidden border-t-2 border-ink bg-sky lg:min-h-0 lg:border-l-2 lg:border-t-0">
            <img
              className="h-full min-h-[440px] w-full object-cover mix-blend-multiply"
              src={PRODUCTS[2].image}
              alt="Graphite transit backpack"
            />
            <div className="absolute left-5 top-5 border-2 border-ink bg-paper px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-wider">
              03 / Transit Pack
            </div>
            <div className="absolute bottom-6 right-6 grid h-28 w-28 place-items-center rounded-full border-2 border-ink bg-signal text-center font-display text-xl leading-none text-white rotate-6">
              Built<br />to move
            </div>
          </div>
        </section>

        <section id="catalog" className="border-y-2 border-ink bg-ink py-20 text-white md:py-28">
          <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10">
            <div className="mb-14 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-lime">
                  Catalogue / exactly 03
                </p>
                <h2 className="font-display text-[clamp(44px,7vw,96px)] uppercase leading-[0.88] tracking-[-0.065em]">
                  The whole line.
                </h2>
              </div>
              <p className="max-w-md text-base leading-relaxed text-white/65">
                Cart state lasts for this session. Saved items and review drafts persist
                locally in this browser.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {PRODUCTS.map((product, index) => {
                const saved = wishlist.includes(product.id);
                const reviewCount = reviews[product.id]?.length ?? 0;
                return (
                  <article
                    key={product.id}
                    className={`product-card reveal reveal-delay-${index + 1} overflow-hidden border-2 border-white/30 bg-paper text-ink`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-ink bg-sky">
                      <img
                        className="product-image h-full w-full object-cover"
                        src={product.image}
                        alt={product.name}
                      />
                      <button
                        className={`absolute right-4 top-4 grid h-11 w-11 place-items-center border-2 border-ink transition ${
                          saved ? "bg-signal text-white" : "bg-paper hover:bg-lime"
                        }`}
                        type="button"
                        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
                        onClick={() => toggleWishlist(product.id)}
                      >
                        <Icon name="heart" className={saved ? "h-5 w-5 fill-current" : "h-5 w-5"} />
                      </button>
                      <span className="absolute bottom-4 left-4 bg-ink px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-white">
                        0{index + 1} / {product.category}
                      </span>
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-5">
                        <div>
                          <h3 className="font-display text-3xl uppercase tracking-[-0.045em]">
                            {product.name}
                          </h3>
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ink/55">
                            {product.color}
                          </p>
                        </div>
                        <strong className="font-mono text-lg">${product.price}</strong>
                      </div>
                      <p className="mt-7 min-h-14 text-sm leading-relaxed text-ink/70">
                        {product.note}
                      </p>
                      <div className="mt-7 flex items-center justify-between border-y border-ink/20 py-3 text-xs">
                        <span className="flex items-center gap-2 font-bold">
                          <Icon name="star" className="h-4 w-4 fill-lime" />
                          {productRatings[product.id]}
                        </span>
                        <button
                          type="button"
                          className="font-bold underline decoration-2 underline-offset-4"
                          onClick={() => setReviewProduct(product)}
                        >
                          {reviewCount} review{reviewCount === 1 ? "" : "s"} / add yours
                        </button>
                      </div>
                      <button
                        className="mt-6 flex w-full items-center justify-center gap-3 border-2 border-ink bg-ink py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-signal"
                        type="button"
                        onClick={() => addToCart(product)}
                      >
                        Add to cart <Icon name="plus" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="system" className="mx-auto grid max-w-[1440px] border-x-0 border-ink lg:grid-cols-3 lg:border-x-2">
          {[
            ["01", "Session cart", "Quantities persist while the browser session remains open."],
            ["02", "Local wishlist", "Saved products survive refreshes without an API or account."],
            ["03", "Local reviews", "New ratings and notes are stored in this browser for the demo."],
          ].map(([number, title, copy], index) => (
            <div
              key={title}
              className={`min-h-64 border-b-2 border-ink p-8 md:p-10 ${
                index > 0 ? "lg:border-l-2" : ""
              }`}
            >
              <span className="font-mono text-xs font-semibold text-signal">{number}</span>
              <h2 className="mt-10 font-display text-3xl uppercase tracking-[-0.04em]">{title}</h2>
              <p className="mt-5 max-w-sm leading-relaxed text-ink/65">{copy}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="bg-signal px-5 py-9 text-white">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <strong className="font-display text-xl tracking-[-0.04em]">AXIS/GOODS</strong>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em]">
            Independent coded proposal / placeholder products and brand
          </p>
        </div>
      </footer>

      <div className="sr-only" aria-live="polite">{notice}</div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-ink/55" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="drawer ml-auto flex h-full w-full max-w-md flex-col bg-paper shadow-2xl"
            aria-label="Shopping cart"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-ink p-6">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-signal">
                  Session cart
                </p>
                <h2 className="font-display text-3xl uppercase tracking-[-0.05em]">
                  {cartCount} item{cartCount === 1 ? "" : "s"}
                </h2>
              </div>
              <button
                className="grid h-11 w-11 place-items-center border-2 border-ink hover:bg-sky"
                type="button"
                aria-label="Close cart"
                onClick={() => setCartOpen(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {cartItems.length === 0 ? (
                <div className="grid h-full place-items-center border-2 border-dashed border-ink/30 p-8 text-center">
                  <div>
                    <Icon name="bag" className="mx-auto h-10 w-10 text-ink/40" />
                    <p className="mt-4 font-bold">Your session cart is empty.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((product) => (
                    <div key={product.id} className="grid grid-cols-[76px_1fr] gap-4 border-b border-ink/20 pb-4">
                      <img className="h-20 w-20 border border-ink object-cover" src={product.image} alt="" />
                      <div>
                        <div className="flex justify-between gap-3">
                          <strong>{product.name}</strong>
                          <span className="font-mono text-sm">${product.price * product.quantity}</span>
                        </div>
                        <div className="mt-4 flex w-max items-center border border-ink">
                          <button
                            className="grid h-8 w-8 place-items-center hover:bg-sky"
                            type="button"
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={() => changeQuantity(product.id, -1)}
                          >
                            <Icon name="minus" className="h-4 w-4" />
                          </button>
                          <span className="grid h-8 min-w-9 place-items-center border-x border-ink font-mono text-xs">
                            {product.quantity}
                          </span>
                          <button
                            className="grid h-8 w-8 place-items-center hover:bg-lime"
                            type="button"
                            aria-label={`Increase ${product.name} quantity`}
                            onClick={() => changeQuantity(product.id, 1)}
                          >
                            <Icon name="plus" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t-2 border-ink bg-white p-6">
              <div className="flex items-end justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Demo subtotal</span>
                <strong className="font-display text-4xl">${subtotal}</strong>
              </div>
              <button
                className="mt-5 w-full border-2 border-ink bg-lime py-4 font-bold text-ink shadow-[6px_6px_0_#0b1f2a] disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                disabled={cartItems.length === 0}
                onClick={() => setNotice("Checkout is intentionally outside this front-end demo.")}
              >
                Checkout handoff
              </button>
              <p className="mt-4 text-center text-xs text-ink/55">
                Payment is intentionally excluded from this front-end concept.
              </p>
            </div>
          </aside>
        </div>
      )}

      {reviewProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/65 p-4">
          <div className="modal-card w-full max-w-xl border-2 border-ink bg-paper shadow-[10px_10px_0_#70d7ff]">
            <div className="flex items-center justify-between border-b-2 border-ink p-6">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-signal">
                  Stored in this browser
                </p>
                <h2 className="font-display text-3xl uppercase tracking-[-0.05em]">
                  Review {reviewProduct.name}
                </h2>
              </div>
              <button
                className="grid h-11 w-11 place-items-center border-2 border-ink hover:bg-sky"
                type="button"
                aria-label="Close review form"
                onClick={() => setReviewProduct(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border-b border-ink/20 p-6">
              <div className="space-y-4">
                {(reviews[reviewProduct.id] ?? []).map((review) => (
                  <div key={review.id} className="border-l-4 border-lime pl-4">
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-sm">{review.author}</strong>
                      <span className="font-mono text-xs">{review.rating}/5</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-ink/65">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <form className="grid gap-5 p-6" onSubmit={submitReview}>
              <label className="grid gap-2 text-sm font-bold">
                Rating
                <select
                  className="h-12 border-2 border-ink bg-white px-3"
                  value={reviewRating}
                  onChange={(event) => setReviewRating(event.target.value)}
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - Fine</option>
                  <option value="2">2 - Needs work</option>
                  <option value="1">1 - Poor</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Review
                <textarea
                  className="min-h-28 resize-y border-2 border-ink bg-white p-3"
                  placeholder="Write a local demo review"
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  required
                />
              </label>
              <button className="border-2 border-ink bg-signal py-4 font-bold text-white" type="submit">
                Save local review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
