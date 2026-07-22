/** Maps legacy flat keys to new nested JSON paths */
export const LEGACY_KEY_MAP: Record<string, string> = {
  "search.placeholder": "marketplace.searchPlaceholder",
  "search.button": "marketplace.searchButton",
  "section.featured": "marketplace.featured",
  "section.bestSellers": "marketplace.bestSellers",
  "section.topRated": "marketplace.topRated",
  "section.newArrivals": "marketplace.newArrivals",
  "card.startingAt": "marketplace.startingAt",
  "buyNow": "marketplace.buyNow",
  "deliveryTime": "marketplace.deliveryTime",
  "revisions": "marketplace.revisions",
  "viewProfile": "marketplace.viewProfile",
  "store.services": "marketplace.storeServices",
  "store.portfolio": "marketplace.storePortfolio",
  "store.reviews": "marketplace.storeReviews",
  "store.video": "marketplace.storeVideo",
  "order.escrow": "orders.escrow",
  "order.requirements": "orders.requirements",
  "order.deliver": "orders.deliver",
  "order.accept": "orders.accept",
  "order.revision": "orders.revision",
  "order.dispute": "orders.dispute",
  "marketplace.title": "marketplace.title",
  "marketplace.subtitle": "marketplace.subtitle",
};

export function resolveTranslationKey(key: string): string {
  return LEGACY_KEY_MAP[key] ?? key;
}
