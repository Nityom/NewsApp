/// <reference types="node" />

'use node';

import type { UserIdentity } from 'convex/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';

import { internal } from './_generated/api';
import { action, internalAction } from './_generated/server';

const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg';
const CASHFREE_API_VERSION = '2026-01-01';
const CONVENIENCE_FEE_RATE = 0.023;

function requiredEnvironment(name: 'CASHFREE_APP_ID' | 'CASHFREE_SECRET_KEY') {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured in Convex.`);
  return value;
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function cashfreeRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${CASHFREE_API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': requiredEnvironment('CASHFREE_APP_ID'),
      'x-client-secret': requiredEnvironment('CASHFREE_SECRET_KEY'),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Cashfree could not process the payment request.');
  return body;
}

function identityEmail(identity: UserIdentity | null) {
  return identity && typeof identity.email === 'string'
    ? identity.email.toLowerCase()
    : null;
}

async function verifyAndApprove(ctx: any, orderId: string) {
  const order = await cashfreeRequest(`/orders/${encodeURIComponent(orderId)}`);
  if (order.order_status !== 'PAID') throw new Error('Cashfree has not confirmed this payment yet.');
  await ctx.runMutation(internal.cashfreeData.approvePaidOrder, {
    orderId,
    orderAmount: order.order_amount,
    orderCurrency: order.order_currency,
  });
  return order;
}

export const createJoiningFeeOrder = action({
  args: { reporterId: v.string() },
  handler: async (ctx, { reporterId }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before making a payment.');
    const reporter = await ctx.runQuery(internal.cashfreeData.getReporterForOrder, { reporterId });
    if (!reporter) throw new Error('Reporter record not found.');
    if (String(reporter.email).toLowerCase() !== email) throw new Error('This payment request belongs to another account.');
    if (reporter.requestStatus !== 'awaiting_payment' || !Number.isFinite(reporter.joinFeeAmount) || reporter.joinFeeAmount <= 0) {
      throw new Error('There is no joining fee ready for payment.');
    }

    const baseAmount = roundCurrency(reporter.joinFeeAmount);
    const convenienceFee = roundCurrency(baseAmount * CONVENIENCE_FEE_RATE);
    const totalAmount = roundCurrency(baseAmount + convenienceFee);
    const orderId = `join_${reporterId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 24)}_${Date.now()}`.slice(0, 45);
    const customerId = reporterId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 50);
    const phoneDigits = String(reporter.phone || '').replace(/\D/g, '').slice(-10);
    if (customerId.length < 3) throw new Error('The reporter ID is not valid for payment.');
    if (phoneDigits.length !== 10) throw new Error('A valid 10-digit phone number is required.');

    const order = await cashfreeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        order_amount: totalAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: customerId,
          customer_name: reporter.name,
          customer_email: reporter.email,
          customer_phone: phoneDigits,
        },
        order_meta: { notify_url: 'https://quirky-rooster-395.convex.site/cashfree-webhook' },
        order_note: 'Education News reporter joining fee',
        order_tags: { reporter_id: reporterId, purpose: 'joining_fee' },
      }),
    });

    const createdAt = new Date().toISOString();
    await ctx.runMutation(internal.cashfreeData.recordOrder, {
      payment: {
        id: orderId,
        reporterId,
        reporterName: reporter.name,
        reporterAvatar: reporter.avatar || '',
        amount: totalAmount,
        baseAmount,
        convenienceFee,
        convenienceFeeRate: CONVENIENCE_FEE_RATE,
        status: 'pending',
        method: 'Cashfree',
        articlesCount: 0,
        period: 'Joining Fee',
        purpose: 'joining_fee',
        transactionId: order.cf_order_id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    return { orderId: order.order_id, paymentSessionId: order.payment_session_id, baseAmount, convenienceFee, totalAmount };
  },
});

export const verifyJoiningFeeOrder = action({
  args: { orderId: v.string() },
  handler: async (ctx, { orderId }) => {
    const email = identityEmail(await ctx.auth.getUserIdentity());
    if (!email) throw new Error('Sign in before verifying a payment.');
    const owner = await ctx.runQuery(internal.cashfreeData.getPaymentOwner, { orderId });
    if (!owner) throw new Error('Payment record not found.');
    if (String(owner.reporterEmail).toLowerCase() !== email) throw new Error('This payment belongs to another account.');
    await verifyAndApprove(ctx, orderId);
    return { paid: true };
  },
});

export const verifyWebhook = internalAction({
  args: { rawBody: v.string(), signature: v.string(), timestamp: v.string() },
  handler: async (ctx, args) => {
    const expected = crypto.createHmac('sha256', requiredEnvironment('CASHFREE_SECRET_KEY'))
      .update(args.timestamp + args.rawBody)
      .digest('base64');
    const matches = args.signature.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(args.signature), Buffer.from(expected));
    if (!matches) throw new Error('Invalid Cashfree webhook signature.');
    const payload = JSON.parse(args.rawBody);
    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      await verifyAndApprove(ctx, payload.data?.order?.order_id);
    }
  },
});