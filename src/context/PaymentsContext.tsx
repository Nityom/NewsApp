import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    writeBatch,
} from '@react-native-firebase/firestore';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { db, stripUndefined } from '@/lib/firebase';
import type { Payment, PaymentStatus } from '@/types/models';

const COLLECTION = 'payments';

interface PaymentsContextValue {
  payments: Payment[];
  isLoading: boolean;
  addPayment: (payment: Payment) => Promise<void>;
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  updateJoiningFeeStatus: (payment: Payment, status: Extract<PaymentStatus, 'paid' | 'failed'>) => Promise<void>;
}

const PaymentsContext = createContext<PaymentsContextValue | null>(null);

export function PaymentsProvider({ children }: { children: ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        const next = snapshot.docs
          .map((paymentDoc) => paymentDoc.data() as Payment)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPayments(next);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, []);

  const addPayment = useCallback(async (payment: Payment) => {
    await setDoc(doc(db, COLLECTION, payment.id), stripUndefined(payment));
    setPayments((current) => [payment, ...current.filter((item) => item.id !== payment.id)]);
  }, []);

  const updatePaymentStatus = useCallback(async (id: string, status: PaymentStatus) => {
    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, COLLECTION, id), { status, updatedAt });
    setPayments((current) => current.map((payment) =>
      payment.id === id ? { ...payment, status, updatedAt } : payment,
    ));
  }, []);

  const updateJoiningFeeStatus = useCallback(async (
    payment: Payment,
    status: Extract<PaymentStatus, 'paid' | 'failed'>,
  ) => {
    const updatedAt = new Date().toISOString();
    const updatedPayment = { ...payment, status, updatedAt };
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTION, payment.id), stripUndefined(updatedPayment), { merge: true });
    batch.update(
      doc(db, 'reporters', payment.reporterId),
      status === 'paid'
        ? { requestStatus: 'approved', isActive: true, isVerified: true }
        : { requestStatus: 'awaiting_payment' },
    );
    await batch.commit();
    setPayments((current) => [updatedPayment, ...current.filter((item) => item.id !== payment.id)]);
  }, []);

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