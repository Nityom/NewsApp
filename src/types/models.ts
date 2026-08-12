export type ArticleStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'trashed';

export interface Reporter {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  city: string;
  joinedAt: string;
  isVerified: boolean;
  isActive: boolean;
  articlesCount: number;
  approvedCount: number;
  rejectedCount: number;
  rating: number;
  totalEarnings: number;
  /** Gaon (village) provided at join request time. */
  village?: string;
  /** Full residential address. */
  address?: string;
  /** Optional Aadhar number. */
  aadharNumber?: string;
  /** Passport-style photo captured/uploaded at join request time. */
  photo?: string;
  /**
   * Admin approval state for the join request:
   * pending -> admin sets a joining fee -> awaiting_payment -> reporter pays and confirms -> payment_submitted
   * -> admin confirms receipt -> approved. Existing/seeded reporters default to 'approved'.
   */
  requestStatus: 'pending' | 'awaiting_payment' | 'payment_submitted' | 'approved' | 'rejected';
  requestRejectionReason?: string;
  /** Joining fee amount (in ₹) set by admin, shown to the reporter to pay before approval. */
  joinFeeAmount?: number;
  /** Random, year-stamped ID card number assigned at join request time, e.g. "RPT-2026-483920". */
  reporterCode?: string;
}

export interface ArticleSection {
  id: string;
  title: string;
  content: string;
  image?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  banner: string;
  images: string[];
  advertisements: string[];
  sections?: ArticleSection[];
  status: ArticleStatus;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  reporterPhone?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  /** दिनांक date shown in the publication info bar; synced to approval date, editable by admin. */
  registrationDate?: string;
  views: number;
  likes: number;
  readTimeMinutes: number;
  isFeatured?: boolean;
}

export type NotificationType =
  | 'article_approved'
  | 'article_rejected'
  | 'article_pending'
  | 'payment'
  | 'system'
  | 'reporter_joined';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  articleId?: string;
  /** Recipient for reporter alerts, or the related reporter for admin alerts and deep-linking. */
  reporterId?: string;
  audience: 'reporter' | 'admin';
  pushStatus?: 'pending' | 'accepted' | 'failed';
  pushRecipientCount?: number;
  pushError?: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface Payment {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  amount: number;
  status: PaymentStatus;
  method: string;
  articlesCount: number;
  period: string;
  createdAt: string;
  updatedAt?: string;
  transactionId?: string;
  purpose?: 'joining_fee' | 'admin_payment' | 'payout';
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  city: string;
  role: 'reporter' | 'admin';
  isVerified: boolean;
  isSubscribed: boolean;
  joinedAt: string;
}

