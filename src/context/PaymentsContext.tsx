import { useMutation, useQuery } from 'convex/react';
import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';

import type { Payment, PaymentStatus } from '@/types/models';
import { api } from '@convex/_generated/api';

interface PaymentsContextValue {
  payments: Payment[];
  isLoading: boolean;
  addPayment: (payment: Payment) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  updateJoiningFeeStatus: (payment: Payment, status: Extract<PaymentStatus, 'paid' | 'failed'>) => Promise<void>;
}

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const result = useQuery(api.payments.list) as Payment[] | undefined;
  const payments = useMemo(
    () => [...(result ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [result],
  );
  const isLoading = result === undefined;
  const upsertPayment = useMutation(api.payments.upsert);
  const setStatus = useMutation(api.payments.updateStatus);
  const setJoiningFeeStatus = useMutation(api.payments.updateJoiningFeeStatus);

  const addPayment = useCallback(async (payment: Payment) => {
    await upsertPayment({ payment });
  }, [upsertPayment]);

  const updatePaymentStatus = useCallback(async (id: string, status: PaymentStatus) => {
    await setStatus({ id, status });
  }, [setStatus]);

  const updateJoiningFeeStatus = useCallback(async (
    payment: Payment,
    status: Extract<PaymentStatus, 'paid' | 'failed'>,
  ) => {
    await setJoiningFeeStatus({ payment, status });
  }, [setJoiningFeeStatus]);

  const value = useMemo(
    () => ({ payments, isLoading, addPayment, updatePaymentStatus, updateJoiningFeeStatus }),
    [payments, isLoading, addPayment, updatePaymentStatus, updateJoiningFeeStatus],
  );

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>;
}

export function usePayments() {
  const context = useContext(PaymentsContext);
  if (!context) throw new Error('usePayments must be used within a PaymentsProvider');
  return context;
}