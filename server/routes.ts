import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import passport from "./auth";
import { storage } from "./storage";
import { requireAuth, requireAdmin, requireCustomer, loginRateLimiter, forgotPasswordRateLimiter, registerRateLimiter, couponValidateRateLimiter } from "./middleware";
import {
  insertUserSchema,
  insertGroupSchema,
  insertCollectionSchema,
  insertProductSchema,
  insertOrderSchema,
  insertOrderItemSchema,
  insertAddressSchema,
  insertCouponSchema,
  insertKitSchema,
  insertKitItemSchema,
  type Product,
} from "@shared/schema";
import { z } from "zod";
import {
  createPaymentPreference,
  getPaymentDetails,
  isMercadoPagoConfigured,
  searchPaymentsByExternalReference,
} from "./mercadopago";
import { calculateShipping, calculatePackageDimensions } from "./correios";
import { isLoggiEnabled, getLoggiQuote, createLoggiShipment, getLoggiLabel, getLoggiTracking } from "./loggi";
import {
  isMelhorEnvioEnabled,
  getMelhorEnvioQuote,
  addToMelhorEnvioCart,
  checkoutMelhorEnvioCart,
  generateMelhorEnvioLabel,
  printMelhorEnvioLabel,
  getMelhorEnvioTracking,
  cancelMelhorEnvioShipment,
  buildMelhorEnvioTrackingUrl,
} from "./melhorenvio";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendAdminNewOrderEmail,
  getStatusInfo,
  sendSupportMessageEmail,
  sendLowStockAlert,
} from "./email";

const generateToken = (): string => crypto.randomBytes(32).toString("hex");

const getBaseUrl = (req: any): string => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
  return `${protocol}://${host}`;
};

const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
};

const triggerLowStockAlerts = async (storage: any): Promise<void> => {
  try {
    const lowStockProducts = await storage.getLowStockProducts();
    if (lowStockProducts.length === 0) return;
    const admins = await storage.getAdminUsers();
    for (const admin of admins) {
      await sendLowStockAlert(admin.email, lowStockProducts.map((p: any) => ({
        name: p.name,
        currentStock: p.stock,
        minStock: p.minStock,
      })));
    }
    for (const p of lowStockProducts) {
      await storage.markStockAlertSent(p.id);
    }
  } catch (err) {
    console.error('Error triggering low stock alerts:', err);
  }
};

// ─── Promotion helpers ────────────────────────────────────────────────────────

async function fetchActivePromos() {
  const now = new Date();
  const all = await storage.getAllPromotions();
  return all.filter(
    (p) =>
      p.isActive &&
      new Date(p.startDate) <= now &&
      new Date(p.endDate) >= now,
  );
}

function calcCashbackPct(
  product: { id: string; collectionId: string | null },
  cashbackRules: any[],
  collectionGroupMap: Record<string, string>,
): number {
  const groupId = product.collectionId ? collectionGroupMap[product.collectionId] : null;
  // Hierarchy: group > collection > product
  if (groupId) {
    const rule = cashbackRules.find(r => r.targetType === 'group' && r.targetId === groupId);
    if (rule) return parseFloat(rule.percentage);
  }
  const collRule = cashbackRules.find(r => r.targetType === 'collection' && r.targetId === product.collectionId);
  if (collRule) return parseFloat(collRule.percentage);
  const prodRule = cashbackRules.find(r => r.targetType === 'product' && r.targetId === product.id);
  if (prodRule) return parseFloat(prodRule.percentage);
  return 0;
}

/** Returns the price to display/use as the base for a product.
 *  If the product has sizePrices, the first entry is the canonical display price.
 *  selectedSize overrides this when computing cart/checkout prices.
 */
function getProductDisplayPrice(
  product: { price: string; sizePrices?: string | null },
  selectedSize?: string | null,
): number {
  if (product.sizePrices) {
    try {
      const sp = JSON.parse(product.sizePrices) as Record<string, string>;
      if (selectedSize && sp[selectedSize] && sp[selectedSize] !== '') {
        return parseFloat(sp[selectedSize]);
      }
      // First variation is the canonical display price
      const firstKey = Object.keys(sp)[0];
      if (firstKey && sp[firstKey] && sp[firstKey] !== '') {
        return parseFloat(sp[firstKey]);
      }
    } catch { /* ignore */ }
  }
  return parseFloat(product.price);
}

function calcEffectivePrice(
  product: { id: string; price: string; collectionId: string | null; sizePrices?: string | null },
  activePromos: any[],
  collectionGroupMap: Record<string, string>,
  selectedSize?: string | null,
): { effectivePrice: number; promoLabel: string | null; promoDiscountType: string | null; promoDiscountValue: string | null; displayPrice: number } {
  const original = getProductDisplayPrice(product, selectedSize);
  const groupId = product.collectionId
    ? collectionGroupMap[product.collectionId]
    : null;

  const applicable = activePromos.filter((p) => {
    if (p.targetType === "all") return true;
    if (p.targetType === "product" && p.targetId === product.id) return true;
    if (
      p.targetType === "collection" &&
      p.targetId === product.collectionId
    )
      return true;
    if (p.targetType === "group" && p.targetId === groupId) return true;
    return false;
  });

  if (!applicable.length) return { effectivePrice: original, promoLabel: null, promoDiscountType: null, promoDiscountValue: null, displayPrice: original };

  let bestPrice = original;
  let bestPromo: any = null;

  for (const promo of applicable) {
    const disc =
      promo.discountType === "percentage"
        ? original * (1 - parseFloat(promo.discountValue) / 100)
        : Math.max(0, original - parseFloat(promo.discountValue));
    if (disc < bestPrice) {
      bestPrice = disc;
      bestPromo = promo;
    }
  }

  if (!bestPromo) return { effectivePrice: original, promoLabel: null, promoDiscountType: null, promoDiscountValue: null, displayPrice: original };

  const label =
    bestPromo.discountType === "percentage"
      ? `${parseFloat(bestPromo.discountValue).toFixed(0)}% OFF`
      : `R$ ${parseFloat(bestPromo.discountValue)
          .toFixed(2)
          .replace(".", ",")} OFF`;

  return {
    effectivePrice: Math.round(bestPrice * 100) / 100,
    promoLabel: label,
    promoDiscountType: bestPromo.discountType,
    promoDiscountValue: bestPromo.discountValue,
    displayPrice: original,
  };
}

async function resolveKitPrice(kitId: string, storage: any): Promise<{ price: number; name: string; image: string | null } | null> {
  const kit = await storage.getKit(kitId);
  if (!kit) return null;
  const promoPrice = kit.promotionPrice ? parseFloat(kit.promotionPrice) : null;
  const basePrice = parseFloat(kit.price);
  return {
    price: promoPrice && promoPrice > 0 ? promoPrice : basePrice,
    name: kit.name,
    image: kit.image,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (date: Date): { date: string; time: string } => {
  return {
    date: new Intl.DateTimeFormat("pt-BR").format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
};

const getPaymentMethodText = (method: string): string => {
  const methods: Record<string, string> = {
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    pix: "PIX",
    boleto: "Boleto",
    mercadopago: "Mercado Pago",
  };
  return methods[method] || method || "Não especificado";
};

const sendOrderNotifications = async (
  orderId: string,
  baseUrl: string,
  isNewOrder: boolean = true,
  oldStatus?: string,
) => {
  try {
    const order = await storage.getOrder(orderId);
    if (!order) return;

    const items = await storage.getOrderItems(orderId);
    const statusInfo = getStatusInfo(order.status);

    const formattedItems = items.map((item) => ({
      name: item.productName,
      size: item.selectedSize || "Único",
      quantity: item.quantity,
      priceFormatted: formatCurrency(parseFloat(item.price) * item.quantity),
    }));

    const customerEmail = order.shippingEmail;
    const customerName = order.shippingName;

    const subtotal = items.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0,
    );
    const shipping = parseFloat(order.shippingCost || "0");
    const discount = parseFloat(order.discountAmount || "0");
    const total = parseFloat(order.totalAmount);

    if (isNewOrder) {
      await sendOrderConfirmationEmail(customerEmail, {
        customerName,
        orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
        statusClass: statusInfo.class,
        statusText: statusInfo.text,
        items: formattedItems,
        subtotal: formatCurrency(subtotal),
        discount: discount > 0 ? formatCurrency(discount) : undefined,
        couponCode: order.couponCode || undefined,
        shipping: shipping > 0 ? formatCurrency(shipping) : "Grátis",
        shippingMethod: order.shippingMethod || "Padrão",
        total: formatCurrency(total),
        shippingName: customerName,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingZip: order.shippingZip,
        shippingPhone: order.shippingPhone || undefined,
        paymentMethod: getPaymentMethodText(order.paymentMethod || ""),
        orderUrl: `${baseUrl}/pedidos`,
      });

      const admins = await storage.getAdminUsers();
      const { date, time } = formatDate(order.createdAt || new Date());

      for (const admin of admins) {
        await sendAdminNewOrderEmail(admin.email, {
          orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
          total: formatCurrency(total),
          statusClass: statusInfo.class,
          statusText: statusInfo.text,
          paymentMethod: getPaymentMethodText(order.paymentMethod || ""),
          customerName,
          customerEmail,
          customerPhone: order.shippingPhone || undefined,
          shippingName: customerName,
          shippingAddress: order.shippingAddress,
          shippingCity: order.shippingCity,
          shippingZip: order.shippingZip,
          shippingPhone: order.shippingPhone || undefined,
          items: formattedItems,
          subtotal: formatCurrency(subtotal),
          discount: discount > 0 ? formatCurrency(discount) : undefined,
          couponCode: order.couponCode || undefined,
          shipping: shipping > 0 ? formatCurrency(shipping) : "Grátis",
          shippingMethod: order.shippingMethod || "Padrão",
          adminUrl: `${baseUrl}/admin/pedidos`,
          orderDate: date,
          orderTime: time,
        });
      }
    } else if (oldStatus !== order.status) {
      await sendOrderStatusUpdateEmail(customerEmail, {
        customerName,
        orderNumber: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
        statusTitle: statusInfo.title,
        statusMessage: statusInfo.message,
        statusIcon: statusInfo.icon,
        statusClass: statusInfo.class,
        statusText: statusInfo.text,
        trackingCode: order.trackingCode || undefined,
        trackingUrl: (() => {
          if ((order as any).melhorEnvioCartId || (order.shippingMethod || "").toLowerCase().includes("melhor envio")) {
            const ref = (order as any).melhorEnvioProtocol || order.trackingCode;
            if (ref) return buildMelhorEnvioTrackingUrl(ref);
          }
          return order.trackingCode
            ? `https://www.linkcorreios.com.br/?id=${order.trackingCode}`
            : undefined;
        })(),
        orderUrl: `${baseUrl}/pedidos`,
      });
    }
  } catch (error) {
    console.error("Error sending order notifications:", error);
  }
};

const sendSupportNotification = async (
  ticketId: string,
  messageId: string,
  type: "new_ticket" | "new_message",
  baseUrl: string,
) => {
  try {
    const ticket = await storage.getSupportTicket(ticketId);
    if (!ticket) return;

    const messages = await storage.getTicketMessages(ticketId);
    const latestMessage = messages.find((m) => m.id === messageId);
    if (!latestMessage) return;

    const isNewTicket = type === "new_ticket";
    const emailData = {
      ticketId: ticket.id.slice(0, 8).toUpperCase(),
      ticketSubject: ticket.subject,
      senderName: latestMessage.senderName,
      senderEmail: latestMessage.senderEmail,
      messageContent: latestMessage.message,
      isNewTicket,
      ticketUrl: "",
    };

    // Notification logic: always send to the recipient, not the sender
    if (latestMessage.senderType === "customer") {
      // Message from customer -> notify admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        await sendSupportMessageEmail(admin.email, {
          ...emailData,
          ticketUrl: `${baseUrl}/admin/support/${ticket.id}`,
        });
      }
    } else if (latestMessage.senderType === "admin") {
      // Message from admin -> notify customer
      await sendSupportMessageEmail(ticket.customerEmail, {
        ...emailData,
        ticketUrl: `${baseUrl}/account/support?ticket=${ticket.id}`,
      });
    }

    console.log(`Support notification sent for ticket ${ticketId}`);
  } catch (error) {
    console.error("Error sending support notification:", error);
  }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  registerObjectStorageRoutes(app);

  app.post("/api/auth/register", registerRateLimiter, async (req, res, next) => {
    try {
      const { email, password, name } = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = generateToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Always set role to "customer" on self-registration — never allow client to set role
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: "customer",
      });

      await storage.updateUserEmailVerification(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      const baseUrl = getBaseUrl(req);
      const verificationUrl = `${baseUrl}/verificar-email?token=${verificationToken}`;

      await sendVerificationEmail(email, {
        name: name || "Cliente",
        verificationUrl,
      });

      // Link any guest orders placed with this email before account creation
      storage.linkGuestOrdersToUser(email, user.id).catch((e) =>
        console.error("Error linking guest orders:", e)
      );

      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: false,
          message:
            "Conta criada com sucesso. Verifique seu e-mail para ativar sua conta.",
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/auth/login", loginRateLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res
          .status(401)
          .json({ error: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.post("/api/auth/verify-email", async (req, res, next) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res
          .status(400)
          .json({ error: "Token de verificação é obrigatório" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ error: "Token de verificação inválido" });
      }

      if (
        user.emailVerificationExpires &&
        new Date() > user.emailVerificationExpires
      ) {
        return res
          .status(400)
          .json({ error: "Token de verificação expirado. Solicite um novo." });
      }

      await storage.updateUserEmailVerification(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      res.json({ message: "E-mail verificado com sucesso!" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/resend-verification", async (req, res, next) => {
    try {
      const sessionUser = req.user as any;
      const email = sessionUser?.email || req.body.email;

      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
      }

      const user = sessionUser
        ? sessionUser
        : await storage.getUserByEmail(email);

      if (!user) {
        return res.json({
          message:
            "Se o e-mail estiver cadastrado, você receberá um link de verificação.",
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: "Este e-mail já foi verificado" });
      }

      const verificationToken = generateToken();
      const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await storage.updateUserEmailVerification(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      const baseUrl = getBaseUrl(req);
      const verificationUrl = `${baseUrl}/verificar-email?token=${verificationToken}`;

      await sendVerificationEmail(email, {
        name: user.name || "Cliente",
        verificationUrl,
      });

      res.json({
        message:
          "Se o e-mail estiver cadastrado, você receberá um link de verificação.",
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/forgot-password", forgotPasswordRateLimiter, async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "E-mail é obrigatório" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.json({
          message:
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
        });
      }

      const resetToken = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await storage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      const baseUrl = getBaseUrl(req);
      const resetUrl = `${baseUrl}/redefinir-senha?token=${resetToken}`;

      await sendPasswordResetEmail(email, {
        name: user.name || "Cliente",
        resetUrl,
      });

      res.json({
        message:
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/reset-password", async (req, res, next) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res
          .status(400)
          .json({ error: "Token e nova senha são obrigatórios" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "A senha deve ter no mínimo 6 caracteres" });
      }

      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ error: "Token de redefinição inválido" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ error: "Este token já foi utilizado" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res
          .status(400)
          .json({ error: "Token de redefinição expirado. Solicite um novo." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ message: "Senha redefinida com sucesso!" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      phone: user.phone ?? null,
      personType: user.personType ?? "PF",
      cpf: user.cpf ?? null,
      cnpj: user.cnpj ?? null,
      razaoSocial: user.razaoSocial ?? null,
      inscricaoEstadual: user.inscricaoEstadual ?? null,
    });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { name, phone, personType, cpf, cnpj, razaoSocial, inscricaoEstadual } = req.body;

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = String(name).trim().slice(0, 200) || null;
      if (phone !== undefined) updateData.phone = phone ? String(phone).replace(/\D/g, "").slice(0, 15) || null : null;
      if (personType === "PF" || personType === "PJ") updateData.personType = personType;
      if (cpf !== undefined) updateData.cpf = cpf ? String(cpf).replace(/\D/g, "").slice(0, 11) || null : null;
      if (cnpj !== undefined) updateData.cnpj = cnpj ? String(cnpj).replace(/\D/g, "").slice(0, 14) || null : null;
      if (razaoSocial !== undefined) updateData.razaoSocial = razaoSocial ? String(razaoSocial).trim().slice(0, 300) || null : null;
      if (inscricaoEstadual !== undefined) updateData.inscricaoEstadual = inscricaoEstadual ? String(inscricaoEstadual).trim().slice(0, 100) || null : null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Nenhum dado para atualizar" });
      }

      const updated = await storage.updateUserProfile(user.id, updateData);
      if (!updated) return res.status(404).json({ error: "Usuário não encontrado" });

      // Refresh session user
      (req.user as any).name = updated.name;

      res.json({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        emailVerified: updated.emailVerified,
        phone: updated.phone ?? null,
        personType: updated.personType ?? "PF",
        cpf: updated.cpf ?? null,
        cnpj: updated.cnpj ?? null,
        razaoSocial: updated.razaoSocial ?? null,
        inscricaoEstadual: updated.inscricaoEstadual ?? null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/addresses", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const addresses = await storage.getUserAddresses(user.id);
      res.json(addresses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const address = await storage.getAddress(req.params.id);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }

      const user = req.user as any;
      if (address.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(address);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/addresses", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const data = insertAddressSchema.parse({ ...req.body, userId: user.id });
      const address = await storage.createAddress(data);
      res.status(201).json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const existingAddress = await storage.getAddress(req.params.id);
      if (!existingAddress) {
        return res.status(404).json({ error: "Address not found" });
      }

      const user = req.user as any;
      if (existingAddress.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { userId, isDefault, ...allowedFields } = req.body;
      const updateSchema = insertAddressSchema
        .partial()
        .omit({ userId: true, isDefault: true });
      const validatedData = updateSchema.parse(allowedFields);

      const address = await storage.updateAddress(req.params.id, validatedData);
      res.json(address);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/addresses/:id", requireAuth, async (req, res, next) => {
    try {
      const existingAddress = await storage.getAddress(req.params.id);
      if (!existingAddress) {
        return res.status(404).json({ error: "Address not found" });
      }

      const user = req.user as any;
      if (existingAddress.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const deleted = await storage.deleteAddress(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Address not found" });
      }
      res.json({ message: "Address deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/addresses/:id/default",
    requireAuth,
    async (req, res, next) => {
      try {
        const existingAddress = await storage.getAddress(req.params.id);
        if (!existingAddress) {
          return res.status(404).json({ error: "Address not found" });
        }

        const user = req.user as any;
        if (existingAddress.userId !== user.id) {
          return res.status(403).json({ error: "Access denied" });
        }

        await storage.setDefaultAddress(user.id, req.params.id);
        res.json({ message: "Default address updated" });
      } catch (error) {
        next(error);
      }
    },
  );

  // ============================================
  // GROUPS (Grupos)
  // ============================================

  app.get("/api/groups", async (_req, res, next) => {
    try {
      const allGroups = await storage.getAllGroups();
      res.json(allGroups);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/groups/:id", async (req, res, next) => {
    try {
      const group = await storage.getGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/groups", requireAdmin, async (req, res, next) => {
    try {
      const data = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(data);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/groups/:id", requireAdmin, async (req, res, next) => {
    try {
      const group = await storage.updateGroup(req.params.id, req.body);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/groups/:id", requireAdmin, async (req, res, next) => {
    try {
      const deleted = await storage.deleteGroup(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Group not found" });
      }
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // COLLECTIONS (Subgrupos)
  // ============================================

  app.get("/api/collections", async (_req, res, next) => {
    try {
      const [collections, allCashbackRules] = await Promise.all([
        storage.getAllCollections(),
        storage.getAllCashbackRules(),
      ]);
      const activeCashbackRules = allCashbackRules.filter(r => r.isActive);

      // Find best cashback % for a collection: 'all' rule > group rule > collection rule
      const enriched = collections.map((col) => {
        const allRule = activeCashbackRules.find(r => r.targetType === 'all');
        const groupRule = col.groupId
          ? activeCashbackRules.find(r => r.targetType === 'group' && r.targetId === col.groupId)
          : undefined;
        const colRule = activeCashbackRules.find(r => r.targetType === 'collection' && r.targetId === col.id);
        const best = allRule || groupRule || colRule;
        const cashbackPct = best ? parseFloat(best.percentage) : 0;
        return { ...col, cashbackPct: cashbackPct > 0 ? cashbackPct : null };
      });

      res.json(enriched);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/collections/:id", async (req, res, next) => {
    try {
      const collection = await storage.getCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/collections", requireAdmin, async (req, res, next) => {
    try {
      const data = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(data);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/collections/:id", requireAdmin, async (req, res, next) => {
    try {
      const collection = await storage.updateCollection(
        req.params.id,
        req.body,
      );
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/collections/:id", requireAdmin, async (req, res, next) => {
    try {
      const deleted = await storage.deleteCollection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json({ message: "Collection deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products", async (req, res, next) => {
    try {
      const { collectionId } = req.query;
      const isAdmin = req.isAuthenticated() && (req.user as any)?.isAdmin;
      const products = collectionId
        ? await storage.getProductsByCollection(collectionId as string, !isAdmin)
        : isAdmin
          ? await storage.getAllProducts()
          : await storage.getActiveProducts();

      const [activePromos, allCollections, allCashbackRules] = await Promise.all([
        fetchActivePromos(),
        storage.getAllCollections(),
        storage.getAllCashbackRules(),
      ]);
      const collectionGroupMap: Record<string, string> = {};
      for (const c of allCollections) {
        if (c.groupId) collectionGroupMap[c.id] = c.groupId;
      }
      const activeCashbackRules = allCashbackRules.filter(r => r.isActive);

      const enriched = products.map((p) => {
        const { effectivePrice, promoLabel, promoDiscountType, promoDiscountValue, displayPrice } = calcEffectivePrice(
          p,
          activePromos,
          collectionGroupMap,
        );
        const cashbackPct = calcCashbackPct(p, activeCashbackRules, collectionGroupMap);
        return {
          ...p,
          displayPrice: displayPrice.toFixed(2),
          promotionPrice: promoLabel ? effectivePrice.toFixed(2) : null,
          promoLabel,
          promoDiscountType,
          promoDiscountValue,
          cashbackPct: cashbackPct > 0 ? cashbackPct : null,
        };
      });

      res.json(enriched);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const [activePromos, allCollections, allCashbackRules] = await Promise.all([
        fetchActivePromos(),
        storage.getAllCollections(),
        storage.getAllCashbackRules(),
      ]);
      const collectionGroupMap: Record<string, string> = {};
      for (const c of allCollections) {
        if (c.groupId) collectionGroupMap[c.id] = c.groupId;
      }
      const activeCashbackRules = allCashbackRules.filter(r => r.isActive);
      const { effectivePrice, promoLabel, promoDiscountType, promoDiscountValue, displayPrice } = calcEffectivePrice(
        product,
        activePromos,
        collectionGroupMap,
      );
      const cashbackPct = calcCashbackPct(product, activeCashbackRules, collectionGroupMap);

      res.json({
        ...product,
        displayPrice: displayPrice.toFixed(2),
        promotionPrice: promoLabel ? effectivePrice.toFixed(2) : null,
        promoLabel,
        promoDiscountType,
        promoDiscountValue,
        cashbackPct: cashbackPct > 0 ? cashbackPct : null,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/products", requireAdmin, async (req, res, next) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res, next) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res, next) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // STOCK ALERTS
  // ============================================

  app.get("/api/admin/stock-alerts", requireAdmin, async (req, res, next) => {
    try {
      const outOfStockCount = await storage.getOutOfStockCount();
      const lowStockProducts = await storage.getLowStockProducts();
      res.json({ outOfStockCount, lowStockProducts });
    } catch (error) {
      next(error);
    }
  });

  // ============================================
  // KITS
  // ============================================

  app.get("/api/kits", async (req, res, next) => {
    try {
      if (req.query.withItems === 'true') {
        const kitsWithItems = await storage.getAllKitsWithItems();
        return res.json(kitsWithItems);
      }
      const allKits = await storage.getAllKits();
      res.json(allKits);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/kits/:id", async (req, res, next) => {
    try {
      const kit = await storage.getKitWithItems(req.params.id);
      if (!kit) {
        return res.status(404).json({ error: "Kit not found" });
      }
      res.json(kit);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/kits", requireAdmin, async (req, res, next) => {
    try {
      const { items, ...kitData } = req.body;
      const data = insertKitSchema.parse(kitData);
      const kitItems = (items || []).map((i: any) => insertKitItemSchema.partial().parse(i));
      const kit = await storage.createKit(data, kitItems);
      res.status(201).json(kit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/kits/:id", requireAdmin, async (req, res, next) => {
    try {
      const { items, ...kitData } = req.body;
      const kitItems = items !== undefined
        ? (items || []).map((i: any) => insertKitItemSchema.partial().parse(i))
        : undefined;
      const kit = await storage.updateKit(req.params.id, kitData, kitItems);
      if (!kit) {
        return res.status(404).json({ error: "Kit not found" });
      }
      res.json(kit);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/kits/:id", requireAdmin, async (req, res, next) => {
    try {
      const deleted = await storage.deleteKit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Kit not found" });
      }
      res.json({ message: "Kit deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/cart", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const items = await storage.getCartItems(user.id);

      const now = new Date();
      const allPromos = await storage.getAllPromotions();
      const activePromos = allPromos.filter((p: any) => {
        if (!p.isActive) return false;
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        return true;
      });
      const allCollections = await storage.getAllCollections();
      const collGroupMap: Record<string, string> = {};
      for (const c of allCollections) {
        if (c.groupId) collGroupMap[c.id] = c.groupId;
      }

      const enrichedItems = items.map((item: any) => {
        if (item.kitId && item.kit) {
          return item;
        }
        const { effectivePrice, promoLabel } = calcEffectivePrice(
          item.product,
          activePromos,
          collGroupMap,
          item.selectedSize,
        );
        return {
          ...item,
          effectivePrice: effectivePrice.toFixed(2),
          promoLabel,
        };
      });

      res.json(enrichedItems);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/cart", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { productId, quantity, selectedSize, kitId } = req.body;

      if (!productId || typeof productId !== "string") {
        return res.status(400).json({ error: "Valid productId is required" });
      }

      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(400).json({ error: "Product not found" });
      }

      if (kitId) {
        const kit = await storage.getKit(kitId);
        if (!kit) {
          return res.status(400).json({ error: "Kit not found" });
        }
      }

      const validQuantity = Math.min(Math.max(1, quantity || 1), 99);

      const item = await storage.addCartItem({
        userId: user.id,
        productId,
        quantity: validQuantity,
        selectedSize: selectedSize || null,
        kitId: kitId || null,
      });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/cart/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { quantity } = req.body;

      if (
        quantity === undefined ||
        quantity === null ||
        typeof quantity !== "number"
      ) {
        return res
          .status(400)
          .json({ error: "Quantity is required and must be a number" });
      }

      if (quantity < 1) {
        const deleted = await storage.removeCartItem(req.params.id, user.id);
        if (!deleted) {
          return res.status(404).json({ error: "Cart item not found" });
        }
        return res.json({ message: "Item removed from cart" });
      }

      const item = await storage.updateCartItemQuantity(
        req.params.id,
        user.id,
        quantity,
      );

      if (!item) {
        return res.status(404).json({ error: "Cart item not found" });
      }

      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/cart/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const deleted = await storage.removeCartItem(req.params.id, user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Cart item not found" });
      }
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/cart", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      await storage.clearCart(user.id);
      res.json({ message: "Cart cleared successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/cart/sync", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { items } = req.body;

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      if (items.length > 50) {
        return res.status(400).json({ error: "Too many items to sync" });
      }

      for (const item of items) {
        if (!item.productId || typeof item.productId !== "string") continue;
        if (!item.quantity || typeof item.quantity !== "number") continue;

        const product = await storage.getProduct(item.productId);
        if (!product) continue;

        if (item.kitId) {
          const kit = await storage.getKit(item.kitId);
          if (!kit) continue;
        }

        const validQuantity = Math.min(Math.max(1, item.quantity), 99);

        await storage.addCartItem({
          userId: user.id,
          productId: item.productId,
          quantity: validQuantity,
          selectedSize: item.selectedSize || null,
          kitId: item.kitId || null,
        });
      }

      const updatedCart = await storage.getCartItems(user.id);
      res.json(updatedCart);
    } catch (error) {
      next(error);
    }
  });

  const STORE_ORIGIN_ZIP = process.env.STORE_ORIGIN_ZIP || "36015260";

  app.post("/api/shipping/calculate", async (req, res, next) => {
    try {
      const { destinationZip, items } = req.body;

      if (!destinationZip) {
        return res.status(400).json({ error: "CEP de destino é obrigatório" });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ error: "Itens do carrinho são obrigatórios" });
      }

      const productData: Array<{
        weight: number;
        height: number;
        width: number;
        length: number;
        quantity: number;
      }> = [];

      for (const item of items) {
        if (item.kitId) {
          const kitWithItems = await storage.getKitWithItems(item.kitId);
          if (kitWithItems && kitWithItems.items) {
            for (const kitItem of kitWithItems.items) {
              if (kitItem.product) {
                productData.push({
                  weight: parseFloat(kitItem.product.weight || "0.5"),
                  height: parseFloat(kitItem.product.height || "10"),
                  width: parseFloat(kitItem.product.width || "15"),
                  length: parseFloat(kitItem.product.length || "20"),
                  quantity: (kitItem.quantity || 1) * Math.min(Math.max(1, item.quantity || 1), 99),
                });
              }
            }
          }
        } else {
          const product = await storage.getProduct(item.productId);
          if (!product) {
            return res
              .status(400)
              .json({ error: `Produto ${item.productId} não encontrado` });
          }

          productData.push({
            weight: parseFloat(product.weight || "0.5"),
            height: parseFloat(product.height || "10"),
            width: parseFloat(product.width || "15"),
            length: parseFloat(product.length || "20"),
            quantity: Math.min(Math.max(1, item.quantity || 1), 99),
          });
        }
      }

      const packageDimensions = calculatePackageDimensions(productData);

      const insuranceValue = parseFloat(String(req.body.subtotal || "0")) || 0;

      const correiosLocalEnabled =
        (process.env.CORREIOS_LOCAL_ENABLED || "true").toLowerCase() !== "false";

      const [correiosOptions, loggiOptions, melhorEnvioOptions] = await Promise.all([
        correiosLocalEnabled
          ? calculateShipping({
              originZip: STORE_ORIGIN_ZIP,
              destinationZip,
              ...packageDimensions,
            })
          : Promise.resolve([]),
        isLoggiEnabled()
          ? getLoggiQuote({
              originZip: STORE_ORIGIN_ZIP,
              destinationZip,
              packages: [{
                weight: packageDimensions.weight,
                height: packageDimensions.height,
                width: packageDimensions.width,
                length: packageDimensions.length,
              }],
            })
          : Promise.resolve([]),
        isMelhorEnvioEnabled()
          ? getMelhorEnvioQuote({
              originZip: STORE_ORIGIN_ZIP,
              destinationZip,
              packages: [{
                weight: packageDimensions.weight,
                height: packageDimensions.height,
                width: packageDimensions.width,
                length: packageDimensions.length,
              }],
              insuranceValue,
            })
          : Promise.resolve([]),
      ]);

      const allOptions = [...correiosOptions, ...loggiOptions, ...melhorEnvioOptions]
        .sort((a, b) => a.price - b.price);

      res.json({ options: allOptions, package: packageDimensions });
    } catch (error: any) {
      console.error("Shipping calculation error:", error);
      res
        .status(500)
        .json({ error: error.message || "Erro ao calcular frete" });
    }
  });

  app.get("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const orders = await storage.getUserOrders(user.id, user.email);
      const payments = await storage.getUserPayments(user.email);
      res.json({ orders, pendingPayments: payments.filter((p) => !p.orderId) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/stats", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const stats = await storage.getUserOrderStats(user.id);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req, res, next) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = req.user as any;
      if (order.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const items = await storage.getOrderItems(req.params.id);
      res.json({ order, items });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/orders/:id/items", requireAuth, async (req, res, next) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const user = req.user as any;
      if (order.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const items = await storage.getOrderItems(req.params.id);
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const {
        items,
        shippingInfo,
        fiscalData,
        shippingCost,
        shippingMethod,
        paymentMethod,
        cashbackDiscount,
        referralCode,
        useReferralReward,
        couponCode: reqCouponCode,
        couponId: reqCouponId,
      } = req.body;

      let serverSubtotal = 0;
      const validatedItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: string;
        selectedSize?: string | null;
      }> = [];

      const [activePromos, allCollections] = await Promise.all([
        fetchActivePromos(),
        storage.getAllCollections(),
      ]);
      const collGroupMap: Record<string, string> = {};
      for (const c of allCollections) {
        if (c.groupId) collGroupMap[c.id] = c.groupId;
      }

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const quantity = Math.min(
          Math.max(1, parseInt(item.quantity) || 1),
          99,
        );

        if (item.kitId) {
          const kitInfo = await resolveKitPrice(item.kitId, storage);
          if (!kitInfo) {
            return res.status(400).json({ error: `Kit ${item.kitId} not found` });
          }
          serverSubtotal += kitInfo.price * quantity;
          validatedItems.push({
            productId: product.id,
            productName: kitInfo.name,
            quantity,
            price: kitInfo.price.toFixed(2),
            selectedSize: null,
          });
        } else {
          const { effectivePrice } = calcEffectivePrice(product, activePromos, collGroupMap, item.selectedSize);
          serverSubtotal += effectivePrice * quantity;
          validatedItems.push({
            productId: product.id,
            productName: product.name,
            quantity,
            price: effectivePrice.toFixed(2),
            selectedSize: item.selectedSize || null,
          });
        }
      }

      const orderNumber = `${(process.env.ORDER_PREFIX || 'EG').toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      const shippingCostValue =
        typeof shippingCost === "number"
          ? shippingCost.toFixed(2)
          : shippingCost || "0";

      // Validate coupon server-side
      let couponDiscountAmount = 0;
      let validatedOrderCouponId: string | null = reqCouponId || null;
      let validatedOrderCouponCode: string | null = reqCouponCode || null;
      if (reqCouponCode) {
        try {
          const coupon = await storage.getCouponByCode(reqCouponCode);
          if (coupon && coupon.isActive) {
            const now = new Date();
            const isValid =
              (!coupon.startDate || new Date(coupon.startDate) <= now) &&
              (!coupon.expiresAt || new Date(coupon.expiresAt) >= now) &&
              (!coupon.maxUsageCount || coupon.currentUsageCount < coupon.maxUsageCount) &&
              (!coupon.minOrderAmount || serverSubtotal >= parseFloat(coupon.minOrderAmount));
            if (isValid) {
              let eligibleSubtotal = serverSubtotal;
              if (coupon.appliesTo === "products" && (coupon.productIds?.length ?? 0) > 0) {
                eligibleSubtotal = validatedItems.filter(it => coupon.productIds!.includes(it.productId)).reduce((s, it) => s + parseFloat(it.price) * it.quantity, 0);
              } else if (coupon.appliesTo === "collections" && (coupon.collectionIds?.length ?? 0) > 0) {
                eligibleSubtotal = 0;
                for (const it of validatedItems) {
                  const prod = await storage.getProduct(it.productId);
                  if (prod && coupon.collectionIds!.includes(prod.collectionId)) {
                    eligibleSubtotal += parseFloat(it.price) * it.quantity;
                  }
                }
              }
              if (coupon.discountType === "fixed") {
                couponDiscountAmount = Math.min(parseFloat(coupon.discountValue), eligibleSubtotal);
              } else {
                couponDiscountAmount = (eligibleSubtotal * parseFloat(coupon.discountValue)) / 100;
              }
              couponDiscountAmount = Math.round(couponDiscountAmount * 100) / 100;
              validatedOrderCouponId = coupon.id;
              validatedOrderCouponCode = coupon.code;
            }
          }
        } catch (couponErr) {
          console.error("Error validating coupon in /api/orders:", couponErr);
        }
      }

      // Validate and clamp cashback discount
      let cashbackAmount = 0;
      if (cashbackDiscount && cashbackDiscount > 0) {
        const userRecord = await storage.getUser(user.id);
        const balance = Number(userRecord?.cashbackBalance ?? 0);
        const maxDiscountPct = Number(await storage.getStoreSetting("cashback_max_discount_pct") ?? "100");
        const minPurchase = Number(await storage.getStoreSetting("cashback_min_purchase") ?? "0");
        const enabled = (await storage.getStoreSetting("cashback_enabled") ?? "true") === "true";
        const baseForCashback = Math.max(0, serverSubtotal - couponDiscountAmount);
        if (enabled && baseForCashback >= minPurchase && balance > 0) {
          const maxDiscount = (baseForCashback * maxDiscountPct) / 100;
          cashbackAmount = Math.min(balance, maxDiscount, cashbackDiscount);
          cashbackAmount = Math.round(cashbackAmount * 100) / 100;
        }
      }

      // Referral reward discount (referrer using their earned reward)
      // Base: product subtotal only, excluding shipping — consistent with MercadoPago
      let referralDiscountAmount = 0;
      let appliedReferralReward: any = null;
      if (useReferralReward) {
        const reward = await storage.getAvailableReferralReward(user.id);
        if (reward) {
          const minPurchase = Number(reward.minReferrerPurchase ?? 0);
          const baseForReferral = Math.max(0, serverSubtotal - couponDiscountAmount - cashbackAmount);
          if (baseForReferral >= minPurchase) {
            if (reward.rewardType === 'percentage') {
              referralDiscountAmount = (baseForReferral * Number(reward.rewardValue)) / 100;
            } else {
              referralDiscountAmount = Number(reward.rewardValue);
            }
            referralDiscountAmount = Math.min(referralDiscountAmount, baseForReferral);
            referralDiscountAmount = Math.round(referralDiscountAmount * 100) / 100;
            appliedReferralReward = reward;
          }
        }
      }

      // Referred person discount (first-time buyer using a referral code)
      // Base: product subtotal only, excluding shipping — consistent with MercadoPago
      let referredDiscountAmount = 0;
      if (referralCode) {
        try {
          const refEnabled = (await storage.getStoreSetting("referral_enabled") ?? "true") === "true";
          const refCode = await storage.getReferralCodeByCode(referralCode);
          if (refEnabled && refCode && refCode.userId !== user.id) {
            const previousOrders = await storage.getUserOrders(user.id);
            if (previousOrders.length === 0) {
              const referredRewardType = (await storage.getStoreSetting("referral_referred_reward_type")) ?? "percentage";
              const referredRewardValue = Number(await storage.getStoreSetting("referral_referred_reward_value") ?? "0");
              if (referredRewardValue > 0) {
                const baseAfterOtherDiscounts = Math.max(0, serverSubtotal - couponDiscountAmount - cashbackAmount - referralDiscountAmount);
                if (referredRewardType === 'percentage') {
                  referredDiscountAmount = (baseAfterOtherDiscounts * referredRewardValue) / 100;
                } else {
                  referredDiscountAmount = referredRewardValue;
                }
                referredDiscountAmount = Math.min(referredDiscountAmount, baseAfterOtherDiscounts);
                referredDiscountAmount = Math.round(referredDiscountAmount * 100) / 100;
              }
            }
          }
        } catch (e) {
          console.error("Error calculating referred discount:", e);
        }
      }

      const serverTotal = Math.max(0, serverSubtotal - couponDiscountAmount - cashbackAmount - referralDiscountAmount - referredDiscountAmount + parseFloat(shippingCostValue));
      const totalAllDiscountsOrd = couponDiscountAmount + cashbackAmount + referralDiscountAmount + referredDiscountAmount;

      const orderData = insertOrderSchema.parse({
        userId: user.id,
        orderNumber,
        totalAmount: serverTotal.toFixed(2),
        subtotalAmount: serverSubtotal.toFixed(2),
        discountAmount: totalAllDiscountsOrd > 0 ? totalAllDiscountsOrd.toFixed(2) : "0",
        couponDiscountAmount: couponDiscountAmount > 0 ? couponDiscountAmount.toFixed(2) : "0",
        cashbackDiscountAmount: cashbackAmount > 0 ? cashbackAmount.toFixed(2) : "0",
        referralDiscountAmount: referralDiscountAmount > 0 ? referralDiscountAmount.toFixed(2) : "0",
        referredDiscountAmount: referredDiscountAmount > 0 ? referredDiscountAmount.toFixed(2) : "0",
        couponCode: validatedOrderCouponCode || undefined,
        shippingCost: shippingCostValue,
        shippingMethod: shippingMethod || "Padrão",
        paymentMethod: paymentMethod || "Não especificado",
        status: "pending",
        ...shippingInfo,
        fiscalPersonType: fiscalData?.personType || null,
        fiscalCpf: fiscalData?.cpf || null,
        fiscalCnpj: fiscalData?.cnpj || null,
        fiscalRazaoSocial: fiscalData?.razaoSocial || null,
        fiscalInscricaoEstadual: fiscalData?.inscricaoEstadual || null,
      });

      const orderItems = validatedItems.map((item: any) =>
        insertOrderItemSchema.parse({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize || null,
        }),
      );

      const order = await storage.createOrder(orderData, orderItems);

      // Increment coupon usage if applicable
      if (validatedOrderCouponId && couponDiscountAmount > 0) {
        storage.incrementCouponUsage(validatedOrderCouponId).catch((e: Error) => console.error("Error incrementing coupon (orders):", e));
      }

      // Deduct cashback balance if used
      if (cashbackAmount > 0) {
        try {
          await storage.addCashbackTransaction({
            userId: user.id,
            orderId: order.id,
            type: 'spent',
            amount: String(cashbackAmount),
            description: `Cashback usado no pedido #${orderNumber}`,
          });
          await storage.updateUserCashbackBalance(user.id, -cashbackAmount);
        } catch (cbErr) {
          console.error("Error deducting cashback:", cbErr);
        }
      }

      // Mark referral reward as used
      if (appliedReferralReward) {
        try {
          await storage.useReferralReward(appliedReferralReward.id, order.id);
        } catch (refErr) {
          console.error("Error marking referral reward as used:", refErr);
        }
      }

      // Process referral code if buyer was referred (async, non-blocking)
      if (referralCode) {
        storage.processReferralForOrder(
          order.id,
          referralCode,
          shippingInfo.shippingEmail,
          user.id,
          serverSubtotal,
        ).catch(e => console.error("Error processing referral:", e));
      }

      await storage.clearCart(user.id);

      // Decrement stock for all items
      const sizedItems = validatedItems
        .filter(i => i.selectedSize)
        .map(i => ({ productId: i.productId, size: i.selectedSize!, quantity: i.quantity }));
      if (sizedItems.length > 0) {
        storage.decrementSizeStock(sizedItems).catch(console.error);
      }
      for (const item of validatedItems) {
        if (!item.selectedSize) {
          storage.decrementSimpleProductStock(item.productId, item.quantity).catch(console.error);
        }
      }

      // Check & send low stock alerts (non-blocking)
      triggerLowStockAlerts(storage).catch(console.error);

      const baseUrl = getBaseUrl(req);
      sendOrderNotifications(order.id, baseUrl, true).catch(console.error);

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/orders/guest", async (req, res, next) => {
    try {
      const {
        items,
        shippingInfo,
        fiscalData,
        totalAmount,
        shippingCost,
        shippingMethod,
        paymentMethod,
      } = req.body;

      if (
        !shippingInfo.shippingName ||
        !shippingInfo.shippingEmail ||
        !shippingInfo.shippingAddress ||
        !shippingInfo.shippingCity ||
        !shippingInfo.shippingZip ||
        !shippingInfo.shippingCountry
      ) {
        return res
          .status(400)
          .json({ error: "Missing required shipping information" });
      }

      let serverSubtotal = 0;
      const validatedItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: string;
        selectedSize?: string | null;
      }> = [];

      const [activePromosGuest, allCollectionsGuest] = await Promise.all([
        fetchActivePromos(),
        storage.getAllCollections(),
      ]);
      const collGroupMapGuest: Record<string, string> = {};
      for (const c of allCollectionsGuest) {
        if (c.groupId) collGroupMapGuest[c.id] = c.groupId;
      }

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const quantity = Math.min(
          Math.max(1, parseInt(item.quantity) || 1),
          99,
        );

        if (item.kitId) {
          const kitInfo = await resolveKitPrice(item.kitId, storage);
          if (!kitInfo) {
            return res.status(400).json({ error: `Kit ${item.kitId} not found` });
          }
          serverSubtotal += kitInfo.price * quantity;
          validatedItems.push({
            productId: product.id,
            productName: kitInfo.name,
            quantity,
            price: kitInfo.price.toFixed(2),
            selectedSize: null,
          });
        } else {
          const { effectivePrice: guestEffPrice } = calcEffectivePrice(product, activePromosGuest, collGroupMapGuest, item.selectedSize);
          serverSubtotal += guestEffPrice * quantity;
          validatedItems.push({
            productId: product.id,
            productName: product.name,
            quantity,
            price: guestEffPrice.toFixed(2),
            selectedSize: item.selectedSize || null,
          });
        }
      }

      const orderNumber = `${(process.env.ORDER_PREFIX || 'EG').toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      const shippingCostValue =
        typeof shippingCost === "number"
          ? shippingCost.toFixed(2)
          : shippingCost || "0";
      const serverTotal = serverSubtotal + parseFloat(shippingCostValue);

      const orderItems = validatedItems.map((item: any) =>
        insertOrderItemSchema.parse({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          selectedSize: item.selectedSize || null,
        }),
      );

      const order = await storage.createGuestOrder(
        {
          orderNumber,
          totalAmount: serverTotal.toFixed(2),
          subtotalAmount: serverSubtotal.toFixed(2),
          shippingCost: shippingCostValue,
          shippingMethod: shippingMethod || "Padrão",
          paymentMethod: paymentMethod || "Não especificado",
          status: "pending",
          shippingName: shippingInfo.shippingName,
          shippingEmail: shippingInfo.shippingEmail,
          shippingAddress: shippingInfo.shippingAddress,
          shippingCity: shippingInfo.shippingCity,
          shippingZip: shippingInfo.shippingZip,
          shippingCountry: shippingInfo.shippingCountry,
          shippingPhone: shippingInfo.shippingPhone || null,
          fiscalPersonType: fiscalData?.personType || null,
          fiscalCpf: fiscalData?.cpf || null,
          fiscalCnpj: fiscalData?.cnpj || null,
          fiscalRazaoSocial: fiscalData?.razaoSocial || null,
          fiscalInscricaoEstadual: fiscalData?.inscricaoEstadual || null,
        } as any,
        orderItems,
      );

      // Decrement stock for all items
      const guestSizedItems = orderItems
        .filter((i: any) => i.selectedSize)
        .map((i: any) => ({ productId: i.productId, size: i.selectedSize!, quantity: i.quantity }));
      if (guestSizedItems.length > 0) {
        storage.decrementSizeStock(guestSizedItems).catch(console.error);
      }
      for (const item of orderItems as any[]) {
        if (!item.selectedSize) {
          storage.decrementSimpleProductStock(item.productId, item.quantity).catch(console.error);
        }
      }
      triggerLowStockAlerts(storage).catch(console.error);

      const baseUrl = getBaseUrl(req);
      sendOrderNotifications(order.id, baseUrl, true).catch(console.error);

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.get("/api/orders/guest/:id", async (req, res, next) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.userId !== null) {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/orders/:id/status", requireAdmin, async (req, res, next) => {
    try {
      const { status, trackingCode } = req.body;

      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      const oldStatus = existingOrder.status;
      const order = await storage.updateOrderStatus(
        req.params.id,
        status,
        trackingCode,
      );

      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Reverse cashback if order is cancelled
      if (status === 'cancelled' && oldStatus !== 'cancelled' && order.userId) {
        storage.reverseCashbackForOrder(order.id, order.userId).catch(console.error);
      }

      const baseUrl = getBaseUrl(req);
      sendOrderNotifications(order.id, baseUrl, false, oldStatus).catch(
        console.error,
      );

      res.json(order);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/config", (req, res) => {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    res.json({
      configured: isMercadoPagoConfigured(),
      publicKey: process.env.MERCADOPAGO_PUBLIC_KEY || null,
      isSandbox: accessToken.startsWith('TEST-'),
    });
  });

  app.post("/api/payments/preference", async (req, res, next) => {
    try {
      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ error: "Payment system not configured" });
      }

      const {
        productIds,
        payer,
        shippingInfo,
        fiscalData: clientFiscalData,
        shippingCost: clientShippingCost,
        shippingMethod,
        couponCode,
        cashbackDiscount: clientCashbackDiscount,
        referralCode: clientReferralCode,
        useReferralReward: clientUseReferralReward,
        referredDiscount: clientReferredDiscount,
      } = req.body;

      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return res.status(400).json({ error: "Product IDs are required" });
      }

      const validatedItems: Array<{
        title: string;
        quantity: number;
        unit_price: number;
        productId: string;
        selectedSize?: string | null;
      }> = [];
      let subtotal = 0;

      const [activePromosPref, allCollectionsPref] = await Promise.all([
        fetchActivePromos(),
        storage.getAllCollections(),
      ]);
      const collGroupMapPref: Record<string, string> = {};
      for (const c of allCollectionsPref) {
        if (c.groupId) collGroupMapPref[c.id] = c.groupId;
      }

      for (const item of productIds) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const quantity = Math.min(
          Math.max(1, parseInt(item.quantity) || 1),
          99,
        );

        if (item.kitId) {
          const kitInfo = await resolveKitPrice(item.kitId, storage);
          if (!kitInfo) {
            return res.status(400).json({ error: `Kit ${item.kitId} not found` });
          }
          subtotal += kitInfo.price * quantity;
          validatedItems.push({
            title: kitInfo.name,
            quantity,
            unit_price: kitInfo.price,
            productId: product.id,
            selectedSize: null,
          });
        } else {
          const { effectivePrice: prefEffPrice } = calcEffectivePrice(product, activePromosPref, collGroupMapPref, item.selectedSize);
          subtotal += prefEffPrice * quantity;
          validatedItems.push({
            title: product.name,
            quantity,
            unit_price: prefEffPrice,
            productId: product.id,
            selectedSize: item.selectedSize || null,
          });
        }
      }

      // Validate and apply coupon discount on server side
      let discountAmount = 0;
      let validatedCoupon: {
        id: string;
        code: string;
        discountType: string;
        discountValue: string;
        freeShipping?: boolean;
      } | null = null;

      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode);
        if (coupon && coupon.isActive) {
          const now = new Date();
          const isValid =
            (!coupon.startDate || new Date(coupon.startDate) <= now) &&
            (!coupon.expiresAt || new Date(coupon.expiresAt) >= now) &&
            (!coupon.maxUsageCount ||
              coupon.currentUsageCount < coupon.maxUsageCount) &&
            (!coupon.minOrderAmount ||
              subtotal >= parseFloat(coupon.minOrderAmount));

          if (isValid) {
            // Calculate eligible subtotal based on coupon restrictions
            let eligibleSubtotal = subtotal;
            if (
              coupon.appliesTo === "products" &&
              coupon.productIds &&
              coupon.productIds.length > 0
            ) {
              eligibleSubtotal = 0;
              for (const item of validatedItems) {
                if (coupon.productIds.includes(item.productId)) {
                  eligibleSubtotal += item.unit_price * item.quantity;
                }
              }
            } else if (
              coupon.appliesTo === "collections" &&
              coupon.collectionIds &&
              coupon.collectionIds.length > 0
            ) {
              eligibleSubtotal = 0;
              for (const item of validatedItems) {
                const product = await storage.getProduct(item.productId);
                if (
                  product &&
                  coupon.collectionIds.includes(product.collectionId)
                ) {
                  eligibleSubtotal += item.unit_price * item.quantity;
                }
              }
            }

            if (coupon.discountType === "fixed") {
              discountAmount = Math.min(
                parseFloat(coupon.discountValue),
                eligibleSubtotal,
              );
            } else {
              discountAmount =
                (eligibleSubtotal * parseFloat(coupon.discountValue)) / 100;
            }

            validatedCoupon = {
              id: coupon.id,
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              freeShipping: coupon.freeShipping || false,
            };
          }
        }
      }

      // Determine shipping cost (may be free due to coupon or threshold)
      let shippingCost =
        typeof clientShippingCost === "number" && clientShippingCost >= 0
          ? clientShippingCost
          : 25;
      if (validatedCoupon?.freeShipping) {
        shippingCost = 0;
      }

      // Validate and clamp cashback discount
      const prefUser = req.user as any;
      let validatedCashback = 0;
      if (prefUser && clientCashbackDiscount > 0) {
        try {
          const userRecord = await storage.getUser(prefUser.id);
          const balance = Number(userRecord?.cashbackBalance ?? 0);
          const cbEnabled = (await storage.getStoreSetting("cashback_enabled") ?? "true") === "true";
          const cbMinPurchase = Number(await storage.getStoreSetting("cashback_min_purchase") ?? "0");
          const cbMaxPct = Number(await storage.getStoreSetting("cashback_max_discount_pct") ?? "100");
          const baseForCb = Math.max(0, subtotal - discountAmount);
          if (cbEnabled && baseForCb >= cbMinPurchase && balance > 0) {
            const maxCb = (baseForCb * cbMaxPct) / 100;
            validatedCashback = Math.round(Math.min(balance, maxCb, clientCashbackDiscount) * 100) / 100;
          }
        } catch (e) {
          console.error("Cashback validation error in preference:", e);
        }
      }

      // Validate referral reward (referrer using their earned reward)
      let validatedReferralReward = 0;
      let appliedReferralRewardId: string | null = null;
      if (prefUser && clientUseReferralReward) {
        try {
          const refEnabled = (await storage.getStoreSetting("referral_enabled") ?? "true") === "true";
          if (refEnabled) {
            const reward = await storage.getAvailableReferralReward(prefUser.id);
            if (reward) {
              const minP = Number(reward.minReferrerPurchase ?? 0);
              const baseAfterCb = Math.max(0, subtotal - discountAmount - validatedCashback);
              if (baseAfterCb >= minP) {
                if (reward.rewardType === 'percentage') {
                  validatedReferralReward = Math.min(baseAfterCb, (baseAfterCb * Number(reward.rewardValue)) / 100);
                } else {
                  validatedReferralReward = Math.min(baseAfterCb, Number(reward.rewardValue));
                }
                validatedReferralReward = Math.round(validatedReferralReward * 100) / 100;
                appliedReferralRewardId = reward.id;
              }
            }
          }
        } catch (e) {
          console.error("Referral reward validation error in preference:", e);
        }
      }

      // Validate referred (first-time buyer) discount
      let validatedReferredDiscount = 0;
      if (prefUser && clientReferralCode && clientReferredDiscount > 0) {
        try {
          const refEnabled = (await storage.getStoreSetting("referral_enabled") ?? "true") === "true";
          const refCode = await storage.getReferralCodeByCode(clientReferralCode);
          if (refEnabled && refCode && refCode.userId !== prefUser.id) {
            const prevOrders = await storage.getUserOrders(prefUser.id);
            if (prevOrders.length === 0) {
              const referredType = (await storage.getStoreSetting("referral_referred_reward_type")) ?? "percentage";
              const referredVal = Number(await storage.getStoreSetting("referral_referred_reward_value") ?? "0");
              if (referredVal > 0) {
                const baseAfterAll = Math.max(0, subtotal - discountAmount - validatedCashback - validatedReferralReward);
                if (referredType === 'percentage') {
                  validatedReferredDiscount = Math.min(baseAfterAll, (baseAfterAll * referredVal) / 100);
                } else {
                  validatedReferredDiscount = Math.min(baseAfterAll, referredVal);
                }
                validatedReferredDiscount = Math.round(validatedReferredDiscount * 100) / 100;
              }
            }
          }
        } catch (e) {
          console.error("Referred discount validation error in preference:", e);
        }
      }

      const totalCrmDiscount = validatedCashback + validatedReferralReward + validatedReferredDiscount;

      // Calculate final total
      const serverTotal = Math.max(0, subtotal - discountAmount - totalCrmDiscount + shippingCost);

      const externalReference = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Build items array - always show each product individually on MP's checkout page
      let mpItems: Array<{
        title: string;
        quantity: number;
        unit_price: number;
        currency_id: string;
      }> = [];

      const totalAllDiscounts = discountAmount + totalCrmDiscount;
      const targetProductCents = Math.round((subtotal - totalAllDiscounts) * 100);
      const subtotalCents = Math.round(subtotal * 100);

      if (totalAllDiscounts > 0 && subtotal > 0 && subtotalCents > 0) {
        // Distribute discount proportionally across items.
        // Use quantity=1 with total-per-line to guarantee exact cent totals.
        // Last item absorbs any rounding difference.
        let runningCents = 0;
        const lastIdx = validatedItems.length - 1;

        mpItems = validatedItems.map((item, idx) => {
          const originalItemCents = Math.round(item.unit_price * 100) * item.quantity;
          let discountedCents: number;

          if (idx === lastIdx) {
            // Last item absorbs rounding difference to guarantee exact total
            discountedCents = targetProductCents - runningCents;
          } else {
            discountedCents = Math.round((originalItemCents * targetProductCents) / subtotalCents);
            runningCents += discountedCents;
          }

          const title = item.quantity > 1
            ? `${item.title} (x${item.quantity})`
            : item.title;

          return {
            title,
            quantity: 1,
            unit_price: discountedCents / 100,
            currency_id: "BRL",
          };
        });
      } else {
        mpItems = validatedItems.map((item) => ({
          title: item.quantity > 1 ? `${item.title} (x${item.quantity})` : item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: "BRL",
        }));
      }

      // Add shipping as a separate item if cost > 0
      if (shippingCost > 0) {
        mpItems.push({
          title: `Frete (${shippingMethod || "PAC"})`,
          quantity: 1,
          unit_price: shippingCost,
          currency_id: "BRL",
        });
      }

      // Final validation: ensure MP total matches serverTotal EXACTLY
      const mpTotalCents = mpItems.reduce(
        (sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity,
        0,
      );
      const serverTotalCents = Math.round(serverTotal * 100);

      if (mpTotalCents !== serverTotalCents) {
        console.error(
          `Critical: MP total ${mpTotalCents} cents does not match server total ${serverTotalCents} cents`,
        );
        return res
          .status(500)
          .json({
            error: "Payment total calculation error. Please try again.",
          });
      }

      const preference = await createPaymentPreference({
        items: mpItems,
        external_reference: externalReference,
      });

      // Check if user is authenticated
      const user = req.user as any;

      const pendingOrderData = JSON.stringify({
        shippingInfo,
        fiscalData: clientFiscalData || null,
        shippingCost,
        shippingMethod: shippingMethod || "PAC",
        userId: user?.id || null,
        couponCode: validatedCoupon?.code || null,
        couponId: validatedCoupon?.id || null,
        discountAmount: discountAmount,
        subtotal: subtotal,
        cashbackDiscount: validatedCashback,
        referralRewardAmount: validatedReferralReward,
        referralCode: clientReferralCode || null,
        useReferralReward: !!clientUseReferralReward,
        referralRewardId: appliedReferralRewardId,
        referredDiscount: validatedReferredDiscount,
        items: validatedItems.map((item) => ({
          productId: item.productId,
          productName: item.title,
          quantity: item.quantity,
          price: item.unit_price.toFixed(2),
          selectedSize: item.selectedSize,
        })),
      });

      const payment = await storage.createPayment({
        orderId: null,
        preferenceId: preference.id || null,
        status: "pending",
        amount: serverTotal.toFixed(2),
        currency: "BRL",
        payerEmail: payer?.email || null,
        payerName: payer?.name || null,
        externalReference,
        pendingOrderData,
        userId: user?.id || null,
      });

      res.json({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        paymentId: payment.id,
        externalReference,
        serverTotal,
      });
    } catch (error: any) {
      console.error("Error creating preference:", error);
      res
        .status(500)
        .json({
          error: error.message || "Failed to create payment preference",
        });
    }
  });

  // Retry payment - create new preference for pending payment
  app.post("/api/payments/:paymentId/retry", async (req, res, next) => {
    try {
      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ error: "Payment system not configured" });
      }

      const { paymentId } = req.params;
      const payment = await storage.getPayment(paymentId);

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Ownership check: only the payment owner or an admin can retry
      const reqUser = req.isAuthenticated() ? (req.user as any) : null;
      const isOwner = reqUser && (payment.userId === reqUser.id || payment.payerEmail === reqUser.email);
      const isAdmin = reqUser?.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!payment.pendingOrderData) {
        return res.status(400).json({ error: "No pending order data found" });
      }

      if (payment.status === "approved") {
        return res.status(400).json({ error: "Payment already completed" });
      }

      const pendingData = JSON.parse(payment.pendingOrderData);
      const {
        shippingInfo,
        items,
        shippingCost: savedShippingCost,
        shippingMethod,
        discountAmount: savedDiscount,
        subtotal: savedSubtotal,
      } = pendingData;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items in pending order" });
      }

      // Use saved prices from original order to ensure consistency
      const validatedItems: Array<{
        title: string;
        quantity: number;
        unit_price: number;
        productId: string;
        selectedSize?: string | null;
      }> = [];
      let subtotal = 0;

      for (const item of items) {
        // Validate product still exists
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const quantity = Math.min(
          Math.max(1, parseInt(item.quantity) || 1),
          99,
        );
        // Use saved price from original order, not current catalog price
        const savedPrice = parseFloat(item.price);
        subtotal += savedPrice * quantity;
        validatedItems.push({
          title: item.productName || product.name,
          quantity,
          unit_price: savedPrice,
          productId: product.id,
          selectedSize: item.selectedSize || null,
        });
      }

      // Use saved subtotal if available and consistent, otherwise use calculated
      const finalSubtotal =
        typeof savedSubtotal === "number" && savedSubtotal > 0
          ? savedSubtotal
          : subtotal;

      // Use saved discount and shipping from original order
      const discountAmount =
        typeof savedDiscount === "number" && savedDiscount >= 0
          ? savedDiscount
          : 0;
      const shippingCost =
        typeof savedShippingCost === "number" && savedShippingCost >= 0
          ? savedShippingCost
          : 25;
      const serverTotal = Math.max(
        0,
        finalSubtotal - discountAmount + shippingCost,
      );

      const externalReference = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Build items array - always show each product individually on MP's checkout page
      let preferenceItems: Array<{
        title: string;
        quantity: number;
        unit_price: number;
        currency_id: string;
      }> = [];

      const retryTargetProductCents = Math.round((finalSubtotal - discountAmount) * 100);
      const retrySubtotalCents = Math.round(finalSubtotal * 100);

      if (discountAmount > 0 && finalSubtotal > 0 && retrySubtotalCents > 0) {
        // Distribute discount proportionally across items
        let runningCents = 0;
        const lastIdx = validatedItems.length - 1;

        preferenceItems = validatedItems.map((item, idx) => {
          const originalItemCents = Math.round(item.unit_price * 100) * item.quantity;
          let discountedCents: number;

          if (idx === lastIdx) {
            discountedCents = retryTargetProductCents - runningCents;
          } else {
            discountedCents = Math.round((originalItemCents * retryTargetProductCents) / retrySubtotalCents);
            runningCents += discountedCents;
          }

          return {
            title: item.quantity > 1 ? `${item.title} (x${item.quantity})` : item.title,
            quantity: 1,
            unit_price: discountedCents / 100,
            currency_id: "BRL",
          };
        });
      } else {
        preferenceItems = validatedItems.map((item) => ({
          title: item.quantity > 1 ? `${item.title} (x${item.quantity})` : item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: "BRL",
        }));
      }

      if (shippingCost > 0) {
        preferenceItems.push({
          title: `Frete (${shippingMethod || "Padrão"})`,
          quantity: 1,
          unit_price: shippingCost,
          currency_id: "BRL",
        });
      }

      // Final validation: ensure MP total matches serverTotal EXACTLY
      const mpTotalCents = preferenceItems.reduce(
        (sum, item) => sum + Math.round(item.unit_price * 100) * item.quantity,
        0,
      );
      const serverTotalCents = Math.round(serverTotal * 100);

      if (mpTotalCents !== serverTotalCents) {
        console.error(
          `Critical: Retry MP total ${mpTotalCents} cents does not match server total ${serverTotalCents} cents`,
        );
        return res
          .status(500)
          .json({
            error: "Payment total calculation error. Please try again.",
          });
      }

      const preference = await createPaymentPreference({
        items: preferenceItems,
        external_reference: externalReference,
      });

      // Update the existing payment with new preference
      await storage.updatePayment(payment.id, {
        preferenceId: preference.id || null,
        externalReference,
        status: "pending",
      });

      res.json({
        preferenceId: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
        paymentId: payment.id,
        externalReference,
        serverTotal,
      });
    } catch (error: any) {
      console.error("Error retrying payment:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to retry payment" });
    }
  });

  app.post("/api/payments/webhook", async (req, res, next) => {
    const xSignature = req.headers["x-signature"] as string | undefined;
    const xRequestId = req.headers["x-request-id"] as string | undefined;
    const dataId = req.body.data?.id?.toString();
    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (webhookSecret && xSignature && xRequestId && dataId) {
      const isValid = verifyMercadoPagoSignature(
        xSignature,
        xRequestId,
        dataId,
        webhookSecret,
      );
      if (!isValid) {
        console.error("Webhook signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
      }
      console.log("Webhook signature verified successfully");
    } else if (webhookSecret && (!xSignature || !xRequestId)) {
      console.warn(
        "Webhook received without signature headers, but secret is configured",
      );
    } else if (!webhookSecret) {
      console.warn(
        "MERCADOPAGO_WEBHOOK_SECRET not configured - webhook signature validation disabled",
      );
    }

    res.sendStatus(200);

    try {
      console.log("Webhook received:", JSON.stringify(req.body, null, 2));

      const { action, data, type } = req.body;

      if (type === "payment" && data?.id) {
        await processPaymentWebhook(data.id.toString(), storage);
      }

      if (action === "payment.created" || action === "payment.updated") {
        if (data?.id) {
          await processPaymentWebhook(data.id.toString(), storage);
        }
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
    }
  });

  function verifyMercadoPagoSignature(
    signature: string,
    xRequestId: string,
    dataId: string,
    secret: string,
  ): boolean {
    try {
      const parts = signature.split(",");
      let ts: string | undefined;
      let hash: string | undefined;

      parts.forEach((part) => {
        const [key, value] = part.split("=");
        if (key && value) {
          if (key.trim() === "ts") {
            ts = value.trim();
          } else if (key.trim() === "v1") {
            hash = value.trim();
          }
        }
      });

      if (!ts || !hash) {
        console.error("Invalid signature format: missing ts or v1");
        return false;
      }

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      const calculatedSignature = crypto
        .createHmac("sha256", secret)
        .update(manifest)
        .digest("hex");

      // Use timing-safe comparison to prevent timing attacks
      if (hash.length !== calculatedSignature.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(hash, "hex"),
        Buffer.from(calculatedSignature, "hex"),
      );
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  }

  async function processPaymentWebhook(paymentId: string, storage: any) {
    try {
      console.log(`Processing payment webhook for ID: ${paymentId}`);

      const paymentDetails = await getPaymentDetails(paymentId);
      console.log(
        "Payment details from MP:",
        JSON.stringify(paymentDetails, null, 2),
      );

      if (!paymentDetails.external_reference) {
        console.log("No external reference found, skipping");
        return;
      }

      const existingPayment = await storage.getPaymentByExternalReference(
        paymentDetails.external_reference,
      );

      if (!existingPayment) {
        console.log(
          `No payment found for external reference: ${paymentDetails.external_reference}`,
        );
        return;
      }

      console.log(
        `Found payment in DB: ${existingPayment.id}, current status: ${existingPayment.status}`,
      );

      await storage.updatePayment(existingPayment.id, {
        mercadoPagoId: paymentDetails.id,
        status: paymentDetails.status || "unknown",
        statusDetail: paymentDetails.status_detail || null,
        paymentMethod: paymentDetails.payment_method_id || null,
        paymentType: paymentDetails.payment_type_id || null,
        payerEmail: paymentDetails.payer?.email || existingPayment.payerEmail,
      });

      console.log(`Updated payment status to: ${paymentDetails.status}`);

      if (existingPayment.orderId && paymentDetails.status === "approved") {
        await storage.updateOrderStatus(existingPayment.orderId, "processing");
        console.log(`Updated order ${existingPayment.orderId} to processing`);

        // Send payment confirmation emails
        const protocol = "https";
        const host = process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
        const baseUrl = `${protocol}://${host}`;
        sendOrderNotifications(existingPayment.orderId, baseUrl, true).catch(
          console.error,
        );
        console.log(
          `Sent payment confirmation emails for order ${existingPayment.orderId}`,
        );
        return;
      }

      if (
        !existingPayment.orderId &&
        paymentDetails.status === "approved" &&
        existingPayment.pendingOrderData
      ) {
        console.log(
          "Payment approved and no order exists, creating order from webhook...",
        );

        try {
          const pendingData = JSON.parse(existingPayment.pendingOrderData);
          const {
            shippingInfo,
            fiscalData: savedFiscalData,
            items,
            shippingCost: savedShippingCost,
            shippingMethod: savedShippingMethod,
            userId: savedUserId,
            couponCode: savedCouponCode,
            couponId: savedCouponId,
            discountAmount: savedDiscountAmount,
            subtotal: savedSubtotal,
            cashbackDiscount: savedCashbackDiscount,
            referralRewardAmount: savedReferralRewardAmount,
            referralCode: savedReferralCode,
            useReferralReward: savedUseReferralReward,
            referralRewardId: savedReferralRewardId,
            referredDiscount: savedReferredDiscount,
          } = pendingData;

          if (!shippingInfo || !items || items.length === 0) {
            console.error("Incomplete pending order data");
            return;
          }

          // Use saved prices from original order to ensure consistency
          let calculatedSubtotal = 0;
          const validatedItems: Array<{
            productId: string;
            productName: string;
            quantity: number;
            price: string;
            orderId: string;
            selectedSize?: string | null;
          }> = [];

          for (const item of items) {
            const product = await storage.getProduct(item.productId);
            if (!product) {
              console.error(`Product ${item.productId} not found`);
              return;
            }
            const quantity = Math.min(
              Math.max(1, parseInt(item.quantity) || 1),
              99,
            );
            // Use saved price from original order, not current catalog price
            const savedPrice = item.price
              ? parseFloat(item.price)
              : parseFloat(product.price);
            calculatedSubtotal += savedPrice * quantity;
            validatedItems.push({
              productId: product.id,
              productName: item.productName || product.name,
              quantity,
              price: savedPrice.toFixed(2),
              orderId: "",
              selectedSize: item.selectedSize || null,
            });
          }

          // Use saved subtotal if available, otherwise use calculated
          const subtotal =
            typeof savedSubtotal === "number" && savedSubtotal > 0
              ? savedSubtotal
              : calculatedSubtotal;

          // Apply saved discounts (coupon + cashback + referral reward + referred discount)
          const couponDiscount =
            typeof savedDiscountAmount === "number" && savedDiscountAmount >= 0
              ? savedDiscountAmount
              : 0;
          const cbDiscount = typeof savedCashbackDiscount === "number" && savedCashbackDiscount >= 0 ? savedCashbackDiscount : 0;
          const refRewardDiscount = typeof savedReferralRewardAmount === "number" && savedReferralRewardAmount >= 0 ? savedReferralRewardAmount : 0;
          const refReferredDiscount = typeof savedReferredDiscount === "number" && savedReferredDiscount >= 0 ? savedReferredDiscount : 0;
          const totalAllDiscounts = couponDiscount + cbDiscount + refRewardDiscount + refReferredDiscount;

          const shippingCost =
            typeof savedShippingCost === "number" && savedShippingCost >= 0
              ? savedShippingCost
              : 25;
          const serverTotal = Math.max(
            0,
            subtotal - totalAllDiscounts + shippingCost,
          );

          // Increment coupon usage if a coupon was used
          if (savedCouponId) {
            try {
              await storage.incrementCouponUsage(savedCouponId);
              console.log(`Incremented usage for coupon ${savedCouponId}`);
            } catch (couponErr) {
              console.error("Error incrementing coupon usage:", couponErr);
            }
          }

          // Fallback: if userId not in session/payment, look up by shipping email
          let webhookEffectiveUserId = savedUserId || existingPayment.userId;
          if (!webhookEffectiveUserId && shippingInfo?.shippingEmail) {
            const userByEmail = await storage.getUserByEmail(shippingInfo.shippingEmail);
            if (userByEmail) webhookEffectiveUserId = userByEmail.id;
          }

          const orderNumber = `${(process.env.ORDER_PREFIX || 'EG').toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
          const orderData: any = {
            orderNumber,
            totalAmount: serverTotal.toFixed(2),
            subtotalAmount: subtotal.toFixed(2),
            discountAmount: totalAllDiscounts > 0 ? totalAllDiscounts.toFixed(2) : "0",
            couponDiscountAmount: couponDiscount > 0 ? couponDiscount.toFixed(2) : "0",
            cashbackDiscountAmount: cbDiscount > 0 ? cbDiscount.toFixed(2) : "0",
            referralDiscountAmount: refRewardDiscount > 0 ? refRewardDiscount.toFixed(2) : "0",
            referredDiscountAmount: refReferredDiscount > 0 ? refReferredDiscount.toFixed(2) : "0",
            couponCode: savedCouponCode || null,
            status: "processing",
            shippingName: shippingInfo.shippingName,
            shippingEmail: shippingInfo.shippingEmail,
            shippingAddress: shippingInfo.shippingAddress,
            shippingCity: shippingInfo.shippingCity,
            shippingZip: shippingInfo.shippingZip,
            shippingCountry: shippingInfo.shippingCountry,
            shippingPhone: shippingInfo.shippingPhone || null,
            shippingCost: shippingCost.toFixed(2),
            shippingMethod: savedShippingMethod || "Padrão",
            paymentMethod: paymentDetails.payment_method_id || "mercadopago",
            fiscalPersonType: savedFiscalData?.personType || null,
            fiscalCpf: savedFiscalData?.cpf || null,
            fiscalCnpj: savedFiscalData?.cnpj || null,
            fiscalRazaoSocial: savedFiscalData?.razaoSocial || null,
            fiscalInscricaoEstadual: savedFiscalData?.inscricaoEstadual || null,
          };

          // Use createOrder if user was authenticated, otherwise createGuestOrder
          let order;
          if (savedUserId || existingPayment.userId) {
            orderData.userId = savedUserId || existingPayment.userId;
            order = await storage.createOrder(orderData, validatedItems);
          } else {
            order = await storage.createGuestOrder(orderData, validatedItems);
          }
          await storage.updatePayment(existingPayment.id, {
            orderId: order.id,
          });

          // Decrement stock for all items
          const webhookSizedItems = validatedItems
            .filter((i: any) => i.selectedSize)
            .map((i: any) => ({ productId: i.productId, size: i.selectedSize!, quantity: i.quantity }));
          if (webhookSizedItems.length > 0) {
            storage.decrementSizeStock(webhookSizedItems).catch(console.error);
          }
          for (const item of validatedItems as any[]) {
            if (!item.selectedSize) {
              storage.decrementSimpleProductStock(item.productId, item.quantity).catch(console.error);
            }
          }
          triggerLowStockAlerts(storage).catch(console.error);

          // Credit earned cashback immediately after payment approval
          if (webhookEffectiveUserId) {
            storage.creditCashbackForOrder(order.id, webhookEffectiveUserId).catch((cbErr: any) => {
              console.error("Error crediting cashback (webhook):", cbErr);
            });
          }

          // Debit cashback if used
          if (cbDiscount > 0 && webhookEffectiveUserId) {
            try {
              await storage.addCashbackTransaction({
                userId: webhookEffectiveUserId,
                orderId: order.id,
                type: 'spent',
                amount: String(cbDiscount),
                description: `Cashback usado no pedido #${order.orderNumber}`,
              });
              await storage.updateUserCashbackBalance(webhookEffectiveUserId, -cbDiscount);
            } catch (cbErr) {
              console.error("Error debiting cashback (webhook):", cbErr);
            }
          }

          // Create coupon redemption record for statistics
          if (savedCouponId && couponDiscount > 0) {
            try {
              await storage.createCouponRedemption({
                couponId: savedCouponId,
                orderId: order.id,
                userId: savedUserId || existingPayment.userId || null,
                discountAmount: couponDiscount.toFixed(2),
                orderTotalBeforeDiscount: subtotal.toFixed(2),
              });
              console.log(
                `Created coupon redemption for order ${order.id}, coupon ${savedCouponId}`,
              );
            } catch (redemptionErr) {
              console.error("Error creating coupon redemption:", redemptionErr);
            }
          }

          // Process referral if applicable
          if (savedReferralCode && webhookEffectiveUserId) {
            storage.processReferralForOrder(
              order.id,
              savedReferralCode,
              shippingInfo.shippingEmail,
              webhookEffectiveUserId,
              serverTotal,
            ).catch((e: Error) => console.error("Error processing referral (webhook):", e));
          }

          const protocol = "https";
          const host = process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
          const baseUrl = `${protocol}://${host}`;
          sendOrderNotifications(order.id, baseUrl, true).catch(console.error);

          // Mark referral reward as used if applicable
          if (savedReferralRewardId && refRewardDiscount > 0) {
            try {
              await storage.useReferralReward(savedReferralRewardId, order.id);
            } catch (refErr) {
              console.error("Error marking referral reward as used (webhook):", refErr);
            }
          }

          console.log(
            `Order created from webhook: ${order.id} | total: R$${serverTotal.toFixed(2)} | coupon: R$${couponDiscount.toFixed(2)} | cashback: R$${cbDiscount.toFixed(2)} | referral: R$${refRewardDiscount.toFixed(2)} | referred: R$${refReferredDiscount.toFixed(2)}`,
          );
        } catch (orderError) {
          console.error("Error creating order from webhook:", orderError);
        }
      }

      if (
        paymentDetails.status === "rejected" ||
        paymentDetails.status === "cancelled"
      ) {
        console.log(
          `Payment ${paymentId} was ${paymentDetails.status}: ${paymentDetails.status_detail}`,
        );
      }
    } catch (err) {
      console.error("Error processing webhook payment:", err);
    }
  }

  app.get("/api/payments/:id", async (req, res, next) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      // Strip sensitive PII (pendingOrderData) unless the requester is the owner or an admin
      const reqUser = req.isAuthenticated() ? (req.user as any) : null;
      const isOwner = reqUser && (payment.userId === reqUser.id || payment.payerEmail === reqUser.email);
      const isAdmin = reqUser?.role === "admin";
      if (!isOwner && !isAdmin) {
        const { pendingOrderData, ...safePayment } = payment as any;
        return res.json(safePayment);
      }
      res.json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/payments/status/:externalReference", async (req, res, next) => {
    try {
      const payment = await storage.getPaymentByExternalReference(
        req.params.externalReference,
      );
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      // Strip sensitive PII unless the requester is the owner or an admin
      const reqUser = req.isAuthenticated() ? (req.user as any) : null;
      const isOwner = reqUser && (payment.userId === reqUser.id || payment.payerEmail === reqUser.email);
      const isAdmin = reqUser?.role === "admin";
      if (!isOwner && !isAdmin) {
        const { pendingOrderData, ...safePayment } = payment as any;
        return res.json(safePayment);
      }
      res.json(payment);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/payments", requireAdmin, async (req, res, next) => {
    try {
      const { status, startDate, endDate, limit, offset } = req.query;

      const payments = await storage.getAllPayments({
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(payments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/payments/stats", requireAdmin, async (req, res, next) => {
    try {
      const stats = await storage.getPaymentStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req, res, next) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res, next) => {
    try {
      const orderData = await storage.getOrderWithItems(req.params.id);
      if (!orderData) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(orderData);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/orders/:id/loggi-shipment", requireAdmin, async (req, res, next) => {
    try {
      if (!isLoggiEnabled()) {
        return res.status(503).json({ error: "Loggi not configured" });
      }

      const order = await storage.getOrderWithItems(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const STORE_ORIGIN_ZIP = process.env.STORE_ORIGIN_ZIP || "36015260";

      const items = order.items || [];
      const packages = [{
        weight: items.reduce((sum: number, it: any) => {
          const w = parseFloat(it.weight || '0.3');
          return sum + w * (it.quantity || 1);
        }, 0),
        height: 15,
        width: 20,
        length: 30,
        declaredValue: parseFloat((order.order as any)?.totalAmount || (order as any).totalAmount || (order.order as any)?.total || '0'),
      }];

      const orderData = (order.order || order) as any;
      const destName = orderData.customerName || orderData.shippingName || '';
      const destPhone = (orderData.customerPhone || orderData.shippingPhone || '').replace(/\D/g, '');
      const destZip = (orderData.shippingZip || '').replace(/\D/g, '');
      const destAddress = [orderData.shippingAddress, orderData.shippingNumber, orderData.shippingNeighborhood]
        .filter(Boolean).join(', ');
      const destCity = orderData.shippingCity || '';
      const destState = orderData.shippingState || '';

      if (!destZip || !destAddress || !destCity) {
        return res.status(400).json({ error: "Endereço de entrega incompleto. CEP, endereço e cidade são obrigatórios." });
      }

      const shipmentResult = await createLoggiShipment({
        originName: "Empório Gelada",
        originPhone: "553232365994",
        originZip: STORE_ORIGIN_ZIP,
        originAddress: "Av. Pedro Henrique Krambeck, nº 1249, Centro",
        originCity: "Juiz de Fora",
        originState: "MG",
        destinationName: destName,
        destinationPhone: destPhone,
        destinationZip: destZip,
        destinationAddress: destAddress,
        destinationCity: destCity,
        destinationState: destState,
        packages,
        externalOrderId: req.params.id,
      });

      await storage.updateOrderLoggiInfo(
        req.params.id,
        shipmentResult.loggiKey,
        shipmentResult.loggiKey,
        shipmentResult.trackingCode || undefined,
      );

      res.json(shipmentResult);
    } catch (error: any) {
      console.error("Loggi shipment error:", error);
      res.status(500).json({ error: error.message || "Failed to create Loggi shipment" });
    }
  });

  app.post("/api/admin/orders/:id/loggi-label", requireAdmin, async (req, res, next) => {
    try {
      if (!isLoggiEnabled()) {
        return res.status(503).json({ error: "Loggi not configured" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      if (!order.loggiKey) {
        return res.status(400).json({ error: "No Loggi shipment found for this order. Create a shipment first." });
      }

      const labelResult = await getLoggiLabel([order.loggiKey]);
      res.json(labelResult);
    } catch (error: any) {
      console.error("Loggi label error:", error);
      res.status(500).json({ error: error.message || "Failed to generate Loggi label" });
    }
  });

  app.get("/api/admin/orders/:id/loggi-tracking", requireAdmin, async (req, res, next) => {
    try {
      if (!isLoggiEnabled()) {
        return res.status(503).json({ error: "Loggi not configured" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const trackingId = order.loggiKey || order.trackingCode;
      if (!trackingId) {
        return res.status(400).json({ error: "No tracking information available" });
      }

      const trackingResult = await getLoggiTracking(trackingId);
      res.json(trackingResult);
    } catch (error: any) {
      console.error("Loggi tracking error:", error);
      res.status(500).json({ error: error.message || "Failed to get Loggi tracking" });
    }
  });

  app.get("/api/shipping/loggi-status", (req, res) => {
    res.json({ enabled: isLoggiEnabled() });
  });

  app.get("/api/shipping/melhorenvio-status", (req, res) => {
    res.json({ enabled: isMelhorEnvioEnabled() });
  });

  // ===== MELHOR ENVIO ADMIN ROUTES =====

  app.post("/api/admin/orders/:id/melhorenvio/cart", requireAdmin, async (req, res) => {
    try {
      if (!isMelhorEnvioEnabled()) {
        return res.status(503).json({ error: "Melhor Envio não está configurado" });
      }

      const orderData = await storage.getOrderWithItems(req.params.id);
      if (!orderData) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      const order = (orderData.order || orderData) as any;
      const items = orderData.items || [];

      if (order.melhorEnvioCartId) {
        return res.status(400).json({
          error: "Este pedido já possui uma remessa Melhor Envio criada",
          cartId: order.melhorEnvioCartId,
        });
      }

      // Try body first, then existing order field, then parse [me:NNN] from shippingMethod
      let serviceId = parseInt(String(req.body.serviceId || order.melhorEnvioServiceId || "0"), 10);
      if (!serviceId) {
        const m = (order.shippingMethod || "").match(/\[me:(\d+)\]/);
        if (m) serviceId = parseInt(m[1], 10);
      }
      if (!serviceId) {
        return res.status(400).json({
          error: "ID do serviço (serviceId) é obrigatório. Recalcule o frete e selecione uma opção do Melhor Envio.",
        });
      }

      const STORE_ORIGIN_ZIP_LOCAL = process.env.STORE_ORIGIN_ZIP || "36015260";
      const fromName = process.env.MELHOR_ENVIO_FROM_NAME || "Empório Gelada";
      const fromPhone = process.env.MELHOR_ENVIO_FROM_PHONE || "553232365994";
      const fromEmail = process.env.MELHOR_ENVIO_FROM_EMAIL || "contato@emporiogelada.com.br";
      const fromDocument = process.env.MELHOR_ENVIO_FROM_DOCUMENT || "";
      const fromCompanyDocument = process.env.MELHOR_ENVIO_FROM_COMPANY_DOCUMENT || undefined;
      const fromAddress = process.env.MELHOR_ENVIO_FROM_ADDRESS || "Av. Pedro Henrique Krambeck";
      const fromNumber = process.env.MELHOR_ENVIO_FROM_NUMBER || "1249";
      const fromComplement = process.env.MELHOR_ENVIO_FROM_COMPLEMENT || undefined;
      const fromDistrict = process.env.MELHOR_ENVIO_FROM_DISTRICT || "Centro";
      const fromCity = process.env.MELHOR_ENVIO_FROM_CITY || "Juiz de Fora";
      const fromState = process.env.MELHOR_ENVIO_FROM_STATE || "MG";

      if (!fromDocument) {
        return res.status(400).json({
          error: "Configure MELHOR_ENVIO_FROM_DOCUMENT (CPF/CNPJ do remetente) nas variáveis de ambiente.",
        });
      }

      const totalWeight = items.reduce((sum: number, it: any) => {
        const w = parseFloat(String(it.weight || it.product?.weight || "0.5"));
        return sum + w * (it.quantity || 1);
      }, 0);
      const maxHeight = Math.max(2, ...items.map((it: any) => parseFloat(String(it.height || it.product?.height || "10"))));
      const maxWidth = Math.max(11, ...items.map((it: any) => parseFloat(String(it.width || it.product?.width || "15"))));
      const sumLength = items.reduce((sum: number, it: any) => sum + parseFloat(String(it.length || it.product?.length || "20")) * (it.quantity || 1), 0);

      const productsList = items.map((it: any) => ({
        name: it.productName || it.product?.name || "Produto",
        quantity: it.quantity || 1,
        unitary_value: parseFloat(String(it.price || it.product?.price || "0")),
      }));

      const insuranceValue = parseFloat(String(order.totalAmount || order.total || "0")) || 0;

      const destZip = (order.shippingZip || "").replace(/\D/g, "");
      const destAddress = order.shippingAddress || "";
      if (!destZip || !destAddress || !order.shippingCity) {
        return res.status(400).json({
          error: "Endereço de entrega incompleto. CEP, endereço e cidade são obrigatórios.",
        });
      }

      const cartResult = await addToMelhorEnvioCart({
        serviceId,
        fromName,
        fromPhone,
        fromEmail,
        fromDocument,
        fromCompanyDocument,
        fromAddress,
        fromNumber,
        fromComplement,
        fromDistrict,
        fromCity,
        fromState,
        fromZip: STORE_ORIGIN_ZIP_LOCAL,
        toName: order.shippingName || order.customerName || "",
        toPhone: (order.shippingPhone || order.customerPhone || "").replace(/\D/g, ""),
        toEmail: order.shippingEmail || undefined,
        toDocument: order.fiscalCpf || undefined,
        toAddress: destAddress,
        toNumber: order.shippingNumber || "S/N",
        toComplement: order.shippingComplement || undefined,
        toDistrict: order.shippingNeighborhood || order.shippingDistrict || "Centro",
        toCity: order.shippingCity,
        toState: order.shippingState || "",
        toZip: destZip,
        packageWeight: Math.max(0.1, totalWeight),
        packageHeight: Math.max(2, Math.min(100, maxHeight)),
        packageWidth: Math.max(11, Math.min(100, maxWidth)),
        packageLength: Math.max(16, Math.min(100, sumLength)),
        insuranceValue,
        externalOrderId: req.params.id,
        productsList,
        collect: (process.env.MELHOR_ENVIO_COLLECT || "false").toLowerCase() === "true",
        collectScheduledDate: process.env.MELHOR_ENVIO_COLLECT_DATE || undefined,
      });

      await storage.updateOrderMelhorEnvio(req.params.id, {
        cartId: cartResult.cartId,
        serviceId,
        status: cartResult.status,
        protocol: cartResult.protocol,
      });

      res.json(cartResult);
    } catch (error: any) {
      console.error("Melhor Envio cart error:", error);
      let errorMsg = error.message || "Falha ao criar remessa Melhor Envio";
      // Translate common ME 422 errors to clear Portuguese guidance
      if (errorMsg.includes("unidade LATAM Cargo") || errorMsg.includes("LATAM")) {
        errorMsg =
          "LATAM Cargo éFácil requer agendamento de coleta ou unidade LATAM cadastrada. " +
          "Ative a coleta configurando MELHOR_ENVIO_COLLECT=true nas variáveis de ambiente, " +
          "ou escolha outro serviço (Jadlog, Correios) para este pedido.";
      } else if (errorMsg.includes("solicitação de coleta")) {
        errorMsg =
          "Este serviço requer agendamento de coleta. Configure MELHOR_ENVIO_COLLECT=true nas variáveis de ambiente.";
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post("/api/admin/orders/:id/melhorenvio/checkout", requireAdmin, async (req, res) => {
    try {
      if (!isMelhorEnvioEnabled()) {
        return res.status(503).json({ error: "Melhor Envio não está configurado" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      if (!order.melhorEnvioCartId) {
        return res.status(400).json({ error: "Crie a remessa antes de pagar (carrinho)" });
      }
      const result = await checkoutMelhorEnvioCart([order.melhorEnvioCartId]);
      await storage.updateOrderMelhorEnvio(req.params.id, {
        status: result.paid ? "paid" : result.status,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Melhor Envio checkout error:", error);
      res.status(500).json({ error: error.message || "Falha ao pagar etiqueta Melhor Envio" });
    }
  });

  app.post("/api/admin/orders/:id/melhorenvio/label", requireAdmin, async (req, res) => {
    try {
      if (!isMelhorEnvioEnabled()) {
        return res.status(503).json({ error: "Melhor Envio não está configurado" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      if (!order.melhorEnvioCartId) {
        return res.status(400).json({ error: "Crie e pague a remessa antes de gerar a etiqueta" });
      }
      const generated = await generateMelhorEnvioLabel([order.melhorEnvioCartId]);
      const printed = await printMelhorEnvioLabel([order.melhorEnvioCartId], "public");
      const updateData: any = {
        status: generated.status || "generated",
        labelUrl: printed.url || undefined,
      };
      if (generated.trackingCode) {
        updateData.trackingCode = generated.trackingCode;
      }
      await storage.updateOrderMelhorEnvio(req.params.id, updateData);
      res.json({ status: generated.status, labelUrl: printed.url, trackingCode: generated.trackingCode });
    } catch (error: any) {
      console.error("Melhor Envio label error:", error);
      res.status(500).json({ error: error.message || "Falha ao gerar etiqueta Melhor Envio" });
    }
  });

  app.get("/api/admin/orders/:id/melhorenvio/tracking", requireAdmin, async (req, res) => {
    try {
      if (!isMelhorEnvioEnabled()) {
        return res.status(503).json({ error: "Melhor Envio não está configurado" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      if (!order.melhorEnvioCartId) {
        return res.status(400).json({ error: "Sem remessa Melhor Envio para este pedido" });
      }
      const tracking = await getMelhorEnvioTracking([order.melhorEnvioCartId]);
      const result = tracking[order.melhorEnvioCartId] || { status: "unknown", events: [] };

      // Persist new tracking code if returned
      const updates: any = { status: result.status };
      if (result.trackingCode && result.trackingCode !== order.trackingCode) {
        updates.trackingCode = result.trackingCode;
      }
      if (result.trackingCode || result.status) {
        await storage.updateOrderMelhorEnvio(req.params.id, updates);
      }

      res.json(result);
    } catch (error: any) {
      console.error("Melhor Envio tracking error:", error);
      res.status(500).json({ error: error.message || "Falha ao rastrear Melhor Envio" });
    }
  });

  app.post("/api/admin/orders/:id/melhorenvio/cancel", requireAdmin, async (req, res) => {
    try {
      if (!isMelhorEnvioEnabled()) {
        return res.status(503).json({ error: "Melhor Envio não está configurado" });
      }
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
      if (!order.melhorEnvioCartId) {
        return res.status(400).json({ error: "Sem remessa Melhor Envio para cancelar" });
      }
      const result = await cancelMelhorEnvioShipment(
        order.melhorEnvioCartId,
        parseInt(String(req.body.reasonId || "2"), 10),
        String(req.body.description || "Cancelado pelo lojista"),
      );
      // Clear all ME fields so admin can create a new shipment
      await storage.updateOrderMelhorEnvio(req.params.id, {
        cartId: null,
        serviceId: null,
        status: null,
        protocol: null,
        labelUrl: null,
      });
      res.json(result);
    } catch (error: any) {
      console.error("Melhor Envio cancel error:", error);
      res.status(500).json({ error: error.message || "Falha ao cancelar remessa" });
    }
  });

  app.get(
    "/api/admin/dashboard/stats",
    requireAdmin,
    async (req, res, next) => {
      try {
        const stats = await storage.getAdminDashboardStats();
        res.json(stats);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post("/api/payments/verify-and-create-order", async (req, res, next) => {
    try {
      const { externalReference, paymentId } = req.body;

      if (!externalReference) {
        return res.status(400).json({ error: "External reference required" });
      }

      let payment =
        await storage.getPaymentByExternalReference(externalReference);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.orderId) {
        const existingOrder = await storage.getOrder(payment.orderId);
        if (existingOrder) {
          return res.json({ order: existingOrder, alreadyCreated: true });
        }
      }

      let verifiedStatus = payment.status;

      if (paymentId && isMercadoPagoConfigured()) {
        try {
          const mpPayment = await getPaymentDetails(paymentId);
          verifiedStatus = mpPayment.status || "unknown";

          await storage.updatePayment(payment.id, {
            mercadoPagoId: mpPayment.id,
            status: verifiedStatus,
            statusDetail: mpPayment.status_detail || null,
            paymentMethod: mpPayment.payment_method_id || null,
            paymentType: mpPayment.payment_type_id || null,
            payerEmail: mpPayment.payer?.email || payment.payerEmail,
          });

          payment =
            await storage.getPaymentByExternalReference(externalReference);
          if (!payment) {
            return res
              .status(404)
              .json({ error: "Payment not found after update" });
          }
        } catch (mpError) {
          console.error("Error verifying with MP API:", mpError);
        }
      }

      if (
        !paymentId &&
        isMercadoPagoConfigured() &&
        payment &&
        payment.status === "pending"
      ) {
        try {
          const mpPayments =
            await searchPaymentsByExternalReference(externalReference);
          if (mpPayments.length > 0) {
            const latestPayment = mpPayments[0];
            verifiedStatus = latestPayment.status || "pending";

            await storage.updatePayment(payment.id, {
              mercadoPagoId: latestPayment.id?.toString(),
              status: verifiedStatus,
              statusDetail: latestPayment.status_detail || null,
              paymentMethod: latestPayment.payment_method_id || null,
              paymentType: latestPayment.payment_type_id || null,
            });

            payment =
              await storage.getPaymentByExternalReference(externalReference);
          }
        } catch (searchError) {
          console.error("Error searching MP payments:", searchError);
        }
      }

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      if (payment.status !== "approved") {
        return res
          .status(400)
          .json({ error: "Payment not approved", status: payment.status });
      }

      if (!payment.pendingOrderData) {
        return res.status(400).json({ error: "No pending order data found" });
      }

      let pendingData;
      try {
        pendingData = JSON.parse(payment.pendingOrderData);
      } catch {
        return res.status(400).json({ error: "Invalid pending order data" });
      }

      const {
        shippingInfo,
        fiscalData: spFiscalData,
        items,
        shippingCost: savedShippingCost,
        shippingMethod: savedShippingMethod,
        couponCode: spCouponCode,
        couponId: spCouponId,
        discountAmount: spDiscountAmount,
        subtotal: spSavedSubtotal,
        cashbackDiscount: spCashbackDiscount,
        referralRewardAmount: spReferralRewardAmount,
        referralRewardId: spReferralRewardId,
        referralCode: spReferralCode,
        referredDiscount: spReferredDiscount,
      } = pendingData;
      if (!shippingInfo || !items || items.length === 0) {
        return res.status(400).json({ error: "Incomplete pending order data" });
      }

      // Use saved prices (with promotions already applied) from original preference
      let calculatedSubtotal = 0;
      const validatedItems: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: string;
        orderId: string;
        selectedSize?: string | null;
      }> = [];

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res
            .status(400)
            .json({ error: `Product ${item.productId} not found` });
        }
        const quantity = Math.min(
          Math.max(1, parseInt(item.quantity) || 1),
          99,
        );
        const savedItemPrice = item.price ? parseFloat(item.price) : parseFloat(product.price);
        calculatedSubtotal += savedItemPrice * quantity;
        validatedItems.push({
          productId: product.id,
          productName: item.productName || product.name,
          quantity,
          price: savedItemPrice.toFixed(2),
          orderId: "",
          selectedSize: item.selectedSize || null,
        });
      }

      const spSubtotal = typeof spSavedSubtotal === "number" && spSavedSubtotal > 0 ? spSavedSubtotal : calculatedSubtotal;
      const spCouponDiscount = typeof spDiscountAmount === "number" && spDiscountAmount >= 0 ? spDiscountAmount : 0;
      const spCbDiscount = typeof spCashbackDiscount === "number" && spCashbackDiscount >= 0 ? spCashbackDiscount : 0;
      const spReferralReward = typeof spReferralRewardAmount === "number" && spReferralRewardAmount >= 0 ? spReferralRewardAmount : 0;
      const spRefDiscount = typeof spReferredDiscount === "number" && spReferredDiscount >= 0 ? spReferredDiscount : 0;
      const spTotalDiscount = spCouponDiscount + spCbDiscount + spReferralReward + spRefDiscount;

      const shippingCost =
        typeof savedShippingCost === "number" && savedShippingCost >= 0
          ? savedShippingCost
          : 25;
      const serverTotal = Math.max(0, spSubtotal - spTotalDiscount + shippingCost);

      // Increment coupon usage
      if (spCouponId) {
        storage.incrementCouponUsage(spCouponId).catch((e: Error) => console.error("Error incrementing coupon (success):", e));
      }

      const user = req.user as any;
      const successEffectiveUserId = user?.id || pendingData.userId || payment.userId;

      const orderNumber = `${(process.env.ORDER_PREFIX || 'EG').toUpperCase()}${Date.now().toString(36).toUpperCase()}`;
      const orderData: any = {
        orderNumber,
        totalAmount: serverTotal.toFixed(2),
        subtotalAmount: spSubtotal.toFixed(2),
        discountAmount: spTotalDiscount > 0 ? spTotalDiscount.toFixed(2) : "0",
        couponDiscountAmount: spCouponDiscount > 0 ? spCouponDiscount.toFixed(2) : "0",
        cashbackDiscountAmount: spCbDiscount > 0 ? spCbDiscount.toFixed(2) : "0",
        referralDiscountAmount: spReferralReward > 0 ? spReferralReward.toFixed(2) : "0",
        referredDiscountAmount: spRefDiscount > 0 ? spRefDiscount.toFixed(2) : "0",
        couponCode: spCouponCode || null,
        status: payment.status === "approved" ? "processing" : "pending",
        shippingName: shippingInfo.shippingName,
        shippingEmail: shippingInfo.shippingEmail,
        shippingAddress: shippingInfo.shippingAddress,
        shippingCity: shippingInfo.shippingCity,
        shippingZip: shippingInfo.shippingZip,
        shippingCountry: shippingInfo.shippingCountry,
        shippingPhone: shippingInfo.shippingPhone || null,
        shippingCost: shippingCost.toFixed(2),
        shippingMethod: savedShippingMethod || "Padrão",
        paymentMethod: payment.paymentMethod || "mercadopago",
        fiscalPersonType: spFiscalData?.personType || null,
        fiscalCpf: spFiscalData?.cpf || null,
        fiscalCnpj: spFiscalData?.cnpj || null,
        fiscalRazaoSocial: spFiscalData?.razaoSocial || null,
        fiscalInscricaoEstadual: spFiscalData?.inscricaoEstadual || null,
      };

      let order;

      if (successEffectiveUserId) {
        orderData.userId = successEffectiveUserId;
        order = await storage.createOrder(orderData, validatedItems);
        await storage.clearCart(successEffectiveUserId);
      } else {
        order = await storage.createGuestOrder(orderData, validatedItems);
      }

      await storage.updatePayment(payment.id, { orderId: order.id });

      // Decrement stock for all items
      const sizedItemsWh = validatedItems
        .filter((i: any) => i.selectedSize)
        .map((i: any) => ({ productId: i.productId, size: i.selectedSize!, quantity: i.quantity }));
      if (sizedItemsWh.length > 0) {
        storage.decrementSizeStock(sizedItemsWh).catch(console.error);
      }
      for (const item of validatedItems as any[]) {
        if (!item.selectedSize) {
          storage.decrementSimpleProductStock(item.productId, item.quantity).catch(console.error);
        }
      }
      triggerLowStockAlerts(storage).catch(console.error);

      // Debit cashback if used
      if (spCbDiscount > 0 && successEffectiveUserId) {
        try {
          await storage.addCashbackTransaction({
            userId: successEffectiveUserId,
            orderId: order.id,
            type: 'spent',
            amount: String(spCbDiscount),
            description: `Cashback usado no pedido #${order.orderNumber}`,
          });
          await storage.updateUserCashbackBalance(successEffectiveUserId, -spCbDiscount);
        } catch (cbErr) {
          console.error("Error debiting cashback (success):", cbErr);
        }
      }

      // Mark referral reward as used if applicable
      if (spReferralRewardId && spReferralReward > 0) {
        try {
          await storage.useReferralReward(spReferralRewardId, order.id);
        } catch (refErr) {
          console.error("Error marking referral reward as used (pay-order):", refErr);
        }
      }

      // Process referral if applicable
      if (spReferralCode && successEffectiveUserId) {
        storage.processReferralForOrder(
          order.id,
          spReferralCode,
          shippingInfo.shippingEmail,
          successEffectiveUserId,
          serverTotal,
        ).catch((e: Error) => console.error("Error processing referral (success):", e));
      }

      const baseUrl = getBaseUrl(req);
      sendOrderNotifications(order.id, baseUrl, true).catch(console.error);

      res.json({ order, created: true });
    } catch (error) {
      next(error);
    }
  });

  // Public: Store settings (for shipping configuration)
  app.get("/api/store/shipping-config", async (req, res, next) => {
    try {
      const freeShippingThreshold = await storage.getStoreSetting(
        "free_shipping_threshold",
      );
      res.json({
        freeShippingThreshold: freeShippingThreshold
          ? parseFloat(freeShippingThreshold)
          : null,
        freeShippingEnabled:
          freeShippingThreshold !== undefined &&
          parseFloat(freeShippingThreshold) > 0,
      });
    } catch (error) {
      next(error);
    }
  });

  // ADMIN: Store Settings CRUD
  app.get("/api/admin/settings", requireAdmin, async (req, res, next) => {
    try {
      const settings = await storage.getAllStoreSettings();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/settings/:key", requireAdmin, async (req, res, next) => {
    try {
      const { value, description } = req.body;
      if (value === undefined) {
        return res.status(400).json({ error: "Value is required" });
      }
      await storage.setStoreSetting(req.params.key, String(value), description);
      res.json({ success: true, key: req.params.key, value });
    } catch (error) {
      next(error);
    }
  });

  // ADMIN: Coupon CRUD
  app.get("/api/admin/coupons", requireAdmin, async (req, res, next) => {
    try {
      const coupons = await storage.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/coupons/:id", requireAdmin, async (req, res, next) => {
    try {
      const coupon = await storage.getCoupon(req.params.id);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/coupons", requireAdmin, async (req, res, next) => {
    try {
      const data = insertCouponSchema.parse(req.body);
      const coupon = await storage.createCoupon(data);
      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.patch("/api/admin/coupons/:id", requireAdmin, async (req, res, next) => {
    try {
      const coupon = await storage.updateCoupon(req.params.id, req.body);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.json(coupon);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res, next) => {
    try {
      const success = await storage.deleteCoupon(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Coupon not found" });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/admin/coupons/:id/stats",
    requireAdmin,
    async (req, res, next) => {
      try {
        const stats = await storage.getCouponStats(req.params.id);
        res.json(stats);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/api/admin/coupons-stats", requireAdmin, async (req, res, next) => {
    try {
      const stats = await storage.getAllCouponStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  // PUBLIC: Validate coupon at checkout
  app.post("/api/coupons/validate", couponValidateRateLimiter, async (req, res, next) => {
    try {
      const { code, cartItems: items, subtotal } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Coupon code is required" });
      }

      const coupon = await storage.getCouponByCode(code);
      if (!coupon) {
        return res.status(404).json({ error: "Coupon not found" });
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return res.status(400).json({ error: "Coupon is not active" });
      }

      // Check date validity
      const now = new Date();
      if (coupon.startDate && new Date(coupon.startDate) > now) {
        return res.status(400).json({ error: "Coupon is not yet valid" });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return res.status(400).json({ error: "Coupon has expired" });
      }

      // Check usage limits
      if (
        coupon.maxUsageCount &&
        coupon.currentUsageCount >= coupon.maxUsageCount
      ) {
        return res.status(400).json({ error: "Coupon usage limit reached" });
      }

      // Check minimum order amount
      const orderSubtotal = parseFloat(subtotal || "0");
      if (
        coupon.minOrderAmount &&
        orderSubtotal < parseFloat(coupon.minOrderAmount)
      ) {
        return res.status(400).json({
          error: `Minimum order of R$ ${parseFloat(coupon.minOrderAmount).toFixed(2)} required`,
        });
      }

      // Check product/collection eligibility
      let eligibleSubtotal = orderSubtotal;
      if (
        coupon.appliesTo === "products" &&
        coupon.productIds &&
        coupon.productIds.length > 0
      ) {
        eligibleSubtotal = 0;
        for (const item of items || []) {
          if (coupon.productIds.includes(item.productId)) {
            eligibleSubtotal += parseFloat(item.price) * item.quantity;
          }
        }
        if (eligibleSubtotal === 0) {
          return res
            .status(400)
            .json({ error: "Coupon does not apply to any items in cart" });
        }
      } else if (
        coupon.appliesTo === "collections" &&
        coupon.collectionIds &&
        coupon.collectionIds.length > 0
      ) {
        eligibleSubtotal = 0;
        for (const item of items || []) {
          const product = await storage.getProduct(item.productId);
          if (product && coupon.collectionIds.includes(product.collectionId)) {
            eligibleSubtotal += parseFloat(item.price) * item.quantity;
          }
        }
        if (eligibleSubtotal === 0) {
          return res
            .status(400)
            .json({ error: "Coupon does not apply to any items in cart" });
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discountType === "fixed") {
        discountAmount = Math.min(
          parseFloat(coupon.discountValue),
          eligibleSubtotal,
        );
      } else {
        discountAmount =
          (eligibleSubtotal * parseFloat(coupon.discountValue)) / 100;
      }

      res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          description: coupon.description,
          freeShipping: coupon.freeShipping,
        },
        discountAmount: discountAmount.toFixed(2),
        eligibleSubtotal: eligibleSubtotal.toFixed(2),
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== SUPPORT SYSTEM ====================

  // Customer: Get user's tickets
  app.get("/api/support/tickets", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const tickets = await storage.getUserSupportTickets(user.id);
      res.json(tickets);
    } catch (error) {
      next(error);
    }
  });

  // Customer: Get ticket with messages
  app.get("/api/support/tickets/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const ticket = await storage.getSupportTicket(req.params.id);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Check ownership or admin
      if (ticket.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const messages = await storage.getTicketMessages(ticket.id);

      // Mark messages as read for current user
      const senderType = user.role === "admin" ? "admin" : "customer";
      await storage.markMessagesAsRead(ticket.id, senderType);

      res.json({ ticket, messages });
    } catch (error) {
      next(error);
    }
  });

  // Customer: Create new ticket
  app.post("/api/support/tickets", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { subject, message, orderId } = req.body;

      if (!subject || !message) {
        return res
          .status(400)
          .json({ error: "Subject and message are required" });
      }

      // Try to find the order by orderNumber or short ID
      let finalOrderId = orderId || null;
      if (orderId) {
        const allOrders = await storage.getAllOrders();
        // Search by orderNumber first (e.g., MBMKX0UOIB), then by short ID
        const foundOrder = allOrders.find(
          (o) =>
            o.orderNumber === orderId ||
            (o.orderNumber &&
              o.orderNumber.toUpperCase() === orderId.toUpperCase()) ||
            o.id.startsWith(orderId) ||
            (o.orderNumber && o.orderNumber.endsWith(orderId)),
        );
        if (foundOrder) {
          finalOrderId = foundOrder.id;
        }
      }

      const ticket = await storage.createSupportTicket({
        userId: user.id,
        customerEmail: user.email,
        customerName: user.name || user.email.split("@")[0],
        subject,
        orderId: finalOrderId,
        status: "open",
        priority: "normal",
      });

      // Create first message
      const supportMessage = await storage.createSupportMessage({
        ticketId: ticket.id,
        senderType: "customer",
        senderName: user.name || user.email.split("@")[0],
        senderEmail: user.email,
        message,
      });

      // Send email notification to admins
      const baseUrl = getBaseUrl(req);
      sendSupportNotification(
        ticket.id,
        supportMessage.id,
        "new_ticket",
        baseUrl,
      ).catch(console.error);

      res.status(201).json({ ticket, message: supportMessage });
    } catch (error) {
      next(error);
    }
  });

  // Customer/Admin: Send message to ticket
  app.post(
    "/api/support/tickets/:id/messages",
    requireAuth,
    async (req, res, next) => {
      try {
        const user = req.user as any;
        const { message } = req.body;

        if (!message) {
          return res.status(400).json({ error: "Message is required" });
        }

        const ticket = await storage.getSupportTicket(req.params.id);
        if (!ticket) {
          return res.status(404).json({ error: "Ticket not found" });
        }

        // Check access
        if (ticket.userId !== user.id && user.role !== "admin") {
          return res.status(403).json({ error: "Access denied" });
        }

        if (ticket.status === "closed") {
          return res
            .status(400)
            .json({ error: "Cannot reply to closed ticket" });
        }

        const senderType = user.role === "admin" ? "admin" : "customer";
        const supportMessage = await storage.createSupportMessage({
          ticketId: ticket.id,
          senderType,
          senderName: user.name || user.email.split("@")[0],
          senderEmail: user.email,
          message,
        });

        // Reopen if was waiting
        if (ticket.status === "waiting" && senderType === "customer") {
          await storage.updateSupportTicket(ticket.id, { status: "open" });
        }

        // Set to waiting if admin replied
        if (senderType === "admin" && ticket.status === "open") {
          await storage.updateSupportTicket(ticket.id, { status: "waiting" });
        }

        // Send email notification
        const baseUrl = getBaseUrl(req);
        sendSupportNotification(
          ticket.id,
          supportMessage.id,
          "new_message",
          baseUrl,
        ).catch(console.error);

        res.status(201).json(supportMessage);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin: Get all tickets
  app.get(
    "/api/admin/support/tickets",
    requireAdmin,
    async (req, res, next) => {
      try {
        const { status, priority } = req.query;
        const tickets = await storage.getAllSupportTickets({
          status: status as string | undefined,
          priority: priority as string | undefined,
        });

        // Get unread counts for each ticket
        const ticketsWithCounts = await Promise.all(
          tickets.map(async (ticket) => {
            const unreadCount = await storage.getUnreadMessageCount(
              ticket.id,
              "admin",
            );
            return { ...ticket, unreadCount };
          }),
        );

        res.json(ticketsWithCounts);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin: Update ticket status/priority
  app.patch(
    "/api/admin/support/tickets/:id",
    requireAdmin,
    async (req, res, next) => {
      try {
        const { status, priority } = req.body;
        const updateData: any = {};

        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;

        const updated = await storage.updateSupportTicket(
          req.params.id,
          updateData,
        );
        if (!updated) {
          return res.status(404).json({ error: "Ticket not found" });
        }

        res.json(updated);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin: Close ticket
  app.post(
    "/api/admin/support/tickets/:id/close",
    requireAdmin,
    async (req, res, next) => {
      try {
        const closed = await storage.closeSupportTicket(req.params.id);
        if (!closed) {
          return res.status(404).json({ error: "Ticket not found" });
        }
        res.json(closed);
      } catch (error) {
        next(error);
      }
    },
  );

  // ---- Promotions public ----
  app.get("/api/promotions/active", async (_req, res, next) => {
    try {
      res.json(await fetchActivePromos());
    } catch (error) { next(error); }
  });

  // ---- Promotions CRM ----
  app.get("/api/admin/promotions", requireAdmin, async (req, res, next) => {
    try {
      const all = await storage.getAllPromotions();
      res.json(all);
    } catch (error) { next(error); }
  });

  app.post("/api/admin/promotions", requireAdmin, async (req, res, next) => {
    try {
      const { insertPromotionSchema } = await import("@shared/schema");
      const data = insertPromotionSchema.parse({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      const promo = await storage.createPromotion(data);
      res.status(201).json(promo);
    } catch (error) { next(error); }
  });

  app.put("/api/admin/promotions/:id", requireAdmin, async (req, res, next) => {
    try {
      const updates: any = { ...req.body };
      if (updates.startDate) updates.startDate = new Date(updates.startDate);
      if (updates.endDate) updates.endDate = new Date(updates.endDate);
      const promo = await storage.updatePromotion(req.params.id, updates);
      if (!promo) return res.status(404).json({ error: "Not found" });
      res.json(promo);
    } catch (error) { next(error); }
  });

  app.delete("/api/admin/promotions/:id", requireAdmin, async (req, res, next) => {
    try {
      const ok = await storage.deletePromotion(req.params.id);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.json({ message: "Deleted" });
    } catch (error) { next(error); }
  });

  app.get("/api/admin/promotions/:id/insights", requireAdmin, async (req, res, next) => {
    try {
      const insights = await storage.getPromotionInsights(req.params.id);
      res.json(insights);
    } catch (error) { next(error); }
  });

  // ─────────────────────────────────────────────
  // CASHBACK ROUTES
  // ─────────────────────────────────────────────

  // Admin: list all rules
  app.get("/api/admin/cashback/dashboard", requireAdmin, async (_req, res, next) => {
    try {
      const data = await storage.getCashbackDashboard();
      res.json(data);
    } catch (error) { next(error); }
  });

  app.get("/api/admin/cashback/rules", requireAdmin, async (_req, res, next) => {
    try {
      const rules = await storage.getAllCashbackRules();
      res.json(rules);
    } catch (error) { next(error); }
  });

  // Admin: create rule (validates no duplicate target, checks hierarchy)
  app.post("/api/admin/cashback/rules", requireAdmin, async (req, res, next) => {
    try {
      const { targetType, targetId, targetName, percentage, isActive } = req.body;
      if (!targetType || !targetId || !targetName || percentage === undefined) {
        return res.status(400).json({ error: "Campos obrigatórios: targetType, targetId, targetName, percentage" });
      }
      const existing = await storage.getCashbackRuleByTarget(targetType, targetId);
      if (existing) {
        return res.status(409).json({ error: "Já existe uma regra de cashback para este agrupamento" });
      }
      const rule = await storage.createCashbackRule({ targetType, targetId, targetName, percentage: String(percentage), isActive: isActive !== false });
      res.status(201).json(rule);
    } catch (error) { next(error); }
  });

  // Admin: update rule
  app.put("/api/admin/cashback/rules/:id", requireAdmin, async (req, res, next) => {
    try {
      const { percentage, isActive, targetName } = req.body;
      const updates: any = {};
      if (percentage !== undefined) updates.percentage = String(percentage);
      if (isActive !== undefined) updates.isActive = isActive;
      if (targetName !== undefined) updates.targetName = targetName;
      const rule = await storage.updateCashbackRule(req.params.id, updates);
      if (!rule) return res.status(404).json({ error: "Regra não encontrada" });
      res.json(rule);
    } catch (error) { next(error); }
  });

  // Admin: delete rule
  app.delete("/api/admin/cashback/rules/:id", requireAdmin, async (req, res, next) => {
    try {
      const ok = await storage.deleteCashbackRule(req.params.id);
      if (!ok) return res.status(404).json({ error: "Regra não encontrada" });
      res.json({ message: "Regra excluída" });
    } catch (error) { next(error); }
  });

  // Admin: get & update cashback settings (stored in storeSettings)
  app.get("/api/admin/cashback/settings", requireAdmin, async (_req, res, next) => {
    try {
      const minPurchase = await storage.getStoreSetting("cashback_min_purchase") ?? "0";
      const maxDiscountPct = await storage.getStoreSetting("cashback_max_discount_pct") ?? "100";
      const enabled = await storage.getStoreSetting("cashback_enabled") ?? "true";
      res.json({ minPurchase: Number(minPurchase), maxDiscountPct: Number(maxDiscountPct), enabled: enabled === "true" });
    } catch (error) { next(error); }
  });

  app.put("/api/admin/cashback/settings", requireAdmin, async (req, res, next) => {
    try {
      const { minPurchase, maxDiscountPct, enabled } = req.body;
      if (minPurchase !== undefined) await storage.setStoreSetting("cashback_min_purchase", String(minPurchase), "Valor mínimo de compra para usar cashback");
      if (maxDiscountPct !== undefined) await storage.setStoreSetting("cashback_max_discount_pct", String(maxDiscountPct), "Máximo (%) do valor da compra que pode ser abatido com cashback");
      if (enabled !== undefined) await storage.setStoreSetting("cashback_enabled", String(enabled), "Cashback habilitado");
      const saved = {
        minPurchase: Number(await storage.getStoreSetting("cashback_min_purchase") ?? "0"),
        maxDiscountPct: Number(await storage.getStoreSetting("cashback_max_discount_pct") ?? "100"),
        enabled: (await storage.getStoreSetting("cashback_enabled") ?? "true") === "true",
      };
      res.json(saved);
    } catch (error) { next(error); }
  });

  // Customer: get wallet (balance + transactions)
  app.get("/api/cashback/wallet", requireAuth, async (req: any, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Não autenticado" });
      const user = await storage.getUser(userId);
      const transactions = await storage.getUserCashbackTransactions(userId);
      const enabled = (await storage.getStoreSetting("cashback_enabled") ?? "true") === "true";
      const minPurchase = Number(await storage.getStoreSetting("cashback_min_purchase") ?? "0");
      const maxDiscountPct = Number(await storage.getStoreSetting("cashback_max_discount_pct") ?? "100");
      res.json({
        balance: Number(user?.cashbackBalance ?? 0),
        transactions,
        enabled,
        minPurchase,
        maxDiscountPct,
      });
    } catch (error) { next(error); }
  });

  // Admin: manually credit cashback for an order
  app.post("/api/admin/cashback/credit/:orderId", requireAdmin, async (req, res, next) => {
    try {
      const order = await storage.getOrder(req.params.orderId);
      if (!order || !order.userId) return res.status(404).json({ error: "Pedido não encontrado ou sem usuário" });
      await storage.creditCashbackForOrder(order.id, order.userId);
      res.json({ message: "Cashback creditado" });
    } catch (error) { next(error); }
  });

  // Customer: check how much cashback would be applied
  app.post("/api/cashback/preview", requireAuth, async (req: any, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Não autenticado" });
      const { orderTotal, useCashback } = req.body;
      if (!useCashback) return res.json({ discount: 0, newTotal: orderTotal });

      const enabled = (await storage.getStoreSetting("cashback_enabled") ?? "true") === "true";
      if (!enabled) return res.json({ discount: 0, newTotal: orderTotal, error: "Cashback desabilitado" });

      const minPurchase = Number(await storage.getStoreSetting("cashback_min_purchase") ?? "0");
      if (orderTotal < minPurchase) {
        return res.json({ discount: 0, newTotal: orderTotal, error: `Compra mínima de R$ ${minPurchase.toFixed(2)} para usar cashback` });
      }

      const maxDiscountPct = Number(await storage.getStoreSetting("cashback_max_discount_pct") ?? "100");
      const user = await storage.getUser(userId);
      const balance = Number(user?.cashbackBalance ?? 0);
      const maxDiscount = (orderTotal * maxDiscountPct) / 100;
      const discount = Math.min(balance, maxDiscount);
      res.json({ discount: Math.round(discount * 100) / 100, newTotal: Math.max(0, orderTotal - discount) });
    } catch (error) { next(error); }
  });

  // ─────────────────────────────────────────────
  // REFERRAL ROUTES
  // ─────────────────────────────────────────────

  // Public: get referral program info + discount details by code
  app.get("/api/referral/info/:code", async (req, res, next) => {
    try {
      const enabled = (await storage.getStoreSetting("referral_enabled") ?? "true") === "true";
      if (!enabled) return res.status(404).json({ error: "Programa de indicação não ativo" });
      const refCode = await storage.getReferralCodeByCode(req.params.code);
      if (!refCode) return res.status(404).json({ error: "Código de indicação inválido" });
      const referrer = await storage.getUser(refCode.userId);
      const rewardType = (await storage.getStoreSetting("referral_reward_type")) ?? "percentage";
      const rewardValue = Number(await storage.getStoreSetting("referral_reward_value") ?? "10");
      const minReferredPurchase = Number(await storage.getStoreSetting("referral_min_referred_purchase") ?? "0");
      const referredRewardType = (await storage.getStoreSetting("referral_referred_reward_type")) ?? "percentage";
      const referredRewardValue = Number(await storage.getStoreSetting("referral_referred_reward_value") ?? "0");
      res.json({
        valid: true,
        referrerName: referrer?.name?.split(" ")[0] ?? "um amigo",
        rewardType,
        rewardValue,
        minReferredPurchase,
        referredRewardType,
        referredRewardValue,
      });
    } catch (error) { next(error); }
  });

  // Customer: get or create own referral code
  app.get("/api/referral/code", requireAuth, async (req: any, res, next) => {
    try {
      const code = await storage.getOrCreateReferralCode(req.user.id);
      const baseUrl = getBaseUrl(req);
      res.json({ ...code, link: `${baseUrl}/ref/${code.code}` });
    } catch (error) { next(error); }
  });

  // Customer: my referral history
  app.get("/api/referral/my", requireAuth, async (req: any, res, next) => {
    try {
      const list = await storage.getReferralsByReferrer(req.user.id);
      const reward = await storage.getAvailableReferralReward(req.user.id);
      const availableCount = await storage.countAvailableReferralRewards(req.user.id);
      const rewardType = (await storage.getStoreSetting("referral_reward_type")) ?? "percentage";
      const rewardValue = Number(await storage.getStoreSetting("referral_reward_value") ?? "10");
      const minReferrerPurchase = Number(await storage.getStoreSetting("referral_min_referrer_purchase") ?? "0");
      res.json({ referrals: list, availableReward: reward ?? null, availableCount, rewardType, rewardValue, minReferrerPurchase });
    } catch (error) { next(error); }
  });

  // Customer: check referred discount for their first purchase (uses referral code from query)
  app.get("/api/referral/referred-discount", requireAuth, async (req: any, res, next) => {
    try {
      const { code } = req.query;
      if (!code) return res.json({ applicable: false });
      const enabled = (await storage.getStoreSetting("referral_enabled") ?? "true") === "true";
      if (!enabled) return res.json({ applicable: false });
      const refCode = await storage.getReferralCodeByCode(String(code));
      if (!refCode) return res.json({ applicable: false });
      // Must not be self-referral
      if (refCode.userId === req.user.id) return res.json({ applicable: false, reason: "Você não pode usar o seu próprio código" });
      // Check if user is a first-time buyer
      const userOrders = await storage.getUserOrders(req.user.id);
      if (userOrders.length > 0) return res.json({ applicable: false, reason: "Desconto válido apenas para a primeira compra" });
      const referredRewardType = (await storage.getStoreSetting("referral_referred_reward_type")) ?? "percentage";
      const referredRewardValue = Number(await storage.getStoreSetting("referral_referred_reward_value") ?? "0");
      if (referredRewardValue <= 0) return res.json({ applicable: false });
      res.json({ applicable: true, rewardType: referredRewardType, rewardValue: referredRewardValue });
    } catch (error) { next(error); }
  });

  // Customer: check if user has available referral reward (GET for checkout UI)
  app.get("/api/referral/preview", requireAuth, async (req: any, res, next) => {
    try {
      const reward = await storage.getAvailableReferralReward(req.user.id);
      if (!reward) return res.json({ hasReward: false, availableCount: 0 });
      const availableCount = await storage.countAvailableReferralRewards(req.user.id);
      const rewardType = (await storage.getStoreSetting("referral_reward_type")) ?? reward.rewardType ?? "percentage";
      const rewardValue = Number(await storage.getStoreSetting("referral_reward_value") ?? reward.rewardValue ?? "10");
      const minReferrerPurchase = Number(await storage.getStoreSetting("referral_min_referrer_purchase") ?? "0");
      res.json({ hasReward: true, availableCount, rewardType, rewardValue, minReferrerPurchase });
    } catch (error) { next(error); }
  });

  // Customer: apply referral reward at checkout (preview)
  app.post("/api/referral/preview", requireAuth, async (req: any, res, next) => {
    try {
      const { orderTotal } = req.body;
      const reward = await storage.getAvailableReferralReward(req.user.id);
      if (!reward) return res.json({ discount: 0, applicable: false });
      const minPurchase = Number(reward.minReferrerPurchase ?? 0);
      if (orderTotal < minPurchase) {
        return res.json({ discount: 0, applicable: false, reason: `Compra mínima de R$ ${minPurchase.toFixed(2)} para usar o desconto de indicação` });
      }
      let discount = 0;
      if (reward.rewardType === "percentage") {
        discount = (orderTotal * Number(reward.rewardValue)) / 100;
      } else {
        discount = Number(reward.rewardValue);
      }
      discount = Math.min(discount, orderTotal);
      res.json({ discount: Math.round(discount * 100) / 100, applicable: true, reward });
    } catch (error) { next(error); }
  });

  // Admin: get settings
  app.get("/api/admin/referral/settings", requireAdmin, async (_req, res, next) => {
    try {
      res.json({
        enabled: (await storage.getStoreSetting("referral_enabled") ?? "true") === "true",
        minReferredPurchase: Number(await storage.getStoreSetting("referral_min_referred_purchase") ?? "0"),
        rewardType: (await storage.getStoreSetting("referral_reward_type")) ?? "percentage",
        rewardValue: Number(await storage.getStoreSetting("referral_reward_value") ?? "10"),
        minReferrerPurchase: Number(await storage.getStoreSetting("referral_min_referrer_purchase") ?? "0"),
        referredRewardType: (await storage.getStoreSetting("referral_referred_reward_type")) ?? "percentage",
        referredRewardValue: Number(await storage.getStoreSetting("referral_referred_reward_value") ?? "0"),
      });
    } catch (error) { next(error); }
  });

  // Admin: update settings
  app.put("/api/admin/referral/settings", requireAdmin, async (req, res, next) => {
    try {
      const { enabled, minReferredPurchase, rewardType, rewardValue, minReferrerPurchase, referredRewardType, referredRewardValue } = req.body;
      if (enabled !== undefined) await storage.setStoreSetting("referral_enabled", String(enabled), "Programa de indicação habilitado");
      if (minReferredPurchase !== undefined) await storage.setStoreSetting("referral_min_referred_purchase", String(minReferredPurchase), "Compra mínima do indicado para qualificar");
      if (rewardType !== undefined) await storage.setStoreSetting("referral_reward_type", rewardType, "Tipo de recompensa do indicador (percentage/fixed)");
      if (rewardValue !== undefined) await storage.setStoreSetting("referral_reward_value", String(rewardValue), "Valor da recompensa do indicador");
      if (minReferrerPurchase !== undefined) await storage.setStoreSetting("referral_min_referrer_purchase", String(minReferrerPurchase), "Compra mínima do indicador para usar o desconto");
      if (referredRewardType !== undefined) await storage.setStoreSetting("referral_referred_reward_type", referredRewardType, "Tipo de recompensa do indicado (percentage/fixed)");
      if (referredRewardValue !== undefined) await storage.setStoreSetting("referral_referred_reward_value", String(referredRewardValue), "Valor da recompensa do indicado na primeira compra");
      res.json({ message: "Configurações salvas" });
    } catch (error) { next(error); }
  });

  // Admin: list all referrals
  app.get("/api/admin/referral/list", requireAdmin, async (_req, res, next) => {
    try {
      const list = await storage.getAllReferrals(200);
      res.json(list);
    } catch (error) { next(error); }
  });

  return httpServer;
}
