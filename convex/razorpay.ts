/// <reference types="node" />

'use node';

import type { UserIdentity } from 'convex/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';

import { internal } from './_generated/api';
import { action, internalAction } from './_generated/server';

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';
const CONVENIENCE_FEE_RATE = 0.023;

function requiredEnvironment(name: 'RAZORPAY_KEY_ID' | 'RAZORPAY_KEY_SECRET') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured in Convex.`);
  return value;
}

function optionalEnvironment(name: string) {
  return process.env[name] || '';
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function razorpayRequest(path: string, options: RequestInit = {}) {
  const keyId = requiredEnvironment('RAZORPAY_KEY_ID');
  const keySecret = requiredEnvironment('RAZORPAY_KEY_SECRET');
  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch(`${RAZORPAY_API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = body.error?.description || body.message || 'Razorpay could not process the payment request.';
    throw new Error(errorMsg);
  }
  return body;
}

function identityEmail(identity: UserIdentity | null) {
  return identity && typeof identity.email === 'string'
    ? identity.email.toLowerCase()
    : null;
}

async function verifyAndApprove(
  ctx: any,
  orderId: string,
  razorpayPaymentId?: string,
) {
  const order = await razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
  const amountInRupees = order.amount / 100;

  await ctx.runMutation(internal.razorpayData.approvePaidOrder, {
    orderId,
    orderAmount: amountInRupees,
    orderCurrency: order.currency,
    transactionId: razorpayPaymentId,
  });
  return order;
}

export const createJoiningFeeOrder = action({
  args: { reporterId: v.string() },
  handler: async (ctx, { reporterId }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before making a payment.');
    const reporter = await ctx.runQuery(internal.razorpayData.getReporterForOrder, { reporterId });
    if (!reporter) throw new Error('Reporter record not found.');
    if (String(reporter.email).toLowerCase() !== email) throw new Error('This payment request belongs to another account.');
    if (reporter.requestStatus !== 'awaiting_payment' || !Number.isFinite(reporter.joinFeeAmount) || reporter.joinFeeAmount <= 0) {
      throw new Error('There is no joining fee ready for payment.');
    }

    const baseAmount = roundCurrency(reporter.joinFeeAmount);
    const convenienceFee = roundCurrency(baseAmount * CONVENIENCE_FEE_RATE);
    const totalAmount = roundCurrency(baseAmount + convenienceFee);
    const amountInPaise = Math.round(totalAmount * 100);

    const receipt = `join_${reporterId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20)}_${Date.now()}`.slice(0, 40);

    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          reporterId,
          reporterEmail: reporter.email,
          purpose: 'joining_fee',
        },
      }),
    });

    const keyId = requiredEnvironment('RAZORPAY_KEY_ID');
    const createdAt = new Date().toISOString();
    await ctx.runMutation(internal.razorpayData.recordOrder, {
      payment: {
        id: order.id,
        reporterId,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar || '',
        amount: totalAmount,
        baseAmount,
        convenienceFee,
        convenienceFeeRate: CONVENIENCE_FEE_RATE,
        status: 'pending',
        method: 'Razorpay',
        articlesCount: 0,
        period: 'Joining Fee',
        purpose: 'joining_fee',
        transactionId: '',
        createdAt,
        updatedAt: createdAt,
      },
    });

    return {
      orderId: order.id,
      keyId,
      baseAmount,
      convenienceFee,
      totalAmount,
      currency: 'INR',
    };
  },
});

export const verifyJoiningFeeOrder = action({
  args: {
    orderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, { orderId, razorpayPaymentId, razorpaySignature }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before verifying a payment.');
    const owner = await ctx.runQuery(internal.razorpayData.getPaymentOwner, { orderId });
    if (!owner) throw new Error('Payment record not found.');
    if (String(owner.reporterEmail).toLowerCase() !== email) throw new Error('This payment belongs to another account.');

    // 1. Verify HMAC SHA256 signature
    const secret = requiredEnvironment('RAZORPAY_KEY_SECRET');
    const payload = `${orderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isMatch =
      razorpaySignature.length === generatedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(razorpaySignature), Buffer.from(generatedSignature));

    if (!isMatch) {
      throw new Error('Invalid Razorpay payment signature.');
    }

    // 2. Confirm order details with Razorpay API and approve
    await verifyAndApprove(ctx, orderId, razorpayPaymentId);
    return { paid: true };
  },
});

export const createAdminPaymentOrder = action({
  args: {
    reporterId: v.string(),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { reporterId, amount, description }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before making a payment.');
    const reporter = await ctx.runQuery(internal.razorpayData.getReporterForOrder, { reporterId });
    if (!reporter) throw new Error('Reporter record not found.');
    if (String(reporter.email).toLowerCase() !== email) throw new Error('This payment belongs to another account.');
    if (!Number.isFinite(amount) || amount < 1) {
      throw new Error('Please enter a valid amount (minimum ₹1).');
    }

    const baseAmount = roundCurrency(amount);
    const convenienceFee = roundCurrency(baseAmount * CONVENIENCE_FEE_RATE);
    const totalAmount = roundCurrency(baseAmount + convenienceFee);
    const amountInPaise = Math.round(totalAmount * 100);

    const receipt = `pay_${reporterId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20)}_${Date.now()}`.slice(0, 40);

    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          reporterId,
          reporterEmail: reporter.email,
          purpose: 'admin_payment',
          description: description || 'Payment to Admin',
        },
      }),
    });

    const keyId = requiredEnvironment('RAZORPAY_KEY_ID');
    const createdAt = new Date().toISOString();
    await ctx.runMutation(internal.razorpayData.recordOrder, {
      payment: {
        id: order.id,
        reporterId,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar || '',
        amount: totalAmount,
        baseAmount,
        convenienceFee,
        convenienceFeeRate: CONVENIENCE_FEE_RATE,
        status: 'pending',
        method: 'Razorpay',
        articlesCount: 0,
        period: description || 'Payment to Admin',
        purpose: 'admin_payment',
        transactionId: '',
        createdAt,
        updatedAt: createdAt,
      },
    });

    return {
      orderId: order.id,
      keyId,
      baseAmount,
      convenienceFee,
      totalAmount,
      currency: 'INR',
    };
  },
});

export const verifyAdminPaymentOrder = action({
  args: {
    orderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, { orderId, razorpayPaymentId, razorpaySignature }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before verifying a payment.');
    const owner = await ctx.runQuery(internal.razorpayData.getPaymentOwner, { orderId });
    if (!owner) throw new Error('Payment record not found.');
    if (String(owner.reporterEmail).toLowerCase() !== email) throw new Error('This payment belongs to another account.');

    const secret = requiredEnvironment('RAZORPAY_KEY_SECRET');
    const payload = `${orderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const isMatch =
      razorpaySignature.length === generatedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(razorpaySignature), Buffer.from(generatedSignature));

    if (!isMatch) {
      throw new Error('Invalid Razorpay payment signature.');
    }

    await verifyAndApprove(ctx, orderId, razorpayPaymentId);
    return { paid: true };
  },
});

export const verifyWebhook = internalAction({
  args: { rawBody: v.string(), signature: v.string() },
  handler: async (ctx, args) => {
    const webhookSecret = optionalEnvironment('RAZORPAY_WEBHOOK_SECRET') || requiredEnvironment('RAZORPAY_KEY_SECRET');
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(args.rawBody)
      .digest('hex');

    const matches =
      args.signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(args.signature), Buffer.from(expected));

    if (!matches) throw new Error('Invalid Razorpay webhook signature.');

    const payload = JSON.parse(args.rawBody);
    if (payload.event === 'order.paid') {
      const orderId = payload.payload?.order?.entity?.id;
      const paymentId = payload.payload?.payment?.entity?.id;
      if (orderId) {
        await verifyAndApprove(ctx, orderId, paymentId);
      }
    } else if (payload.event === 'payment.captured') {
      const orderId = payload.payload?.payment?.entity?.order_id;
      const paymentId = payload.payload?.payment?.entity?.id;
      if (orderId) {
        await verifyAndApprove(ctx, orderId, paymentId);
      }
    }
  },
});
