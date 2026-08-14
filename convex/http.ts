import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/cashfree-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      await ctx.runAction(internal.cashfree.verifyWebhook, {
        rawBody: await request.text(),
        signature: request.headers.get('x-webhook-signature') ?? '',
        timestamp: request.headers.get('x-webhook-timestamp') ?? '',
      });
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Cashfree webhook failed', error);
      return new Response('Verification failed', { status: 401 });
    }
  }),
});

export default http;