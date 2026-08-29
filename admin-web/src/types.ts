export type ArticleStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'trashed';

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
  registrationDate?: string;
  views: number;
  likes: number;
  readTimeMinutes: number;
  isFeatured?: boolean;
}

export type ReporterStatus = 'pending' | 'awaiting_payment' | 'payment_submitted' | 'approved' | 'rejected';

export interface Reporter {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  city: string;
  village?: string;
  address?: string;
  aadharNumber?: string;
  photo?: string;
  designation?: string;
  joinedAt: string;
  isVerified: boolean;
  isActive: boolean;
  articlesCount: number;
  approvedCount: number;
  rejectedCount: number;
  rating: number;
  totalEarnings: number;
  requestStatus: ReporterStatus;
  requestRejectionReason?: string;
  joinFeeAmount?: number;
  reporterCode?: string;
}

export type PublicReporterCard = Pick<Reporter, 'id' | 'name' | 'email' | 'phone' | 'avatar' | 'photo' | 'city' | 'village' | 'designation' | 'reporterCode' | 'joinedAt' | 'isActive' | 'isVerified' | 'requestStatus'>;

export type PaymentStatus = 'paid' | 'pending' | 'failed';

export interface Payment {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  amount: number;
  baseAmount?: number;
  convenienceFee?: number;
  convenienceFeeRate?: number;
  status: PaymentStatus;
  method: string;
  articlesCount: number;
  period: string;
  createdAt: string;
  updatedAt?: string;
  transactionId?: string;
  purpose?: 'joining_fee' | 'admin_payment' | 'payout';
}

export interface AppNotification {
  id: string;
  type: 'article_approved' | 'article_rejected' | 'article_pending' | 'payment' | 'system' | 'reporter_joined';
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  articleId?: string;
  reporterId?: string;
  audience: 'reporter' | 'admin';
  pushStatus?: 'pending' | 'accepted' | 'failed';
  pushRecipientCount?: number;
  pushError?: string;
}

export interface PublicationInfo {
  year: string;
  issueNumber: string;
  price: string;
}
