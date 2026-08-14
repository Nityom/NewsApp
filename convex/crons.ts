import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';

const crons = cronJobs();

crons.daily('delete articles older than ten days', { hourUTC: 2, minuteUTC: 0 }, internal.articleCleanup.run);

export default crons;