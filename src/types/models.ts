export type ArticleStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'trashed';

export type Category =
  | 'Education'
  | 'Exams'
  | 'Admissions'
  | 'Scholarships'
  | 'Technology'
  | 'Career'
  | 'Policy'
  | 'Campus Life';

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
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  banner: string;
  images: string[];
  category: Category;
  status: ArticleStatus;
  reporterId: string;
  reporterName: string;
  reporterAvatar: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
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
  transactionId?: string;
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

export interface AnalyticsSummary {
  totalArticles: number;
  totalReporters: number;
  totalViews: number;
  totalRevenue: number;
  pendingReview: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  viewsTrend: number[];
  articlesTrend: number[];
  topCategories: { category: Category; count: number }[];
}
