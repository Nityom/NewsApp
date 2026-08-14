export interface JoiningFeeOrder {
  orderId: string;
  paymentSessionId: string;
  baseAmount: number;
  convenienceFee: number;
  totalAmount: number;
}

type CreateOrderAction = (args: { reporterId: string }) => Promise<JoiningFeeOrder>;
type VerifyOrderAction = (args: { orderId: string }) => Promise<{ paid: boolean }>;

export async function createJoiningFeeOrder(runAction: CreateOrderAction, reporterId: string): Promise<JoiningFeeOrder> {
  return runAction({ reporterId });
}

export async function verifyJoiningFeeOrder(runAction: VerifyOrderAction, orderId: string): Promise<void> {
  const result = await runAction({ orderId });
  if (!result.paid) throw new Error('Cashfree has not confirmed this payment yet.');
}