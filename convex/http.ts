import { httpRouter } from 'convex/server';

import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/razorpay-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      await ctx.runAction(internal.razorpay.verifyWebhook, {
        rawBody: await request.text(),
        signature: request.headers.get('x-razorpay-signature') ?? '',
      });
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Razorpay webhook failed', error);
      return new Response('Verification failed', { status: 401 });
    }
  }),
});

export default http;