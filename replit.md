# Empório Gelada - Tabacaria & Bebidas Premium E-Commerce

## Overview

Empório Gelada is a premium drinks and tobacco (tabacaria/bebidas) e-commerce platform built as a full-stack web application. The store features an immersive dark black and amber-gold visual identity, a hierarchical product categorization system (Groups → Subgroups → Products), kit/gift bundle management, 18+ age verification, promotion management at all category levels, a Cashback CRM with per-rule analytics, and a full Referral Link system.

## User Preferences

Preferred communication style: Simple, everyday language.

## Visual Identity

- **Primary Color:** `#1a1a2e` (dark navy)
- **Secondary Color:** `#c9a96e` (amber gold)
- **Accent Color:** `#8b1a1a` (bordeaux/wine)
- **Background:** `#f8f5f0` (cream) for light sections
- **Font Pairing:** Playfair Display (serif) + Montserrat (sans-serif)

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight client-side routing)
- **Styling:** Tailwind CSS v4 with custom CSS variables for theming
- **UI Components:** Radix UI primitives with shadcn/ui component library (New York style)
- **Animations:** Framer Motion for parallax effects, page transitions, and scroll-based animations
- **State Management:** React Context API for global state (Auth, Cart, Store)
- **Data Fetching:** TanStack Query (React Query) for server state management
- **Form Handling:** React Hook Form with Zod validation
- **Build Tool:** Vite with custom plugins for meta image handling and Replit integration

**Key Pages:**
- `/` - Home page with dark navy theme, group category grid, footer with contact info
- `/shop` - Product listing (all products/collections)
- `/collection/:id` - Individual collection/subgroup page
- `/product/:id` - Product detail page
- `/about` - About page (uses storeConfig.about fields)
- `/contact` - Contact page
- `/politicas` - Policies page (shipping, returns, privacy, age restriction)
- `/admin` - Admin dashboard with sidebar navigation
- `/admin/groups` - Manage Grupos (top-level categories)
- `/admin/collections` - Manage Subgrupos (sub-categories linked to groups)
- `/admin/products` - Manage products (with brand, volume, alcoholContent, origin, promotion fields)
- `/admin/kits` - Manage kits/gift bundles (product bundles)

**Store Configuration (`client/src/config/store.ts`):**
- Centralized config for all store info, contact, social, age verification, about, policies, footer, colors
- Change `name`, `shortName`, `tagline`, `description` to rebrand the store

**Age Verification:**
- `AgeVerification.tsx` component shows 18+ popup using `sessionStorage`
- Configurable via `storeConfig.ageVerification.enabled`
- Renders on every new browser session

### Backend Architecture

**Technology Stack:**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database ORM:** Drizzle ORM with PostgreSQL dialect
- **Authentication:** Passport.js with Local Strategy
- **Session Management:** Express Session with PostgreSQL session store (connect-pg-simple)
- **Password Hashing:** bcryptjs
- **Build Process:** esbuild for server bundling

**Key Routes:**
- `/api/auth/*` - Authentication endpoints (register, login, logout, verify-email, forgot-password, reset-password)
- `/api/groups/*` - Groups CRUD (top-level categories)
- `/api/collections/*` - Collections/Subgroups CRUD (with groupId, promotions)
- `/api/products/*` - Products CRUD (with brand, volume, alcoholContent, origin, promotions)
- `/api/kits/*` - Kits CRUD with kit_items
- `/api/cart/*` - Shopping cart operations
- `/api/orders/*` - Order processing and history
- `/api/coupons/*` - Coupon management

### Database Schema

**Tables:**
1. **users** - User accounts with role-based access (customer/admin), email verification, fiscal fields (personType, cpf, cnpj, razaoSocial, inscricaoEstadual, phone)
2. **password_reset_tokens** - Tokens for password recovery with expiration
3. **groups** - Top-level categories (Vinhos, Destilados, Tabacaria, etc.) with isActive, displayOrder
4. **collections** - Sub-categories linked to groups via groupId; includes isNewArrival, isSelection, featured flags
5. **products** - Individual products; includes brand, volume, alcoholContent, origin, isKit, isActive
6. **kits** - Product bundle/gift sets; includes price, promotionPrice, isActive, displayOrder (kit-level promo price kept)
7. **kit_items** - Products + quantities within each kit (kitId, productId, quantity)
8. **cart_items** - User shopping cart entries (kitId field for kit-as-single-item)
9. **orders** - Order records with shipping information
10. **order_items** - Line items for each order
11. **coupons** - Discount coupons
12. **coupon_redemptions** - Track coupon usage per user/order
13. **product_size_stock** - Stock per product variant (size/volume)
14. **addresses** - Saved shipping addresses
15. **support_tickets** + **support_messages** - Customer support system
16. **store_settings** - Key-value store for admin config
17. **payments** - Payment records

**Promotions:**
- Centralized via the `promotions` CRM table (target: whole store, group, collection, or product)
- Kit-level: `promotionPrice` field on the `kits` table for direct kit discounts
- **Kit cart behavior:** Kit goes to cart as a single item (not expanded into individual products). Kit price = sum of component products; kit promotionPrice can be lower. At checkout, server validates kit price via `resolveKitPrice()`. Shipping uses kit items for weight calculation. `addKitToCart()` in CartContext stores kitId + anchorProduct (first product in kit, for FK). Cart display shows kit name/image/badge. Both guest (localStorage) and logged-in (server) carts support kit items.
- Groups, collections, and products do NOT have inline promotion fields (removed)

### State Management

**Context Providers:**
1. **AuthContext** - User authentication state and methods (login, logout, register)
2. **CartContext** - Shopping cart state with add/remove/update operations
3. **StoreContext** (`client/src/lib/StoreContext.tsx`) - Groups, Collections, Products, Kits data with CRUD mutations

**API Hooks (`client/src/lib/api.ts`):**
- `useGroups()`, `useCreateGroup()`, `useUpdateGroup()`, `useDeleteGroup()`
- `useCollections()`, `useCreateCollection()`, `useUpdateCollection()`, `useDeleteCollection()`
- `useProducts()`, `useCreateProduct()`, `useUpdateProduct()`, `useDeleteProduct()`
- `useKits()`, `useKitWithItems()`, `useCreateKit()`, `useUpdateKit()`, `useDeleteKit()`
- `useCart()`, `useAddToCart()`, `useUpdateCartItem()`, `useRemoveFromCart()`
- `useOrders()`, `useCoupons()`, `useAddresses()`

### Image Upload & Storage

**Object Storage:**
- Uses Replit Object Storage integration
- Presigned URL upload flow: client requests URL, uploads directly
- Admin-only upload endpoint protected by authentication middleware
- Uploaded images served via `/objects/*` route

**Image Editor (`client/src/components/ImageUploader.tsx`):**
- react-easy-crop for interactive image cropping with adjustable aspect ratio
- Rotation, brightness and contrast adjustments
- `MultiImageUploader` component for multiple product images

### Authentication & Authorization

**Authorization Levels:**
- **Public:** Browse groups, collections, products; age verification popup
- **Customer:** Shopping cart, order placement, account management, support tickets
- **Admin:** Full CRUD for groups, subgroups, products, kits, coupons; dashboard analytics

**Route Guards (Frontend):**
- `AdminRoute` - Wraps admin pages; redirects to /login if unauthenticated, to / if not admin
- `AuthRoute` - Wraps account pages; redirects to /login if unauthenticated

### Email System

**Email Verification & Password Recovery:**
- Uses Nodemailer for SMTP email sending
- Handlebars templates for email formatting (server/templates/*.hbs)

**Required SMTP Environment Variables:**
- `SMTP_HOST` - SMTP server hostname (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app-specific password
- `SMTP_FROM` - From email address

## CRM Modules

### Promotions
- Admin CRUD for campaigns (percentage/fixed), targeting by group/collection/product/all
- Badges displayed on: HeroCarousel, group cards (home), subgroup cards (group), ProductCard
- `calcEffectivePrice` applied server-side in both `/api/orders` and `/api/payments/preference`
- Webhook and success-page flows use saved item prices (with promos) from `pendingOrderData`

### Cashback
- Configurable rules (global/per-group/collection/product), min purchase, max discount %
- Balance visible on customer account dashboard
- **Spending:** Validated and debited in `/api/orders` (direct), `/api/payments/preference` (MP), and both `verify-and-create-order` paths (webhook + success page)
- **Earning:** `creditCashbackForOrder` called when admin marks order 'delivered'
- Admin manual credit endpoint available

### Referral (Bidirectional)
- `/ref/:code` landing page saves referral code to localStorage
- **Referred discount:** Applied to first-time buyers; validated in both order flows
- **Referrer reward:** Earns reward when referred user completes purchase; usable as discount on next order; max 1 credit used per purchase
- `processReferralForOrder` called in all four order creation paths (direct, guest, webhook, success page)
- `useReferralReward` marks referral reward ID as used in all MP paths (webhook + pay-order success page)
- referral_code cleared from localStorage after successful purchase

### Order Discount Breakdown
- `orders` table has 5 discount columns: `discountAmount` (total), `couponDiscountAmount`, `cashbackDiscountAmount`, `referralDiscountAmount` (referrer reward), `referredDiscountAmount` (referred welcome discount)
- All four order creation paths save individual discount amounts
- Admin orders modal and customer account orders page show each discount as a separate line
- Legacy orders fall back to combined `discountAmount` display

### Coupons
- Admin CRUD: percentage/fixed, free shipping, min order, expiry, product/collection targeting
- Applied and validated server-side in: `/api/payments/preference` (MP), `/api/orders` (direct)
- `incrementCouponUsage` called in all MP-redirect paths (webhook + success page) and direct checkout
- Coupon code saved to `pendingOrderData` and on the order record

## Shipping

### Correios (PAC/SEDEX)
- Local calculation in `server/correios.ts` based on package dimensions/weight
- Shows PAC and SEDEX options at checkout

### Loggi (Express Delivery)
- Service module: `server/loggi.ts` with OAuth2 token caching
- **Endpoints:**
  - `POST /api/shipping/calculate` - Returns Loggi quotes merged with Correios (sorted by price)
  - `POST /api/admin/orders/:id/loggi-shipment` - Creates async shipment via Loggi API
  - `POST /api/admin/orders/:id/loggi-label` - Generates shipping label PDF
  - `GET /api/admin/orders/:id/loggi-tracking` - Real-time tracking status
  - `GET /api/shipping/loggi-status` - Check if Loggi is configured
- **DB columns:** `orders.loggiKey`, `orders.loggiShipmentId`
- **Required secrets:** `LOGGI_CLIENT_ID`, `LOGGI_CLIENT_SECRET`, `LOGGI_COMPANY_ID`
- **Optional env:** `LOGGI_ENV` (staging/production), `STORE_ORIGIN_ZIP` (default: 89240000)
- Gracefully disabled when credentials not set (Correios-only fallback)
- Admin orders page shows Loggi section with Create Shipment / Label / Track buttons for Loggi orders
- Checkout shows Loggi options with gold badge alongside PAC/SEDEX

## External Dependencies

### Third-Party Services

- **PostgreSQL** - Primary database (DATABASE_URL environment variable)
- **Replit Object Storage** - Image upload and serving
- **SMTP Server** - Email delivery (optional)
- **Loggi API** - Express delivery shipping (optional, `LOGGI_CLIENT_ID`/`LOGGI_CLIENT_SECRET`/`LOGGI_COMPANY_ID`)

### UI Component Libraries

- **Radix UI** - Accessible, unstyled primitives
- **Lucide React** - Icon library
- **Embla Carousel** - Touch-friendly carousel
- **Framer Motion** - Animation library
- **shadcn/ui** - Component collection

### Development Tools

- **Drizzle Kit** - Database schema push (`npm run db:push`)
- **Zod** - Runtime type validation and schema generation
- **Vite** - Frontend build tool and dev server
- **esbuild** - Fast JavaScript/TypeScript bundler for backend
- **tsx** - TypeScript execution for Node.js
