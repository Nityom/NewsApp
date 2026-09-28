declare module 'react-native-razorpay' {
  export interface RazorpayOptions {
    description?: string;
    image?: string;
    currency: string;
    key: string;
    amount: number;
    name: string;
    order_id: string;
    prefill?: {
      email?: string;
      contact?: string;
      name?: string;
      method?: string;
    };
    theme?: {
      color?: string;
      backdrop_color?: string;
    };
    notes?: Record<string, string>;
    modal?: {
      backdropclose?: boolean;
      escape?: boolean;
      handleback?: boolean;
      confirm_close?: boolean;
      ondismiss?: () => void;
      animation?: boolean;
    };
    retry?: {
      enabled?: boolean;
      max_count?: number;
    };
    send_sms_hash?: boolean;
    allow_rotation?: boolean;
  }

  export interface RazorpaySuccessResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }

  export interface RazorpayErrorResponse {
    code: number;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }

  export default class RazorpayCheckout {
    static open(
      options: RazorpayOptions,
      successCallback?: (data: RazorpaySuccessResponse) => void,
      errorCallback?: (error: RazorpayErrorResponse) => void,
    ): Promise<RazorpaySuccessResponse>;

    static onExternalWalletSelection(
      externalWalletCallback: (data: any) => void,
    ): void;
  }
}
