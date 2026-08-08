import {
    AnalyticsSummary,
    AppNotification,
    Article,
    Category,
    CurrentUser,
    Payment,
    Reporter,
} from '@/types/models';

const categories: Category[] = [
  'Education',
  'Exams',
  'Admissions',
  'Scholarships',
  'Technology',
  'Career',
  'Policy',
  'Campus Life',
];

function avatarFor(seed: string) {
  return `https://i.pravatar.cc/150?u=${seed}`;
}

function bannerFor(seed: string, w = 800, h = 500) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

export const currentReporter: CurrentUser = {
  id: 'r-001',
  name: 'Ananya Sharma',
  email: 'ananya.sharma@enr.app',
  phone: '+91 98765 43210',
  avatar: avatarFor('ananya-sharma'),
  bio: 'Education correspondent covering exams, admissions and campus stories across India.',
  city: 'Bengaluru, India',
  role: 'reporter',
  isVerified: true,
  isSubscribed: true,
  joinedAt: '2023-06-12T00:00:00.000Z',
};

export const currentAdmin: CurrentUser = {
  id: 'a-001',
  name: 'Rahul Mehta',
  email: 'rahul.mehta@enr.app',
  phone: '+91 90000 11122',
  avatar: avatarFor('rahul-mehta'),
  bio: 'Content operations administrator.',
  city: 'Mumbai, India',
  role: 'admin',
  isVerified: true,
  isSubscribed: true,
  joinedAt: '2022-01-04T00:00:00.000Z',
};

const reporterNames = [
  'Ananya Sharma',
  'Vikram Rao',
  'Meera Iyer',
  'Karan Malhotra',
  'Priya Nair',
  'Arjun Desai',
  'Sneha Kulkarni',
  'Rohit Verma',
  'Divya Pillai',
  'Aditya Kapoor',
];

const cities = [
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Pune',
  'Chennai',
  'Hyderabad',
  'Kolkata',
  'Ahmedabad',
];

export const mockReporters: Reporter[] = reporterNames.map((name, i) => {
  const seed = name.toLowerCase().replace(/\s+/g, '-');
  const approved = 12 + i * 3;
  const rejected = i % 3;
  return {
    id: `rep-${i + 1}`,
    name,
    email: `${seed}@enr.app`,
    phone: `+91 9${(800000000 + i * 12345).toString().slice(0, 9)}`,
    avatar: avatarFor(seed),
    bio: `Education reporter based in ${cities[i % cities.length]}, focused on ${categories[i % categories.length].toLowerCase()} stories.`,
    city: cities[i % cities.length],
    joinedAt: new Date(Date.now() - i * 40 * 24 * 60 * 60 * 1000).toISOString(),
    isVerified: i % 4 !== 0,
    isActive: i % 5 !== 0,
    articlesCount: approved + rejected + 2,
    approvedCount: approved,
    rejectedCount: rejected,
    rating: Number((3.6 + (i % 5) * 0.28).toFixed(1)),
    totalEarnings: 4200 + i * 950,
    requestStatus: 'approved',
  };
});

const titles = [
  'CBSE Announces Revised Board Exam Schedule for 2026',
  'IIT Admissions: New Reservation Policy Explained',
  'Top 10 Scholarships for Engineering Students This Year',
  'How AI Tools Are Reshaping Classroom Learning',
  'State Universities Roll Out Hybrid Semester Model',
  'NEET Aspirants Get Extra Attempt Window',
  'Campus Placement Trends: What Recruiters Want in 2026',
  'Ministry Unveils New National Curriculum Framework',
  'Study Abroad: Visa Rules Every Student Must Know',
  'Skill-Based Diplomas See Record Enrollment Surge',
  'Digital Libraries Expand Access in Rural Colleges',
  'UGC Tightens Norms for Distance Learning Degrees',
  'Coding Bootcamps vs Traditional CS Degrees',
  'Girls Outperform Boys in Latest Board Results',
  'New Research Grants Announced for STEM Undergrads',
];

const summaries = [
  'A detailed breakdown of what students and parents need to know before the new academic session begins.',
  'Education ministry officials confirm the changes will roll out starting next semester nationwide.',
  'Experts weigh in on how this will affect enrollment numbers and campus infrastructure planning.',
  'The announcement follows months of consultation with state education boards and student unions.',
  'Here is everything you need to prepare, including deadlines, eligibility, and required documents.',
];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const statuses: Article['status'][] = ['draft', 'pending', 'approved', 'rejected'];

export const mockArticles: Article[] = titles.map((title, i) => {
  const reporter = pick(mockReporters, i);
  const status = pick(statuses, i);
  const seed = `article-${i}`;
  return {
    id: `art-${i + 1}`,
    title,
    summary: pick(summaries, i),
    content:
      `${pick(summaries, i)}\n\nEducation authorities have been closely monitoring the situation, and officials say the new guidelines aim to bring consistency across institutions. Students are advised to regularly check official portals for updates.\n\nIn related developments, several state boards have indicated they may adopt similar frameworks over the coming academic year, citing improved outcomes in pilot programs conducted earlier.`,
    banner: bannerFor(seed),
    images: [bannerFor(`${seed}-1`, 600, 400), bannerFor(`${seed}-2`, 600, 400)],
    advertisements: i % 2 === 0 ? [bannerFor(`${seed}-ad`, 800, 500)] : [],
    category: pick(categories, i),
    status,
    reporterId: reporter.id,
    reporterName: reporter.name,
    reporterAvatar: reporter.avatar,
    createdAt: daysAgo(i + 2),
    updatedAt: daysAgo(i),
    submittedAt: status !== 'draft' ? daysAgo(i + 1) : undefined,
    reviewedAt: status === 'approved' || status === 'rejected' ? daysAgo(i) : undefined,
    rejectionReason:
      status === 'rejected' ? 'Needs additional sourcing and fact verification before publishing.' : undefined,
    views: status === 'approved' ? 800 + i * 340 : 0,
    likes: status === 'approved' ? 40 + i * 12 : 0,
    readTimeMinutes: 3 + (i % 4),
    isFeatured: status === 'approved' && i % 4 === 0,
  };
});

export const mockNotifications: AppNotification[] = [
  {
    id: 'ntf-1',
    type: 'article_approved',
    title: 'Article Approved',
    message: 'Your article "CBSE Announces Revised Board Exam Schedule for 2026" was approved and published.',
    createdAt: daysAgo(0),
    isRead: false,
    articleId: 'art-1',
    audience: 'reporter',
  },
  {
    id: 'ntf-2',
    type: 'payment',
    title: 'Payment Received',
    message: 'You received a payout of ₹4,850 for October articles.',
    createdAt: daysAgo(1),
    isRead: false,
    audience: 'reporter',
  },
  {
    id: 'ntf-3',
    type: 'article_rejected',
    title: 'Article Needs Changes',
    message: 'Your article "NEET Aspirants Get Extra Attempt Window" was rejected. Tap to view feedback.',
    createdAt: daysAgo(2),
    isRead: true,
    articleId: 'art-6',
    audience: 'reporter',
  },
  {
    id: 'ntf-4',
    type: 'article_pending',
    title: 'Under Review',
    message: 'Your submission is now under editorial review. This usually takes 24-48 hours.',
    createdAt: daysAgo(3),
    isRead: true,
    articleId: 'art-2',
    audience: 'reporter',
  },
  {
    id: 'ntf-5',
    type: 'system',
    title: 'Profile Verified',
    message: 'Congratulations! Your reporter profile has been verified by our editorial team.',
    createdAt: daysAgo(6),
    isRead: true,
    audience: 'reporter',
  },
  {
    id: 'ntf-6',
    type: 'reporter_joined',
    title: 'New Reporter Onboarded',
    message: 'Sneha Kulkarni just joined the platform from Chennai.',
    createdAt: daysAgo(7),
    isRead: true,
    audience: 'admin',
  },
];

export const mockPayments: Payment[] = mockReporters.slice(0, 8).map((reporter, i) => ({
  id: `pay-${i + 1}`,
  reporterId: reporter.id,
  reporterName: reporter.name,
  reporterAvatar: reporter.avatar,
  amount: 2400 + i * 620,
  status: i % 4 === 0 ? 'pending' : i % 5 === 0 ? 'failed' : 'paid',
  method: i % 2 === 0 ? 'UPI' : 'Bank Transfer',
  articlesCount: 4 + (i % 5),
  period: 'October 2026',
  createdAt: daysAgo(i + 1),
  transactionId: `TXN${100234 + i * 17}`,
}));

export const mockAnalytics: AnalyticsSummary = {
  totalArticles: mockArticles.length * 14,
  totalReporters: mockReporters.length * 6,
  totalViews: 482_300,
  totalRevenue: 186_400,
  pendingReview: mockArticles.filter((a) => a.status === 'pending').length * 4,
  approvedThisMonth: 96,
  rejectedThisMonth: 14,
  viewsTrend: [32, 41, 38, 55, 62, 58, 71],
  articlesTrend: [8, 12, 9, 15, 18, 14, 21],
  topCategories: categories.slice(0, 5).map((category, i) => ({
    category,
    count: 60 - i * 9,
  })),
};

export const allCategories = categories;
