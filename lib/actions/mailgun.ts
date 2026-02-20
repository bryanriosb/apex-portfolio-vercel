'use server'

import FormData from 'form-data'
import Mailgun from 'mailgun.js'

const getMailgunClient = async () => {
  const mailgun = new Mailgun(FormData)
  const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY!,
  })
  return mg
}

export async function sendEmailMailgun(params: {
  to: string
  from: string
  subject: string
  body: { text?: string; html?: string }
}) {
  const { from, to, subject, body } = params
  try {
    const mailgun = await getMailgunClient()
    const data = await mailgun.messages.create('beluvio.borls.com', {
      from,
      to,
      subject,
      text: body.text!,
    })

    console.log(data) // logs response data
  } catch (error) {
    console.log(error) //logs any error
  }
}
