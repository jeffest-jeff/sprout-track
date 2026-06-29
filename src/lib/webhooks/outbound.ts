import crypto from 'crypto';
import prisma from '../../../app/api/db';

/**
 * Dispatch an outbound webhook to the family's configured URL (e.g. Home Assistant).
 *
 * Payload shape: { event, timestamp, familyId, data }
 * If an HMAC secret is configured, an `X-Sprout-Signature` header is added
 * containing the hex-encoded HMAC-SHA256 of the JSON body.
 *
 * This function never throws — all errors are caught and logged so it can be
 * safely called in a non-blocking (fire-and-forget) manner from API handlers.
 *
 * @param familyId - The family whose webhook settings to use
 * @param event - Event name (e.g. "custom_activity_created", "test")
 * @param data - Arbitrary event payload
 */
export async function dispatchOutboundWebhook(
  familyId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    if (!familyId) return;

    const settings = await prisma.settings.findFirst({
      where: { familyId },
      orderBy: { updatedAt: 'desc' },
      select: {
        outboundWebhookUrl: true,
        outboundWebhookEnabled: true,
        outboundWebhookSecret: true,
      },
    });

    if (!settings || !settings.outboundWebhookEnabled || !settings.outboundWebhookUrl) {
      return; // No-op if disabled or URL not configured
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      familyId,
      data,
    };

    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (settings.outboundWebhookSecret) {
      const signature = crypto
        .createHmac('sha256', settings.outboundWebhookSecret)
        .update(body)
        .digest('hex');
      headers['X-Sprout-Signature'] = signature;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(settings.outboundWebhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(
          `[OutboundWebhook] Non-OK response (${res.status}) for event "${event}" family ${familyId}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[OutboundWebhook] Error dispatching webhook:', error);
    // Never throw
  }
}
