import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { Request } from 'express';
import { User, UserDocument, SubscriptionTier } from '../users/schemas/user.schema';

const CREDIT_MAP: Record<SubscriptionTier, number> = {
  [SubscriptionTier.FREE]: 20,
  [SubscriptionTier.PRO]: 500,
  [SubscriptionTier.AGENCY]: 5000,
};

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Production Stripe Webhook endpoint.
   * In production, configure your Stripe dashboard to point here.
   * Verifies the Stripe-Signature header (stub — replace with real stripe.webhooks.constructEvent).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: any,
  ) {
    this.logger.log(`[Stripe Webhook] Received event. Signature: ${sig ? 'present' : 'missing'}`);

    // TODO: In production, replace this block with:
    // const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    // For now, we parse the raw body as JSON directly.
    let event: any;
    try {
      event = JSON.parse((req.body as Buffer).toString());
    } catch {
      throw new BadRequestException('Invalid JSON webhook payload');
    }

    await this.handleStripeEvent(event);
    return { received: true };
  }

  /**
   * Mock Webhook — LOCAL DEVELOPMENT ONLY.
   * Simulates a Stripe checkout.session.completed event.
   * POST /api/v1/billing/mock-webhook
   * Body: { "userId": "<mongo-id>", "plan": "pro" | "agency" | "free" }
   */
  @Post('mock-webhook')
  @HttpCode(HttpStatus.OK)
  async mockWebhook(@Body() body: { userId: string; plan: SubscriptionTier }) {
    const { userId, plan } = body;

    if (!userId || !plan) {
      throw new BadRequestException('userId and plan are required');
    }

    if (!Object.values(SubscriptionTier).includes(plan)) {
      throw new BadRequestException(`plan must be one of: ${Object.values(SubscriptionTier).join(', ')}`);
    }

    this.logger.log(`[Mock Webhook] Upgrading user ${userId} → ${plan}`);

    const syntheticEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: userId,
          metadata: { plan },
          customer: `cus_mock_${Date.now()}`,
          subscription: `sub_mock_${Date.now()}`,
        },
      },
    };

    await this.handleStripeEvent(syntheticEvent);
    return { success: true, message: `User ${userId} upgraded to ${plan}` };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async handleStripeEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object;
        const userId: string = session?.client_reference_id;
        const plan: SubscriptionTier = session?.metadata?.plan ?? SubscriptionTier.FREE;

        if (!userId) {
          this.logger.warn('[Billing] checkout.session.completed missing client_reference_id');
          return;
        }

        const credits = CREDIT_MAP[plan] ?? 20;

        const updated = await this.userModel.findByIdAndUpdate(
          userId,
          {
            $set: {
              subscriptionTier: plan,
              aiCreditsRemaining: credits,
              stripeCustomerId: session?.customer,
              stripeSubscriptionId: session?.subscription,
            },
          },
          { returnDocument: 'after' },
        );

        if (!updated) {
          this.logger.warn(`[Billing] User not found: ${userId}`);
        } else {
          this.logger.log(
            `[Billing] User ${updated.email} upgraded to ${plan} — credits set to ${credits}`,
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data?.object;
        const stripeCustomerId: string = subscription?.customer;

        if (!stripeCustomerId) return;

        await this.userModel.findOneAndUpdate(
          { stripeCustomerId },
          {
            $set: {
              subscriptionTier: SubscriptionTier.FREE,
              aiCreditsRemaining: CREDIT_MAP[SubscriptionTier.FREE],
              stripeSubscriptionId: null,
            },
          },
        );

        this.logger.log(`[Billing] Subscription cancelled for customer ${stripeCustomerId} — reverted to Free`);
        break;
      }

      default:
        this.logger.log(`[Billing] Unhandled event type: ${event.type}`);
    }
  }
}
