export class WhatsAppService {
  constructor({ accessToken, phoneNumberId, apiVersion = 'v23.0' }) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiVersion = apiVersion;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
  }

  async sendText(to, body) {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body
        }
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(`WhatsApp send failed: ${res.status} ${JSON.stringify(data)}`);
    }

    return data;
  }
}
