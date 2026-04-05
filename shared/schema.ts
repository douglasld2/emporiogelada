import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  decimal,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("customer"),
  name: text("name"),
  phone: text("phone"),
  // Fiscal / Nota Fiscal fields
  personType: text("person_type").notNull().default("PF"), // "PF" or "PJ"
  cpf: text("cpf"),                      // Pessoa Física
  cnpj: text("cnpj"),                    // Pessoa Jurídica
  razaoSocial: text("razao_social"),     // Company name (PJ)
  inscricaoEstadual: text("inscricao_estadual"), // State registration (PJ, optional)
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  cashbackBalance: decimal("cashback_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),
  apartment: text("apartment"),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("Brasil"),
  phone: text("phone"),
  isDefault: boolean("is_default").notNull().default(false),
});

// Grupos - nível superior da hierarquia de categorias (ex: Vinhos, Tabacaria, Destilados)
export const groups = pgTable("groups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// Subgrupos (antigo collections) - categorias dentro de um grupo (ex: Vinhos Tintos, Charutos)
export const collections = pgTable("collections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  theme: text("theme").notNull(),
  featured: boolean("featured").notNull().default(false),
  isNewArrival: boolean("is_new_arrival").notNull().default(false),
  isSelection: boolean("is_selection").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  groupId: varchar("group_id").references(() => groups.id, { onDelete: "set null" }),
});

export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image").notNull(),
  images: text("images").array(),
  collectionId: varchar("collection_id")
    .notNull()
    .references(() => collections.id, { onDelete: "cascade" }),
  description: text("description"),
  sizes: text("sizes"),
  productDetails: text("product_details"),
  shippingReturns: text("shipping_returns"),
  weight: decimal("weight", { precision: 10, scale: 3 }).default("0.5"),
  height: decimal("height", { precision: 10, scale: 2 }).default("10"),
  width: decimal("width", { precision: 10, scale: 2 }).default("15"),
  length: decimal("length", { precision: 10, scale: 2 }).default("20"),
  // Campos específicos para bebidas e tabacaria
  brand: text("brand"),
  volume: text("volume"),
  alcoholContent: text("alcohol_content"),
  origin: text("origin"),
  // Kit
  isKit: boolean("is_kit").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  // Stock control (for products without size variants)
  stock: integer("stock"),
  minStock: integer("min_stock"),
  stockAlertSent: boolean("stock_alert_sent").notNull().default(false),
});

export const productSizeStock = pgTable("product_size_stock", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  stock: integer("stock").notNull().default(0),
});

// Kits - conjuntos de produtos
export const kits = pgTable("kits", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  image: text("image"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  promotionPrice: decimal("promotion_price", { precision: 10, scale: 2 }),
  promotionStartDate: timestamp("promotion_start_date"),
  promotionEndDate: timestamp("promotion_end_date"),
  isActive: boolean("is_active").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Itens do kit
export const kitItems = pgTable("kit_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  kitId: varchar("kit_id")
    .notNull()
    .references(() => kits.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  selectedSize: text("selected_size"),
  kitId: varchar("kit_id").references(() => kits.id, { onDelete: "set null" }),
});

export const orders = pgTable("orders", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderNumber: text("order_number"),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  subtotalAmount: decimal("subtotal_amount", { precision: 10, scale: 2 }),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  couponDiscountAmount: decimal("coupon_discount_amount", { precision: 10, scale: 2 }).default("0"),
  cashbackDiscountAmount: decimal("cashback_discount_amount", { precision: 10, scale: 2 }).default("0"),
  referralDiscountAmount: decimal("referral_discount_amount", { precision: 10, scale: 2 }).default("0"),
  referredDiscountAmount: decimal("referred_discount_amount", { precision: 10, scale: 2 }).default("0"),
  couponCode: text("coupon_code"),
  status: text("status").notNull().default("pending"),
  shippingName: text("shipping_name").notNull(),
  shippingEmail: text("shipping_email").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").notNull(),
  shippingPhone: text("shipping_phone"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default(
    "0",
  ),
  shippingMethod: text("shipping_method"),
  paymentMethod: text("payment_method"),
  // Fiscal / Nota Fiscal fields (stored per order)
  fiscalPersonType: text("fiscal_person_type"),   // "PF" or "PJ"
  fiscalCpf: text("fiscal_cpf"),
  fiscalCnpj: text("fiscal_cnpj"),
  fiscalRazaoSocial: text("fiscal_razao_social"),
  fiscalInscricaoEstadual: text("fiscal_inscricao_estadual"),
  trackingCode: text("tracking_code"),
  loggiKey: text("loggi_key"),
  loggiShipmentId: text("loggi_shipment_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  selectedSize: text("selected_size"),
});

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  cartItems: many(cartItems),
  orders: many(orders),
  passwordResetTokens: many(passwordResetTokens),
}));

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  }),
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  collections: many(collections),
}));

export const collectionsRelations = relations(collections, ({ many, one }) => ({
  products: many(products),
  group: one(groups, {
    fields: [collections.groupId],
    references: [groups.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  collection: one(collections, {
    fields: [products.collectionId],
    references: [collections.id],
  }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  sizeStock: many(productSizeStock),
  kitItems: many(kitItems),
}));

export const productSizeStockRelations = relations(
  productSizeStock,
  ({ one }) => ({
    product: one(products, {
      fields: [productSizeStock.productId],
      references: [products.id],
    }),
  }),
);

export const kitsRelations = relations(kits, ({ many }) => ({
  kitItems: many(kitItems),
  cartItems: many(cartItems),
}));

export const kitItemsRelations = relations(kitItems, ({ one }) => ({
  kit: one(kits, {
    fields: [kitItems.kitId],
    references: [kits.id],
  }),
  product: one(products, {
    fields: [kitItems.productId],
    references: [products.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  kit: one(kits, {
    fields: [cartItems.kitId],
    references: [kits.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const coupons = pgTable("coupons", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percentage"),
  discountValue: decimal("discount_value", {
    precision: 10,
    scale: 2,
  }).notNull(),
  minOrderAmount: decimal("min_order_amount", {
    precision: 10,
    scale: 2,
  }).default("0"),
  maxUsageCount: integer("max_usage_count"),
  currentUsageCount: integer("current_usage_count").notNull().default(0),
  appliesTo: text("applies_to").notNull().default("all"),
  productIds: text("product_ids").array(),
  collectionIds: text("collection_ids").array(),
  freeShipping: boolean("free_shipping").notNull().default(false),
  startDate: timestamp("start_date"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const storeSettings = pgTable("store_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  orderId: varchar("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id")
    .notNull()
    .references(() => supportTickets.id, { onDelete: "cascade" }),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  couponId: varchar("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  orderTotalBeforeDiscount: decimal("order_total_before_discount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const couponRedemptionsRelations = relations(
  couponRedemptions,
  ({ one }) => ({
    coupon: one(coupons, {
      fields: [couponRedemptions.couponId],
      references: [coupons.id],
    }),
    order: one(orders, {
      fields: [couponRedemptions.orderId],
      references: [orders.id],
    }),
    user: one(users, {
      fields: [couponRedemptions.userId],
      references: [users.id],
    }),
  }),
);

export const payments = pgTable("payments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  mercadoPagoId: text("mercado_pago_id"),
  preferenceId: text("preference_id"),
  status: text("status").notNull().default("pending"),
  statusDetail: text("status_detail"),
  paymentMethod: text("payment_method"),
  paymentType: text("payment_type"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BRL"),
  payerEmail: text("payer_email"),
  payerName: text("payer_name"),
  externalReference: text("external_reference"),
  pixQrCode: text("pix_qr_code"),
  pixQrCodeBase64: text("pix_qr_code_base64"),
  pendingOrderData: text("pending_order_data"),
  userId: varchar("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

// ============================================
// INSERT SCHEMAS
// ============================================

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKitSchema = createInsertSchema(kits).omit({
  id: true,
  createdAt: true,
});

export const insertKitItemSchema = createInsertSchema(kitItems).omit({
  id: true,
});

export const insertCouponSchema = createInsertSchema(coupons)
  .omit({
    id: true,
    createdAt: true,
    currentUsageCount: true,
  })
  .extend({
    startDate: z.preprocess((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === "string") {
        try {
          return new Date(val);
        } catch {
          return null;
        }
      }
      return null;
    }, z.date().nullable().optional()),

    expiresAt: z.preprocess((val) => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === "string") {
        try {
          return new Date(val);
        } catch {
          return null;
        }
      }
      return null;
    }, z.date().nullable().optional()),
  });

export const insertCouponRedemptionSchema = createInsertSchema(
  couponRedemptions,
).omit({
  id: true,
  createdAt: true,
});

export const insertProductSizeStockSchema = createInsertSchema(
  productSizeStock,
).omit({
  id: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(
  passwordResetTokens,
).omit({
  id: true,
  createdAt: true,
});

export const insertStoreSettingSchema = createInsertSchema(storeSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(
  supportTickets,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(
  supportMessages,
).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

// ============================================
// TYPES
// ============================================

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export type InsertCouponRedemption = z.infer<
  typeof insertCouponRedemptionSchema
>;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;

export type InsertProductSizeStock = z.infer<
  typeof insertProductSizeStockSchema
>;
export type ProductSizeStock = typeof productSizeStock.$inferSelect;

export type InsertPasswordResetToken = z.infer<
  typeof insertPasswordResetTokenSchema
>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertStoreSetting = z.infer<typeof insertStoreSettingSchema>;
export type StoreSetting = typeof storeSettings.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

export type InsertKit = z.infer<typeof insertKitSchema>;
export type Kit = typeof kits.$inferSelect;

export type InsertKitItem = z.infer<typeof insertKitItemSchema>;
export type KitItem = typeof kitItems.$inferSelect;

// ============================================
// CASHBACK (CRM)
// ============================================

// Regras de cashback por agrupamento (grupo, subgrupo ou produto)
export const cashbackRules = pgTable("cashback_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: text("target_type").notNull(), // 'group' | 'collection' | 'product'
  targetId: varchar("target_id").notNull(),
  targetName: text("target_name").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Transações de cashback (earned / spent)
export const cashbackTransactions = pgTable("cashback_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("order_id").references(() => orders.id, { onDelete: "set null" }),
  ruleId: varchar("rule_id"),
  type: text("type").notNull(), // 'earned' | 'spent' | 'expired' | 'adjusted'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cashbackRulesRelations = relations(cashbackRules, () => ({}));

export const cashbackTransactionsRelations = relations(cashbackTransactions, ({ one }) => ({
  user: one(users, { fields: [cashbackTransactions.userId], references: [users.id] }),
  order: one(orders, { fields: [cashbackTransactions.orderId], references: [orders.id] }),
}));

export const insertCashbackRuleSchema = createInsertSchema(cashbackRules).omit({ id: true, createdAt: true });
export const insertCashbackTransactionSchema = createInsertSchema(cashbackTransactions).omit({ id: true, createdAt: true });

export type InsertCashbackRule = z.infer<typeof insertCashbackRuleSchema>;
export type CashbackRule = typeof cashbackRules.$inferSelect;
export type InsertCashbackTransaction = z.infer<typeof insertCashbackTransactionSchema>;
export type CashbackTransaction = typeof cashbackTransactions.$inferSelect;

// ============================================
// REFERRAL SYSTEM
// ============================================
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredEmail: text("referred_email").notNull(),
  referredUserId: varchar("referred_user_id").references(() => users.id, { onDelete: "set null" }),
  qualifyingOrderId: varchar("qualifying_order_id").references(() => orders.id, { onDelete: "set null" }),
  rewardType: text("reward_type").notNull().default("percentage"),
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }).notNull().default("0"),
  minReferrerPurchase: decimal("min_referrer_purchase", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  usedOrderId: varchar("used_order_id").references(() => orders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referralCodesRelations = relations(referralCodes, ({ one }) => ({
  user: one(users, { fields: [referralCodes.userId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id] }),
  referredUser: one(users, { fields: [referrals.referredUserId], references: [users.id] }),
}));

export const insertReferralCodeSchema = createInsertSchema(referralCodes).omit({ id: true, createdAt: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export type ReferralCode = typeof referralCodes.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

// ============================================
// PROMOTIONS (centralized CRM)
// ============================================
export const promotions = pgTable("promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percentage"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  targetType: text("target_type").notNull().default("all"),
  targetId: varchar("target_id"),
  targetName: text("target_name"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type Promotion = typeof promotions.$inferSelect;
