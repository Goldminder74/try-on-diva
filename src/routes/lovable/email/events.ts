import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(event: any, reason: Reason) {
  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
  if (!url || !key) throw new Error('Server configuration error')
  const recipient = String(event?.data?.recipient ?? '').toLowerCase()
  if (!recipient) return
  const sb = createClient(url, key, { auth: { persistSession: false } })

  const { error: suppressError } = await sb
    .from('suppressed_emails')
    .upsert({ email: recipient, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code, message: suppressError.message, event_id: event.event_id,
    })
    throw new Error('Failed to write suppression')
  }

  const { error: logError } = await sb.from('email_send_log').insert({
    message_id: null,
    template_name: 'system',
    recipient_email: recipient,
    status: STATUS[reason],
    error_message: MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('Failed to insert email_send_log', {
      code: logError.code, message: logError.message, event_id: event.event_id,
    })
    throw new Error('Failed to write send log')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => record(event, 'bounce'),
            'email.complaint': async (event) => record(event, 'complaint'),
            'email.unsubscribed': async (event) => record(event, 'unsubscribe'),
          },
        })
        return handler(request)
      },
    },
  },
})
