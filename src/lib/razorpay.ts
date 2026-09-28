export interface RazorpayJoiningFeeOrder {
  orderId: string;
  keyId: string;
  baseAmount: number;
  convenienceFee: number;
  totalAmount: number;
  currency: string;
}

export interface RazorpayPaymentSuccessData {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

type CreateOrderAction = (args: { reporterId: string }) => Promise<RazorpayJoiningFeeOrder>;
type VerifyOrderAction = (args: {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => Promise<{ paid: boolean }>;

type CreateAdminPaymentAction = (args: {
  reporterId: string;
  amount: number;
  description?: string;
}) => Promise<RazorpayJoiningFeeOrder>;

export async function createJoiningFeeOrder(
  runAction: CreateOrderAction,
  reporterId: string,
): Promise<RazorpayJoiningFeeOrder> {
  return runAction({ reporterId });
}

export async function verifyJoiningFeeOrder(
  runAction: VerifyOrderAction,
  args: {
    orderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
): Promise<void> {
  const result = await runAction(args);
  if (!result.paid) throw new Error('Razorpay has not confirmed this payment yet.');
}

export async function createAdminPaymentOrder(
  runAction: CreateAdminPaymentAction,
  args: { reporterId: string; amount: number; description?: string },
): Promise<RazorpayJoiningFeeOrder> {
  return runAction(args);
}

export async function verifyAdminPaymentOrder(
  runAction: VerifyOrderAction,
  args: {
    orderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  },
): Promise<void> {
  const result = await runAction(args);
  if (!result.paid) throw new Error('Razorpay has not confirmed this payment yet.');
}
