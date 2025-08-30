// app/actions/sendSupportEmail.ts
'use server'

import SupportRequestEmail from '@/components/emails/support-request';
import { Resend } from 'resend';
import { createElement } from 'react';
import { UIMessage } from 'ai';

interface SupportEmailData {
  messages: UIMessage[];
  contactInfo: {
    name: string,
    email: string;
    additionalInfo: string;
  };
}

export async function sendSupportEmail({ messages, contactInfo }: SupportEmailData) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.warn('Resend API key not configured');
      return { success: false, error: 'Email service not configured' };
    }
    
    const resend = new Resend(RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: `Deltalytix Support <${process.env.SUPPORT_EMAIL??''}>`,
      to: [process.env.SUPPORT_TEAM_EMAIL??''],
      subject: 'New Support Request',
      react: createElement(SupportRequestEmail, { messages, contactInfo }),
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: 'Failed to send support request' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}