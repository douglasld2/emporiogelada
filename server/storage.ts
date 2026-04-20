import { 
  users, groups, collections, products, cartItems, orders, orderItems, addresses, payments, coupons, couponRedemptions, productSizeStock, passwordResetTokens, storeSettings, supportTickets, supportMessages, kits, kitItems, promotions, cashbackRules, cashbackTransactions, referralCodes, referrals,
  type User, type InsertUser,
  type Group, type InsertGroup,
  type Collection, type InsertCollection,
  type Product, type InsertProduct,
  type CartItem, type InsertCartItem,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Address, type InsertAddress,
  type Payment, type InsertPayment,
  type Coupon, type InsertCoupon,
  type CouponRedemption, type InsertCouponRedemption,
  type ProductSizeStock, type InsertProductSizeStock,
  type PasswordResetToken, type InsertPasswordResetToken,
  type StoreSetting,
  type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage,
  type Kit, type InsertKit,
  type KitItem, type InsertKitItem,
  type Promotion, type InsertPromotion,
  type CashbackRule, type InsertCashbackRule,
  type CashbackTransaction, type InsertCashbackTransaction,
  type ReferralCode, type Referral,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, gte, lte, count, sum, inArray, isNotNull, isNull } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getUserAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string): Promise<boolean>;
  setDefaultAddress(userId: string, addressId: string): Promise<void>;
  
  getAllGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: string): Promise<boolean>;

  getAllCollections(): Promise<Collection[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;
  
  getAllProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProductsByCollection(collectionId: string, onlyActive?: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;
  
  getCartItems(userId: string): Promise<(CartItem & { product: Product; kit?: any })[]>;
  getCartItem(id: string): Promise<CartItem | undefined>;
  addCartItem(cartItem: InsertCartItem): Promise<CartItem>;
  updateCartItemQuantity(id: string, userId: string, quantity: number): Promise<CartItem | undefined>;
  removeCartItem(id: string, userId: string): Promise<boolean>;
  clearCart(userId: string): Promise<void>;
  
  getUserOrders(userId: string, userEmail?: string): Promise<Order[]>;
  linkGuestOrdersToUser(email: string, userId: string): Promise<void>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  createGuestOrder(order: Omit<InsertOrder, 'userId'>, items: InsertOrderItem[]): Promise<Order>;
  updateOrderStatus(id: string, status: string, trackingCode?: string): Promise<Order | undefined>;
  updateOrderLoggiInfo(id: string, loggiKey: string, loggiShipmentId: string, trackingCode?: string): Promise<Order | undefined>;
  updateOrderMelhorEnvio(id: string, data: {
    cartId?: string | null;
    serviceId?: number | null;
    status?: string | null;
    protocol?: string | null;
    labelUrl?: string | null;
    trackingCode?: string;
  }): Promise<Order | undefined>;
  getUserOrderStats(userId: string): Promise<{ total: number; shipped: number; delivered: number }>;
  
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentByPreferenceId(preferenceId: string): Promise<Payment | undefined>;
  getPaymentByMercadoPagoId(mercadoPagoId: string): Promise<Payment | undefined>;
  getPaymentByExternalReference(externalReference: string): Promise<Payment | undefined>;
  updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment | undefined>;
  getAllPayments(filters?: { status?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<Payment[]>;
  getUserPayments(payerEmail: string): Promise<Payment[]>;
  getPaymentStats(): Promise<{ total: number; approved: number; pending: number; rejected: number; totalAmount: number; approvedAmount: number }>;
  getAllOrders(): Promise<Order[]>;
  getOrderWithItems(orderId: string): Promise<{ order: Order; items: OrderItem[] } | undefined>;
  getAdminDashboardStats(): Promise<{
    totalSales: number;
    totalOrders: number;
    totalCustomers: number;
    recentOrders: Order[];
  }>;
  
  getAllCoupons(): Promise<Coupon[]>;
  getCoupon(id: string): Promise<Coupon | undefined>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<boolean>;
  incrementCouponUsage(id: string): Promise<void>;
  
  createCouponRedemption(redemption: InsertCouponRedemption): Promise<CouponRedemption>;
  getCouponRedemptions(couponId: string): Promise<CouponRedemption[]>;
  getCouponStats(couponId: string): Promise<{ totalRedemptions: number; totalOrderValue: number; totalDiscount: number }>;
  getAllCouponStats(): Promise<{ couponId: string; code: string; totalRedemptions: number; totalOrderValue: number; totalDiscount: number }[]>;
  
  getProductSizeStock(productId: string): Promise<ProductSizeStock[]>;
  getSizeStock(productId: string, size: string): Promise<ProductSizeStock | undefined>;
  setSizeStock(productId: string, size: string, stock: number): Promise<ProductSizeStock>;
  decrementSizeStock(items: Array<{ productId: string; size: string; quantity: number }>): Promise<boolean>;
  decrementSimpleProductStock(productId: string, quantity: number): Promise<boolean>;
  getOutOfStockCount(): Promise<number>;
  getLowStockProducts(): Promise<{ id: string; name: string; stock: number; minStock: number; stockAlertSent: boolean }[]>;
  markStockAlertSent(productId: string): Promise<void>;
  resetStockAlertSent(productId: string): Promise<void>;
  
  updateUserProfile(userId: string, data: { name?: string | null; phone?: string | null; personType?: string; cpf?: string | null; cnpj?: string | null; razaoSocial?: string | null; inscricaoEstadual?: string | null }): Promise<User | undefined>;
  updateUserEmailVerification(userId: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  
  getStoreSetting(key: string): Promise<string | undefined>;
  setStoreSetting(key: string, value: string, description?: string): Promise<void>;
  getAllStoreSettings(): Promise<{ key: string; value: string; description: string | null }[]>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  
  getAdminUsers(): Promise<User[]>;
  
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  getCustomerSupportTickets(email: string): Promise<SupportTicket[]>;
  getAllSupportTickets(filters?: { status?: string; priority?: string }): Promise<SupportTicket[]>;
  updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  closeSupportTicket(id: string): Promise<SupportTicket | undefined>;
  
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getTicketMessages(ticketId: string): Promise<SupportMessage[]>;
  markMessagesAsRead(ticketId: string, senderType: string): Promise<void>;
  getUnreadMessageCount(ticketId: string, senderType: string): Promise<number>;

  getAllKits(): Promise<Kit[]>;
  getAllKitsWithItems(): Promise<{ kit: Kit; items: (KitItem & { product: Product })[] }[]>;
  getKit(id: string): Promise<Kit | undefined>;
  getKitWithItems(id: string): Promise<{ kit: Kit; items: (KitItem & { product: Product })[] } | undefined>;
  createKit(kit: InsertKit, items: InsertKitItem[]): Promise<Kit>;
  updateKit(id: string, kit: Partial<InsertKit>, items?: InsertKitItem[]): Promise<Kit | undefined>;
  deleteKit(id: string): Promise<boolean>;

  // Cashback
  getAllCashbackRules(): Promise<CashbackRule[]>;
  getCashbackRule(id: string): Promise<CashbackRule | undefined>;
  getCashbackRuleByTarget(targetType: string, targetId: string): Promise<CashbackRule | undefined>;
  createCashbackRule(rule: InsertCashbackRule): Promise<CashbackRule>;
  updateCashbackRule(id: string, rule: Partial<InsertCashbackRule>): Promise<CashbackRule | undefined>;
  deleteCashbackRule(id: string): Promise<boolean>;
  getApplicableCashbackPercentage(productId: string, collectionId: string, groupId: string | null): Promise<number>;
  getUserCashbackTransactions(userId: string): Promise<CashbackTransaction[]>;
  addCashbackTransaction(tx: InsertCashbackTransaction): Promise<CashbackTransaction>;
  creditCashbackForOrder(orderId: string, userId: string): Promise<void>;
  reverseCashbackForOrder(orderId: string, userId: string): Promise<void>;
  applyCashbackToOrder(userId: string, amount: number): Promise<boolean>;
  updateUserCashbackBalance(userId: string, delta: number): Promise<User | undefined>;
  getCashbackDashboard(): Promise<{
    totalEarned: number;
    totalSpent: number;
    circulatingBalance: number;
    usersWithBalance: number;
    transactionCount: number;
    perRule: Array<{ ruleId: string; targetName: string; targetType: string; percentage: string; isActive: boolean; totalEarned: number; transactionCount: number; lastUsed: string | null }>;
  }>;

  // Referral
  getOrCreateReferralCode(userId: string): Promise<ReferralCode>;
  getReferralCodeByCode(code: string): Promise<ReferralCode | undefined>;
  getReferralsByReferrer(referrerId: string): Promise<Referral[]>;
  getAvailableReferralReward(referrerId: string): Promise<Referral | undefined>;
  countAvailableReferralRewards(referrerId: string): Promise<number>;
  processReferralForOrder(orderId: string, referralCode: string, buyerEmail: string, buyerUserId: string | null, orderTotal: number): Promise<void>;
  useReferralReward(referralId: string, orderId: string): Promise<void>;
  getAllReferrals(limit?: number): Promise<Array<Referral & { referrerName?: string; referrerEmail?: string }>>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const userAddresses = await this.getUserAddresses(address.userId);
    const isFirstAddress = userAddresses.length === 0;
    
    const [newAddress] = await db
      .insert(addresses)
      .values({ ...address, isDefault: isFirstAddress || address.isDefault })
      .returning();
    return newAddress;
  }

  async updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined> {
    const [updated] = await db
      .update(addresses)
      .set(address)
      .where(eq(addresses.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAddress(id: string): Promise<boolean> {
    const result = await db.delete(addresses).where(eq(addresses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
      await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, addressId));
    });
  }

  async getAllGroups(): Promise<Group[]> {
    return await db.select().from(groups).orderBy(groups.displayOrder);
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async updateGroup(id: string, group: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updated] = await db.update(groups).set(group).where(eq(groups.id, id)).returning();
    return updated || undefined;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await db.delete(groups).where(eq(groups.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllCollections(): Promise<Collection[]> {
    return await db.select().from(collections);
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection || undefined;
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [newCollection] = await db
      .insert(collections)
      .values(collection)
      .returning();
    return newCollection;
  }

  async updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db
      .update(collections)
      .set(collection)
      .where(eq(collections.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const result = await db.delete(collections).where(eq(collections.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async getActiveProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProductsByCollection(collectionId: string, onlyActive = false): Promise<Product[]> {
    if (onlyActive) {
      return await db.select().from(products).where(
        and(eq(products.collectionId, collectionId), eq(products.isActive, true))
      );
    }
    return await db.select().from(products).where(eq(products.collectionId, collectionId));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCartItems(userId: string): Promise<(CartItem & { product: Product; kit?: any })[]> {
    const items = await db
      .select({
        id: cartItems.id,
        userId: cartItems.userId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        selectedSize: cartItems.selectedSize,
        kitId: cartItems.kitId,
        product: products,
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
    
    const result: (CartItem & { product: Product; kit?: any })[] = [];
    for (const item of items) {
      if (!item.product) continue;
      const entry: any = { ...item };
      if (item.kitId) {
        const [kit] = await db.select().from(kits).where(eq(kits.id, item.kitId));
        if (kit) {
          entry.kit = kit;
        }
      }
      result.push(entry);
    }
    return result;
  }

  async addCartItem(cartItem: InsertCartItem): Promise<CartItem> {
    const conditions = [
      eq(cartItems.userId, cartItem.userId),
      eq(cartItems.productId, cartItem.productId),
    ];
    
    if (cartItem.kitId) {
      conditions.push(eq(cartItems.kitId, cartItem.kitId));
    } else {
      conditions.push(sql`${cartItems.kitId} IS NULL`);
      if (cartItem.selectedSize) {
        conditions.push(eq(cartItems.selectedSize, cartItem.selectedSize));
      } else {
        conditions.push(sql`${cartItems.selectedSize} IS NULL`);
      }
    }
    
    const existing = await db
      .select()
      .from(cartItems)
      .where(and(...conditions));

    if (existing.length > 0) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existing[0].quantity + (cartItem.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }

    const [newItem] = await db
      .insert(cartItems)
      .values(cartItem)
      .returning();
    return newItem;
  }

  async getCartItem(id: string): Promise<CartItem | undefined> {
    const [item] = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return item || undefined;
  }

  async updateCartItemQuantity(id: string, userId: string, quantity: number): Promise<CartItem | undefined> {
    const clampedQuantity = Math.min(Math.max(1, quantity), 99);
    const [updated] = await db
      .update(cartItems)
      .set({ quantity: clampedQuantity })
      .where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async removeCartItem(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  async getUserOrders(userId: string, userEmail?: string): Promise<Order[]> {
    // Get orders by userId OR by email (for orders created before userId was saved)
    if (userEmail) {
      return await db
        .select()
        .from(orders)
        .where(or(eq(orders.userId, userId), eq(orders.shippingEmail, userEmail)))
        .orderBy(desc(orders.createdAt));
    }
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async linkGuestOrdersToUser(email: string, userId: string): Promise<void> {
    // Find guest orders by email and assign userId
    await db.update(orders)
      .set({ userId })
      .where(and(eq(orders.shippingEmail, email), isNull(orders.userId)));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async getUserOrderStats(userId: string): Promise<{ total: number; shipped: number; delivered: number }> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId));
    return {
      total: userOrders.length,
      shipped: userOrders.filter(o => o.status === 'shipped' || o.status === 'processing').length,
      delivered: userOrders.filter(o => o.status === 'delivered').length,
    };
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values(order)
        .returning();

      const itemsWithOrderId = items.map(item => ({
        ...item,
        orderId: createdOrder.id,
      }));

      await tx.insert(orderItems).values(itemsWithOrderId);

      for (const item of items) {
        if (item.selectedSize) {
          const [stockRecord] = await tx.select().from(productSizeStock)
            .where(and(
              eq(productSizeStock.productId, item.productId),
              eq(productSizeStock.size, item.selectedSize)
            ));
          if (stockRecord) {
            if (stockRecord.stock < item.quantity) {
              throw new Error(`Estoque insuficiente para o tamanho ${item.selectedSize}`);
            }
            await tx.update(productSizeStock)
              .set({ stock: stockRecord.stock - item.quantity })
              .where(eq(productSizeStock.id, stockRecord.id));
          }
        }
      }

      return [createdOrder];
    });

    return newOrder;
  }

  async createGuestOrder(order: Omit<InsertOrder, 'userId'>, items: InsertOrderItem[]): Promise<Order> {
    const [newOrder] = await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(orders)
        .values({ ...order, userId: null })
        .returning();

      const itemsWithOrderId = items.map(item => ({
        ...item,
        orderId: createdOrder.id,
      }));

      await tx.insert(orderItems).values(itemsWithOrderId);

      for (const item of items) {
        if (item.selectedSize) {
          const [stockRecord] = await tx.select().from(productSizeStock)
            .where(and(
              eq(productSizeStock.productId, item.productId),
              eq(productSizeStock.size, item.selectedSize)
            ));
          if (stockRecord) {
            if (stockRecord.stock < item.quantity) {
              throw new Error(`Estoque insuficiente para o tamanho ${item.selectedSize}`);
            }
            await tx.update(productSizeStock)
              .set({ stock: stockRecord.stock - item.quantity })
              .where(eq(productSizeStock.id, stockRecord.id));
          }
        }
      }

      return [createdOrder];
    });

    return newOrder;
  }

  async updateOrderStatus(id: string, status: string, trackingCode?: string): Promise<Order | undefined> {
    const updateData: { status: string; trackingCode?: string } = { status };
    if (trackingCode !== undefined) {
      updateData.trackingCode = trackingCode;
    }
    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async updateOrderLoggiInfo(id: string, loggiKey: string, loggiShipmentId: string, trackingCode?: string): Promise<Order | undefined> {
    const updateData: any = { loggiKey, loggiShipmentId };
    if (trackingCode) {
      updateData.trackingCode = trackingCode;
    }
    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async updateOrderMelhorEnvio(id: string, data: {
    cartId?: string | null;
    serviceId?: number | null;
    status?: string | null;
    protocol?: string | null;
    labelUrl?: string | null;
    trackingCode?: string;
  }): Promise<Order | undefined> {
    const updateData: any = {};
    if (data.cartId !== undefined) updateData.melhorEnvioCartId = data.cartId;
    if (data.serviceId !== undefined) updateData.melhorEnvioServiceId = data.serviceId;
    if (data.status !== undefined) updateData.melhorEnvioStatus = data.status;
    if (data.protocol !== undefined) updateData.melhorEnvioProtocol = data.protocol;
    if (data.labelUrl !== undefined) updateData.melhorEnvioLabelUrl = data.labelUrl;
    if (data.trackingCode !== undefined) updateData.trackingCode = data.trackingCode;
    if (Object.keys(updateData).length === 0) {
      return await this.getOrder(id);
    }
    const [updated] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentByPreferenceId(preferenceId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.preferenceId, preferenceId));
    return payment || undefined;
  }

  async getPaymentByMercadoPagoId(mercadoPagoId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.mercadoPagoId, mercadoPagoId));
    return payment || undefined;
  }

  async getPaymentByExternalReference(externalReference: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.externalReference, externalReference));
    return payment || undefined;
  }

  async updatePayment(id: string, data: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPayments(filters?: { status?: string; startDate?: Date; endDate?: Date; limit?: number; offset?: number }): Promise<Payment[]> {
    let query = db.select().from(payments);
    const conditions: any[] = [];
    
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(payments.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(payments.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = await query.orderBy(desc(payments.createdAt)).limit(filters?.limit || 100).offset(filters?.offset || 0);
    return result;
  }

  async getUserPayments(payerEmail: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.payerEmail, payerEmail)).orderBy(desc(payments.createdAt));
  }

  async getPaymentStats(): Promise<{ total: number; approved: number; pending: number; rejected: number; totalAmount: number; approvedAmount: number }> {
    const allPayments = await db.select().from(payments);
    
    const approved = allPayments.filter(p => p.status === 'approved');
    const pending = allPayments.filter(p => p.status === 'pending' || p.status === 'in_process');
    const rejected = allPayments.filter(p => p.status === 'rejected' || p.status === 'cancelled');
    
    const totalAmount = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const approvedAmount = approved.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    
    return {
      total: allPayments.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      totalAmount,
      approvedAmount,
    };
  }

  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrderWithItems(orderId: string): Promise<{ order: Order; items: OrderItem[] } | undefined> {
    const order = await this.getOrder(orderId);
    if (!order) return undefined;
    const items = await this.getOrderItems(orderId);
    return { order, items };
  }

  async getAdminDashboardStats(): Promise<{
    totalSales: number;
    totalOrders: number;
    totalCustomers: number;
    recentOrders: Order[];
  }> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allUsers = await db.select().from(users).where(eq(users.role, 'customer'));
    
    const totalSales = allOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);
    
    return {
      totalSales,
      totalOrders: allOrders.length,
      totalCustomers: allUsers.length,
      recentOrders: allOrders.slice(0, 10),
    };
  }

  async getAllCoupons(): Promise<Coupon[]> {
    return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }

  async getCoupon(id: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.id, id));
    return coupon || undefined;
  }

  async getCouponByCode(code: string): Promise<Coupon | undefined> {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase()));
    return coupon || undefined;
  }

  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    const [newCoupon] = await db
      .insert(coupons)
      .values({ ...coupon, code: coupon.code.toUpperCase() })
      .returning();
    return newCoupon;
  }

  async updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon | undefined> {
    const updateData = coupon.code ? { ...coupon, code: coupon.code.toUpperCase() } : coupon;
    const [updated] = await db
      .update(coupons)
      .set(updateData)
      .where(eq(coupons.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCoupon(id: string): Promise<boolean> {
    const result = await db.delete(coupons).where(eq(coupons.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async incrementCouponUsage(id: string): Promise<void> {
    await db.update(coupons)
      .set({ currentUsageCount: sql`${coupons.currentUsageCount} + 1` })
      .where(eq(coupons.id, id));
  }

  async createCouponRedemption(redemption: InsertCouponRedemption): Promise<CouponRedemption> {
    const [newRedemption] = await db
      .insert(couponRedemptions)
      .values(redemption)
      .returning();
    return newRedemption;
  }

  async getCouponRedemptions(couponId: string): Promise<CouponRedemption[]> {
    return await db.select().from(couponRedemptions).where(eq(couponRedemptions.couponId, couponId)).orderBy(desc(couponRedemptions.createdAt));
  }

  async getCouponStats(couponId: string): Promise<{ totalRedemptions: number; totalOrderValue: number; totalDiscount: number }> {
    const redemptions = await this.getCouponRedemptions(couponId);
    return {
      totalRedemptions: redemptions.length,
      totalOrderValue: redemptions.reduce((sum, r) => sum + parseFloat(r.orderTotalBeforeDiscount || '0'), 0),
      totalDiscount: redemptions.reduce((sum, r) => sum + parseFloat(r.discountAmount || '0'), 0),
    };
  }

  async getAllCouponStats(): Promise<{ couponId: string; code: string; totalRedemptions: number; totalOrderValue: number; totalDiscount: number }[]> {
    const allCoupons = await this.getAllCoupons();
    const stats = await Promise.all(allCoupons.map(async (coupon) => {
      const couponStats = await this.getCouponStats(coupon.id);
      return {
        couponId: coupon.id,
        code: coupon.code,
        ...couponStats,
      };
    }));
    return stats;
  }

  async getProductSizeStock(productId: string): Promise<ProductSizeStock[]> {
    return await db.select().from(productSizeStock).where(eq(productSizeStock.productId, productId));
  }

  async getSizeStock(productId: string, size: string): Promise<ProductSizeStock | undefined> {
    const [stock] = await db.select().from(productSizeStock)
      .where(and(
        eq(productSizeStock.productId, productId),
        eq(productSizeStock.size, size)
      ));
    return stock || undefined;
  }

  async setSizeStock(productId: string, size: string, stock: number): Promise<ProductSizeStock> {
    const existing = await this.getSizeStock(productId, size);
    if (existing) {
      const [updated] = await db.update(productSizeStock)
        .set({ stock })
        .where(eq(productSizeStock.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(productSizeStock)
      .values({ productId, size, stock })
      .returning();
    return created;
  }

  async decrementSizeStock(items: Array<{ productId: string; size: string; quantity: number }>): Promise<boolean> {
    // Group by productId to batch updates
    const byProduct: Record<string, Array<{ size: string; quantity: number }>> = {};
    for (const item of items) {
      if (!item.size) continue;
      if (!byProduct[item.productId]) byProduct[item.productId] = [];
      byProduct[item.productId].push({ size: item.size, quantity: item.quantity });
    }

    for (const [productId, sizeItems] of Object.entries(byProduct)) {
      // Decrement in product_size_stock (legacy table)
      for (const item of sizeItems) {
        const stockRecord = await this.getSizeStock(productId, item.size);
        if (stockRecord && stockRecord.stock >= item.quantity) {
          await db.update(productSizeStock)
            .set({ stock: stockRecord.stock - item.quantity })
            .where(eq(productSizeStock.id, stockRecord.id));
        }
      }

      // Also decrement directly in product.sizes JSON (single source of truth for display & alerts)
      const [p] = await db.select().from(products).where(eq(products.id, productId));
      if (!p?.sizes) continue;
      try {
        const sizesObj = JSON.parse(p.sizes) as Record<string, number>;
        let changed = false;
        for (const item of sizeItems) {
          if (sizesObj.hasOwnProperty(item.size)) {
            sizesObj[item.size] = Math.max(0, (sizesObj[item.size] || 0) - item.quantity);
            changed = true;
          }
        }
        if (changed) {
          await db.update(products)
            .set({ sizes: JSON.stringify(sizesObj), stockAlertSent: false })
            .where(eq(products.id, productId));
        }
      } catch { /* ignore JSON parse errors */ }
    }
    return true;
  }

  async decrementSimpleProductStock(productId: string, quantity: number): Promise<boolean> {
    const [p] = await db.select().from(products).where(eq(products.id, productId));
    if (!p || p.stock === null || p.stock === undefined) return true;
    const newStock = Math.max(0, p.stock - quantity);
    await db.update(products).set({ stock: newStock, stockAlertSent: false }).where(eq(products.id, productId));
    return true;
  }

  async getOutOfStockCount(): Promise<number> {
    const allProducts = await db.select().from(products).where(eq(products.isActive, true));
    let count = 0;
    for (const p of allProducts) {
      if (p.sizes) {
        try {
          const sizesObj = JSON.parse(p.sizes) as Record<string, number>;
          const total = Object.values(sizesObj).reduce((sum, qty) => sum + (qty || 0), 0);
          if (total === 0) count++;
        } catch { /* ignore */ }
      } else if (p.stock !== null && p.stock !== undefined && p.stock === 0) {
        count++;
      }
    }
    return count;
  }

  async getLowStockProducts(): Promise<{ id: string; name: string; stock: number; minStock: number; stockAlertSent: boolean }[]> {
    const allProducts = await db.select().from(products).where(
      and(eq(products.isActive, true), isNotNull(products.minStock))
    );
    const result: { id: string; name: string; stock: number; minStock: number; stockAlertSent: boolean }[] = [];
    for (const p of allProducts) {
      if (p.minStock === null || p.minStock === undefined) continue;
      let currentStock = 0;
      if (p.sizes) {
        try {
          const sizesObj = JSON.parse(p.sizes) as Record<string, number>;
          currentStock = Object.values(sizesObj).reduce((sum, qty) => sum + (qty || 0), 0);
        } catch { currentStock = 0; }
      } else {
        currentStock = p.stock ?? 0;
      }
      if (currentStock <= p.minStock && !p.stockAlertSent) {
        result.push({ id: p.id, name: p.name, stock: currentStock, minStock: p.minStock, stockAlertSent: p.stockAlertSent });
      }
    }
    return result;
  }

  async markStockAlertSent(productId: string): Promise<void> {
    await db.update(products).set({ stockAlertSent: true }).where(eq(products.id, productId));
  }

  async resetStockAlertSent(productId: string): Promise<void> {
    await db.update(products).set({ stockAlertSent: false }).where(eq(products.id, productId));
  }

  async updateUserProfile(userId: string, data: { name?: string | null; phone?: string | null; personType?: string; cpf?: string | null; cnpj?: string | null; razaoSocial?: string | null; inscricaoEstadual?: string | null }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async updateUserEmailVerification(userId: string, data: { emailVerified?: boolean; emailVerificationToken?: string | null; emailVerificationExpires?: Date | null }): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(data)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'admin'));
  }

  async getStoreSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(storeSettings).where(eq(storeSettings.key, key));
    return setting?.value;
  }

  async setStoreSetting(key: string, value: string, description?: string): Promise<void> {
    const existing = await this.getStoreSetting(key);
    if (existing !== undefined) {
      await db.update(storeSettings)
        .set({ value, description: description || null, updatedAt: new Date() })
        .where(eq(storeSettings.key, key));
    } else {
      await db.insert(storeSettings).values({ key, value, description: description || null });
    }
  }

  async getAllStoreSettings(): Promise<{ key: string; value: string; description: string | null }[]> {
    const settings = await db.select({
      key: storeSettings.key,
      value: storeSettings.value,
      description: storeSettings.description,
    }).from(storeSettings);
    return settings;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getCustomerSupportTickets(email: string): Promise<SupportTicket[]> {
    return await db.select().from(supportTickets)
      .where(eq(supportTickets.customerEmail, email))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(filters?: { status?: string; priority?: string }): Promise<SupportTicket[]> {
    let query = db.select().from(supportTickets);
    
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return await query.orderBy(desc(supportTickets.createdAt));
  }

  async updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated || undefined;
  }

  async closeSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets)
      .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated || undefined;
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [created] = await db.insert(supportMessages).values(message).returning();
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, message.ticketId));
    return created;
  }

  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    return await db.select().from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);
  }

  async markMessagesAsRead(ticketId: string, senderType: string): Promise<void> {
    await db.update(supportMessages)
      .set({ isRead: true })
      .where(and(
        eq(supportMessages.ticketId, ticketId),
        sql`${supportMessages.senderType} != ${senderType}`
      ));
  }

  async getUnreadMessageCount(ticketId: string, senderType: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(supportMessages)
      .where(and(
        eq(supportMessages.ticketId, ticketId),
        eq(supportMessages.isRead, false),
        sql`${supportMessages.senderType} != ${senderType}`
      ));
    return result?.count || 0;
  }

  async getAllKits(): Promise<Kit[]> {
    return await db.select().from(kits).orderBy(kits.displayOrder);
  }

  async getAllKitsWithItems(): Promise<{ kit: Kit; items: (KitItem & { product: Product })[] }[]> {
    const allKits = await db.select().from(kits).where(eq(kits.isActive, true)).orderBy(kits.displayOrder);
    const allItems = await db
      .select({
        id: kitItems.id,
        kitId: kitItems.kitId,
        productId: kitItems.productId,
        quantity: kitItems.quantity,
        product: products,
      })
      .from(kitItems)
      .leftJoin(products, eq(kitItems.productId, products.id));

    return allKits.map(kit => ({
      kit,
      items: allItems
        .filter(i => i.kitId === kit.id && i.product !== null)
        .map(i => i as KitItem & { product: Product }),
    }));
  }

  async getKit(id: string): Promise<Kit | undefined> {
    const [kit] = await db.select().from(kits).where(eq(kits.id, id));
    return kit || undefined;
  }

  async getKitWithItems(id: string): Promise<{ kit: Kit; items: (KitItem & { product: Product })[] } | undefined> {
    const [kit] = await db.select().from(kits).where(eq(kits.id, id));
    if (!kit) return undefined;

    const items = await db
      .select({
        id: kitItems.id,
        kitId: kitItems.kitId,
        productId: kitItems.productId,
        quantity: kitItems.quantity,
        product: products,
      })
      .from(kitItems)
      .leftJoin(products, eq(kitItems.productId, products.id))
      .where(eq(kitItems.kitId, id));

    return {
      kit,
      items: items.filter(i => i.product !== null) as (KitItem & { product: Product })[],
    };
  }

  async createKit(kit: InsertKit, items: InsertKitItem[]): Promise<Kit> {
    const [newKit] = await db.transaction(async (tx) => {
      const [createdKit] = await tx.insert(kits).values(kit).returning();
      if (items.length > 0) {
        await tx.insert(kitItems).values(items.map(i => ({ ...i, kitId: createdKit.id })));
      }
      return [createdKit];
    });
    return newKit;
  }

  async updateKit(id: string, kit: Partial<InsertKit>, items?: InsertKitItem[]): Promise<Kit | undefined> {
    const [updated] = await db.transaction(async (tx) => {
      const [updatedKit] = await tx.update(kits).set(kit).where(eq(kits.id, id)).returning();
      if (items !== undefined) {
        await tx.delete(kitItems).where(eq(kitItems.kitId, id));
        if (items.length > 0) {
          await tx.insert(kitItems).values(items.map(i => ({ ...i, kitId: id })));
        }
      }
      return [updatedKit];
    });
    return updated || undefined;
  }

  async deleteKit(id: string): Promise<boolean> {
    const result = await db.delete(kits).where(eq(kits.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // ---- Promotions ----
  async getAllPromotions(): Promise<Promotion[]> {
    return await db.select().from(promotions).orderBy(desc(promotions.createdAt));
  }

  async getPromotion(id: string): Promise<Promotion | undefined> {
    const [promo] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promo || undefined;
  }

  async createPromotion(data: InsertPromotion): Promise<Promotion> {
    const [promo] = await db.insert(promotions).values(data).returning();
    return promo;
  }

  async updatePromotion(id: string, data: Partial<InsertPromotion>): Promise<Promotion | undefined> {
    const [updated] = await db.update(promotions).set(data).where(eq(promotions.id, id)).returning();
    return updated || undefined;
  }

  async deletePromotion(id: string): Promise<boolean> {
    const result = await db.delete(promotions).where(eq(promotions.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPromotionInsights(id: string): Promise<{
    orderCount: number;
    revenue: number;
    itemsSold: number;
    avgOrderValue: number;
    estimatedDiscount: number;
    topProducts: { name: string; qty: number; revenue: number }[];
  }> {
    const promo = await this.getPromotion(id);
    if (!promo) return { orderCount: 0, revenue: 0, itemsSold: 0, avgOrderValue: 0, estimatedDiscount: 0, topProducts: [] };

    const start = promo.startDate;
    const end = promo.endDate;
    const discVal = parseFloat(promo.discountValue as string);
    const isPerc = promo.discountType === 'percentage';

    // Base order query filtered by period
    let ordersInPeriod: { id: string; totalAmount: string }[] = [];

    if (promo.targetType === 'all') {
      ordersInPeriod = await db.select({ id: orders.id, totalAmount: orders.totalAmount })
        .from(orders)
        .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)));
    } else if (promo.targetType === 'product') {
      const rows = await db.selectDistinct({ id: orders.id, totalAmount: orders.totalAmount })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end), eq(orderItems.productId, promo.targetId!)));
      ordersInPeriod = rows;
    } else if (promo.targetType === 'collection') {
      const rows = await db.selectDistinct({ id: orders.id, totalAmount: orders.totalAmount })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(products.id, orderItems.productId))
        .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end), eq(products.collectionId, promo.targetId!)));
      ordersInPeriod = rows;
    } else if (promo.targetType === 'group') {
      const rows = await db.selectDistinct({ id: orders.id, totalAmount: orders.totalAmount })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(products.id, orderItems.productId))
        .innerJoin(collections, eq(collections.id, products.collectionId))
        .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end), eq(collections.groupId, promo.targetId!)));
      ordersInPeriod = rows;
    }

    const orderIds = ordersInPeriod.map(o => o.id);
    const revenue = ordersInPeriod.reduce((s, o) => s + parseFloat(o.totalAmount), 0);
    const orderCount = ordersInPeriod.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    // Items sold + top products
    let itemsSold = 0;
    let topProducts: { name: string; qty: number; revenue: number }[] = [];
    let promotedItemsRevenue = 0; // revenue of only the promoted items (at discounted price)

    if (orderIds.length > 0) {
      // Fetch revenue for ONLY the promoted items to compute an accurate estimated discount
      if (promo.targetType === 'all') {
        const [row] = await db.select({
          rev: sql<number>`coalesce(sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity}), 0)`,
        }).from(orderItems).where(inArray(orderItems.orderId, orderIds));
        promotedItemsRevenue = Number(row?.rev ?? 0);
      } else if (promo.targetType === 'product') {
        const [row] = await db.select({
          rev: sql<number>`coalesce(sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity}), 0)`,
        }).from(orderItems).where(and(inArray(orderItems.orderId, orderIds), eq(orderItems.productId, promo.targetId!)));
        promotedItemsRevenue = Number(row?.rev ?? 0);
      } else if (promo.targetType === 'collection') {
        const [row] = await db.select({
          rev: sql<number>`coalesce(sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity}), 0)`,
        }).from(orderItems)
          .innerJoin(products, eq(products.id, orderItems.productId))
          .where(and(inArray(orderItems.orderId, orderIds), eq(products.collectionId, promo.targetId!)));
        promotedItemsRevenue = Number(row?.rev ?? 0);
      } else if (promo.targetType === 'group') {
        const [row] = await db.select({
          rev: sql<number>`coalesce(sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity}), 0)`,
        }).from(orderItems)
          .innerJoin(products, eq(products.id, orderItems.productId))
          .innerJoin(collections, eq(collections.id, products.collectionId))
          .where(and(inArray(orderItems.orderId, orderIds), eq(collections.groupId, promo.targetId!)));
        promotedItemsRevenue = Number(row?.rev ?? 0);
      }

      const itemRows = await db.select({
        name: orderItems.productName,
        qty: sql<number>`sum(${orderItems.quantity})`,
        rev: sql<number>`sum(cast(${orderItems.price} as numeric) * ${orderItems.quantity})`,
      })
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))
        .groupBy(orderItems.productName)
        .orderBy(sql`sum(${orderItems.quantity}) DESC`)
        .limit(5);

      itemsSold = itemRows.reduce((s, r) => s + Number(r.qty), 0);
      topProducts = itemRows.map(r => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.rev) }));
    }

    // For percentage discounts: price stored is already discounted, so
    // estimatedDiscount = promotedRevenue × discVal / (100 - discVal)
    // For fixed discounts: discVal × orderCount
    const estimatedDiscount = isPerc
      ? (100 - discVal) > 0 ? promotedItemsRevenue * discVal / (100 - discVal) : 0
      : discVal * orderCount;

    return { orderCount, revenue, itemsSold, avgOrderValue, estimatedDiscount, topProducts };
  }

  // ─────────────────────────────────────────────
  // CASHBACK IMPLEMENTATIONS
  // ─────────────────────────────────────────────

  async getAllCashbackRules(): Promise<CashbackRule[]> {
    return db.select().from(cashbackRules).orderBy(desc(cashbackRules.createdAt));
  }

  async getCashbackRule(id: string): Promise<CashbackRule | undefined> {
    const [rule] = await db.select().from(cashbackRules).where(eq(cashbackRules.id, id));
    return rule || undefined;
  }

  async getCashbackRuleByTarget(targetType: string, targetId: string): Promise<CashbackRule | undefined> {
    const [rule] = await db.select().from(cashbackRules).where(
      and(eq(cashbackRules.targetType, targetType), eq(cashbackRules.targetId, targetId))
    );
    return rule || undefined;
  }

  async createCashbackRule(rule: InsertCashbackRule): Promise<CashbackRule> {
    const [created] = await db.insert(cashbackRules).values(rule).returning();
    return created;
  }

  async updateCashbackRule(id: string, rule: Partial<InsertCashbackRule>): Promise<CashbackRule | undefined> {
    const [updated] = await db.update(cashbackRules).set(rule).where(eq(cashbackRules.id, id)).returning();
    return updated || undefined;
  }

  async deleteCashbackRule(id: string): Promise<boolean> {
    const result = await db.delete(cashbackRules).where(eq(cashbackRules.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Hierarchy: group (highest) > collection > product (lowest)
  // Returns the percentage from the highest applicable rule, or 0 if none
  async getApplicableCashbackPercentage(productId: string, collectionId: string, groupId: string | null): Promise<number> {
    const allRules = await db.select().from(cashbackRules).where(eq(cashbackRules.isActive, true));

    // Check group rule first
    if (groupId) {
      const groupRule = allRules.find(r => r.targetType === 'group' && r.targetId === groupId);
      if (groupRule) return Number(groupRule.percentage);
    }

    // Then collection rule
    const collectionRule = allRules.find(r => r.targetType === 'collection' && r.targetId === collectionId);
    if (collectionRule) return Number(collectionRule.percentage);

    // Then product rule
    const productRule = allRules.find(r => r.targetType === 'product' && r.targetId === productId);
    if (productRule) return Number(productRule.percentage);

    return 0;
  }

  async getUserCashbackTransactions(userId: string): Promise<CashbackTransaction[]> {
    return db.select().from(cashbackTransactions)
      .where(eq(cashbackTransactions.userId, userId))
      .orderBy(desc(cashbackTransactions.createdAt));
  }

  async addCashbackTransaction(tx: InsertCashbackTransaction): Promise<CashbackTransaction> {
    const [created] = await db.insert(cashbackTransactions).values(tx).returning();
    return created;
  }

  async updateUserCashbackBalance(userId: string, delta: number): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ cashbackBalance: sql`cashback_balance + ${delta}` })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  // Called when an order is marked as 'delivered' — credits cashback to buyer
  async creditCashbackForOrder(orderId: string, userId: string): Promise<void> {
    // Check if already credited
    const existing = await db.select().from(cashbackTransactions).where(
      and(eq(cashbackTransactions.orderId, orderId), eq(cashbackTransactions.type, 'earned'))
    );
    if (existing.length > 0) return;

    // Get order to use its orderNumber in descriptions
    const [orderRecord] = await db.select().from(orders).where(eq(orders.id, orderId));
    const orderLabel = orderRecord?.orderNumber || orderId.slice(-8).toUpperCase();

    const orderItemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (orderItemRows.length === 0) return;

    // Load all active cashback rules once
    const allRules = await db.select().from(cashbackRules).where(eq(cashbackRules.isActive, true));

    // Aggregate cashback per rule
    const ruleEarnings: Map<string, { rule: typeof allRules[0]; amount: number }> = new Map();

    for (const item of orderItemRows) {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (!product) continue;

      const [collection] = await db.select().from(collections).where(eq(collections.id, product.collectionId));
      const groupId = collection?.groupId || null;

      // Apply hierarchy: group > collection > product
      let appliedRule: typeof allRules[0] | null = null;
      if (groupId) {
        appliedRule = allRules.find(r => r.targetType === 'group' && r.targetId === groupId) ?? null;
      }
      if (!appliedRule) {
        appliedRule = allRules.find(r => r.targetType === 'collection' && r.targetId === product.collectionId) ?? null;
      }
      if (!appliedRule) {
        appliedRule = allRules.find(r => r.targetType === 'product' && r.targetId === product.id) ?? null;
      }

      if (appliedRule) {
        const itemTotal = Number(item.price) * item.quantity;
        const earned = (itemTotal * Number(appliedRule.percentage)) / 100;
        const existing = ruleEarnings.get(appliedRule.id);
        if (existing) {
          existing.amount += earned;
        } else {
          ruleEarnings.set(appliedRule.id, { rule: appliedRule, amount: earned });
        }
      }
    }

    if (ruleEarnings.size === 0) return;

    const totalCashback = Math.round(
      Array.from(ruleEarnings.values()).reduce((sum, e) => sum + e.amount, 0) * 100
    ) / 100;

    await db.transaction(async (tx) => {
      for (const [ruleId, entry] of Array.from(ruleEarnings)) {
        const amount = Math.round(entry.amount * 100) / 100;
        if (amount <= 0) continue;
        await tx.insert(cashbackTransactions).values({
          userId,
          orderId,
          ruleId,
          type: 'earned',
          amount: String(amount),
          description: `Cashback ${entry.rule.percentage}% – ${entry.rule.targetName} (Pedido #${orderLabel})`,
        });
      }
      await tx.update(users)
        .set({ cashbackBalance: sql`cashback_balance + ${totalCashback}` })
        .where(eq(users.id, userId));
    });
  }

  async reverseCashbackForOrder(orderId: string, userId: string): Promise<void> {
    // Find all 'earned' transactions for this order that haven't already been reversed
    const earned = await db.select().from(cashbackTransactions).where(
      and(
        eq(cashbackTransactions.orderId, orderId),
        eq(cashbackTransactions.type, 'earned'),
      )
    );
    if (earned.length === 0) return;

    // Check if already reversed
    const reversed = await db.select().from(cashbackTransactions).where(
      and(
        eq(cashbackTransactions.orderId, orderId),
        eq(cashbackTransactions.type, 'reversed'),
      )
    );
    if (reversed.length > 0) return;

    const totalToReverse = Math.round(
      earned.reduce((sum, t) => sum + parseFloat(t.amount), 0) * 100
    ) / 100;

    if (totalToReverse <= 0) return;

    // Get order to use its orderNumber in description
    const [orderRecord] = await db.select().from(orders).where(eq(orders.id, orderId));
    const orderLabel = orderRecord?.orderNumber || orderId.slice(-8).toUpperCase();

    await db.transaction(async (tx) => {
      await tx.insert(cashbackTransactions).values({
        userId,
        orderId,
        type: 'reversed',
        amount: String(totalToReverse),
        description: `Cashback estornado — pedido cancelado (#${orderLabel})`,
      });
      await tx.update(users)
        .set({ cashbackBalance: sql`GREATEST(0, cashback_balance - ${totalToReverse})` })
        .where(eq(users.id, userId));
    });
  }

  async getCashbackDashboard(): Promise<{
    totalEarned: number;
    totalSpent: number;
    circulatingBalance: number;
    usersWithBalance: number;
    transactionCount: number;
    perRule: Array<{ ruleId: string; targetName: string; targetType: string; percentage: string; isActive: boolean; totalEarned: number; transactionCount: number; lastUsed: string | null }>;
  }> {
    const [earnedRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(cashbackTransactions)
      .where(eq(cashbackTransactions.type, 'earned'));

    const [spentRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(cashbackTransactions)
      .where(eq(cashbackTransactions.type, 'spent'));

    const [balanceRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(cashback_balance::numeric), 0)` })
      .from(users);

    const [usersRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(users)
      .where(sql`cashback_balance::numeric > 0`);

    const [txCountRow] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(cashbackTransactions);

    const allRules = await db.select().from(cashbackRules).orderBy(desc(cashbackRules.createdAt));

    const perRule = await Promise.all(allRules.map(async (rule) => {
      const [earnRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)`, count: sql<string>`COUNT(*)` })
        .from(cashbackTransactions)
        .where(and(eq(cashbackTransactions.ruleId, rule.id), eq(cashbackTransactions.type, 'earned')));
      const [lastRow] = await db
        .select({ last: cashbackTransactions.createdAt })
        .from(cashbackTransactions)
        .where(and(eq(cashbackTransactions.ruleId, rule.id), eq(cashbackTransactions.type, 'earned')))
        .orderBy(desc(cashbackTransactions.createdAt))
        .limit(1);
      return {
        ruleId: rule.id,
        targetName: rule.targetName,
        targetType: rule.targetType,
        percentage: rule.percentage,
        isActive: rule.isActive,
        totalEarned: Number(earnRow?.total ?? 0),
        transactionCount: Number(earnRow?.count ?? 0),
        lastUsed: lastRow?.last ? lastRow.last.toISOString() : null,
      };
    }));

    return {
      totalEarned: Number(earnedRow?.total ?? 0),
      totalSpent: Number(spentRow?.total ?? 0),
      circulatingBalance: Number(balanceRow?.total ?? 0),
      usersWithBalance: Number(usersRow?.count ?? 0),
      transactionCount: Number(txCountRow?.count ?? 0),
      perRule,
    };
  }

  // Called at checkout to deduct cashback from wallet
  async applyCashbackToOrder(userId: string, amount: number): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || Number(user.cashbackBalance) < amount) return false;
    return true; // actual deduction happens when order is confirmed
  }

  // ── REFERRAL ──────────────────────────────────────────────
  async getOrCreateReferralCode(userId: string): Promise<ReferralCode> {
    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    if (existing) return existing;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const base = (user?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `${base.toUpperCase() || 'REF'}${suffix}`;
    const [created] = await db.insert(referralCodes).values({ userId, code }).returning();
    return created;
  }

  async getReferralCodeByCode(code: string): Promise<ReferralCode | undefined> {
    const [row] = await db.select().from(referralCodes).where(eq(referralCodes.code, code.toUpperCase()));
    return row;
  }

  async getReferralsByReferrer(referrerId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(desc(referrals.createdAt));
  }

  async getAvailableReferralReward(referrerId: string): Promise<Referral | undefined> {
    const [row] = await db.select().from(referrals).where(
      and(eq(referrals.referrerId, referrerId), eq(referrals.status, 'available'))
    ).orderBy(desc(referrals.createdAt)).limit(1);
    return row;
  }

  async countAvailableReferralRewards(referrerId: string): Promise<number> {
    const rows = await db.select().from(referrals).where(
      and(eq(referrals.referrerId, referrerId), eq(referrals.status, 'available'))
    );
    return rows.length;
  }

  async processReferralForOrder(
    orderId: string,
    referralCode: string,
    buyerEmail: string,
    buyerUserId: string | null,
    orderTotal: number,
  ): Promise<void> {
    const refCode = await this.getReferralCodeByCode(referralCode);
    if (!refCode) return;

    const [referrer] = await db.select().from(users).where(eq(users.id, refCode.userId));
    if (!referrer) return;

    // Anti-abuse: no self-referral
    if (referrer.email.toLowerCase() === buyerEmail.toLowerCase()) return;

    // Anti-abuse: each email can only be referred once
    const [alreadyReferred] = await db.select().from(referrals).where(
      eq(referrals.referredEmail, buyerEmail.toLowerCase())
    );
    if (alreadyReferred) return;

    // Anti-abuse: buyer must be a new customer (no previous orders)
    if (buyerUserId) {
      const prevOrders = await db.select().from(orders).where(eq(orders.userId, buyerUserId));
      const prevCompleted = prevOrders.filter(o => o.id !== orderId);
      if (prevCompleted.length > 0) return;
    }

    // Read referral settings
    const minReferredPurchase = Number(await this.getStoreSetting('referral_min_referred_purchase') ?? '0');
    if (orderTotal < minReferredPurchase) return;

    const rewardType = (await this.getStoreSetting('referral_reward_type')) ?? 'percentage';
    const rewardValue = Number(await this.getStoreSetting('referral_reward_value') ?? '10');
    const minReferrerPurchase = Number(await this.getStoreSetting('referral_min_referrer_purchase') ?? '0');

    await db.insert(referrals).values({
      referrerId: refCode.userId,
      referredEmail: buyerEmail.toLowerCase(),
      referredUserId: buyerUserId,
      qualifyingOrderId: orderId,
      rewardType,
      rewardValue: String(rewardValue),
      minReferrerPurchase: String(minReferrerPurchase),
      status: 'available',
    });
  }

  async useReferralReward(referralId: string, orderId: string): Promise<void> {
    await db.update(referrals)
      .set({ status: 'used', usedOrderId: orderId })
      .where(eq(referrals.id, referralId));
  }

  async getAllReferrals(limit = 100): Promise<Array<Referral & { referrerName?: string; referrerEmail?: string }>> {
    const rows = await db.select().from(referrals).orderBy(desc(referrals.createdAt)).limit(limit);
    const result: Array<Referral & { referrerName?: string; referrerEmail?: string }> = [];
    for (const r of rows) {
      const [ref] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, r.referrerId));
      result.push({ ...r, referrerName: ref?.name ?? undefined, referrerEmail: ref?.email ?? undefined });
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
