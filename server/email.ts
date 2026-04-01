import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const getTemplatesDir = (): string => {
  const prodPath = path.join(process.cwd(), 'dist', 'templates');
  const devPath = path.join(process.cwd(), 'server', 'templates');
  
  if (fs.existsSync(prodPath)) {
    return prodPath;
  }
  return devPath;
};

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

const getEmailConfig = (): EmailConfig => {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'Empório Gelada <noreply@emporiogelada.com.br>',
  };
};

const createTransporter = () => {
  const config = getEmailConfig();
  
  if (!config.auth.user || !config.auth.pass) {
    console.warn('SMTP credentials not configured. Email sending will be disabled.');
    return null;
  }
  
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: {
      rejectUnauthorized: false
    }
  });
};

const loadTemplate = (templateName: string): Handlebars.TemplateDelegate => {
  const templatePath = path.join(getTemplatesDir(), `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, 'utf-8');
  return Handlebars.compile(templateSource);
};

interface VerifyEmailData {
  name: string;
  verificationUrl: string;
  year: number;
}

interface ResetPasswordData {
  name: string;
  resetUrl: string;
  year: number;
}

interface OrderItem {
  name: string;
  size: string;
  quantity: number;
  priceFormatted: string;
}

interface OrderConfirmationData {
  customerName: string;
  orderNumber: string;
  statusClass: string;
  statusText: string;
  items: OrderItem[];
  subtotal: string;
  discount?: string;
  couponCode?: string;
  shipping: string;
  shippingMethod: string;
  total: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingPhone?: string;
  paymentMethod: string;
  orderUrl: string;
  year: number;
}

interface OrderStatusUpdateData {
  customerName: string;
  orderNumber: string;
  statusTitle: string;
  statusMessage: string;
  statusIcon: string;
  statusClass: string;
  statusText: string;
  trackingCode?: string;
  trackingUrl?: string;
  orderUrl: string;
  year: number;
}

interface AdminNewOrderData {
  orderNumber: string;
  total: string;
  statusClass: string;
  statusText: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingPhone?: string;
  items: OrderItem[];
  subtotal: string;
  discount?: string;
  couponCode?: string;
  shipping: string;
  shippingMethod: string;
  adminUrl: string;
  orderDate: string;
  orderTime: string;
  year: number;
}

export const sendVerificationEmail = async (
  to: string,
  data: Omit<VerifyEmailData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping verification email.');
    console.log(`Would send verification email to ${to} with URL: ${data.verificationUrl}`);
    return false;
  }
  
  try {
    const template = loadTemplate('verify-email');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: 'Verifique seu E-mail - Empório Gelada',
      html,
    });
    
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

export const sendPasswordResetEmail = async (
  to: string,
  data: Omit<ResetPasswordData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping password reset email.');
    console.log(`Would send password reset email to ${to} with URL: ${data.resetUrl}`);
    return false;
  }
  
  try {
    const template = loadTemplate('reset-password');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: 'Recuperar Senha - Empório Gelada',
      html,
    });
    
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

export const testEmailConnection = async (): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured.');
    return false;
  }
  
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection verification failed:', error);
    return false;
  }
};

export const sendOrderConfirmationEmail = async (
  to: string,
  data: Omit<OrderConfirmationData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping order confirmation email.');
    return false;
  }
  
  try {
    const template = loadTemplate('order-confirmation');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: `Pedido #${data.orderNumber} Confirmado - Empório Gelada`,
      html,
    });
    
    console.log(`Order confirmation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
};

export const sendOrderStatusUpdateEmail = async (
  to: string,
  data: Omit<OrderStatusUpdateData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping order status update email.');
    return false;
  }
  
  try {
    const template = loadTemplate('order-status-update');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: `Atualização do Pedido #${data.orderNumber} - Empório Gelada`,
      html,
    });
    
    console.log(`Order status update email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending order status update email:', error);
    return false;
  }
};

export const sendAdminNewOrderEmail = async (
  to: string,
  data: Omit<AdminNewOrderData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping admin new order email.');
    return false;
  }
  
  try {
    const template = loadTemplate('admin-new-order');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: `Novo Pedido #${data.orderNumber} - Empório Gelada`,
      html,
    });
    
    console.log(`Admin new order notification sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending admin new order email:', error);
    return false;
  }
};

const getStatusInfo = (status: string): { 
  title: string; 
  message: string; 
  icon: string; 
  class: string; 
  text: string 
} => {
  const statusMap: Record<string, { title: string; message: string; icon: string; class: string; text: string }> = {
    pending: {
      title: 'Pedido Pendente',
      message: 'Seu pedido está aguardando confirmação de pagamento.',
      icon: '⏳',
      class: 'pending',
      text: 'Pendente'
    },
    paid: {
      title: 'Pagamento Confirmado!',
      message: 'Seu pagamento foi confirmado e estamos preparando seu pedido.',
      icon: '✅',
      class: 'paid',
      text: 'Pago'
    },
    processing: {
      title: 'Pedido em Preparação',
      message: 'Estamos preparando seu pedido com todo carinho.',
      icon: '📦',
      class: 'processing',
      text: 'Preparando'
    },
    shipped: {
      title: 'Pedido Enviado!',
      message: 'Seu pedido foi despachado e está a caminho!',
      icon: '🚚',
      class: 'shipped',
      text: 'Enviado'
    },
    delivered: {
      title: 'Pedido Entregue!',
      message: 'Seu pedido foi entregue com sucesso. Esperamos que você ame suas peças!',
      icon: '🎉',
      class: 'delivered',
      text: 'Entregue'
    },
    cancelled: {
      title: 'Pedido Cancelado',
      message: 'Infelizmente seu pedido foi cancelado.',
      icon: '❌',
      class: 'cancelled',
      text: 'Cancelado'
    }
  };
  
  return statusMap[status] || statusMap.pending;
};

interface SupportMessageData {
  ticketId: string;
  ticketSubject: string;
  senderName: string;
  senderEmail: string;
  messageContent: string;
  isNewTicket: boolean;
  ticketUrl: string;
  year: number;
}

export const sendSupportMessageEmail = async (
  to: string,
  data: Omit<SupportMessageData, 'year'>
): Promise<boolean> => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('Email transporter not configured. Skipping support message email.');
    return false;
  }
  
  try {
    const template = loadTemplate('support-message');
    const html = template({ ...data, year: new Date().getFullYear() });
    const config = getEmailConfig();
    
    const subjectPrefix = data.isNewTicket ? 'Novo Ticket de Suporte' : 'Nova Mensagem de Suporte';
    
    await transporter.sendMail({
      from: config.from,
      to,
      subject: `${subjectPrefix}: ${data.ticketSubject} - Empório Gelada`,
      html,
    });
    
    console.log(`Support message email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending support message email:', error);
    return false;
  }
};

export { getStatusInfo };
