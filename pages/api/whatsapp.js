// pages/api/whatsapp.js - API WHATSAPP
const twilio = require('twilio')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orderNumber, status } = req.body

  const messages = {
    confirmed: `✅ ¡Pedido confirmado!\n\n🆔 Pedido #${orderNumber}\n⏱️ Tiempo estimado: 15-20 min\n📱 Te avisaremos cuando esté listo\n\n¡Gracias por elegirnos! 🍕`,
    preparing: `👨‍🍳 ¡Tu pedido #${orderNumber} se está preparando!\n\n🔥 Nuestros chefs están trabajando\n⏰ Estará listo muy pronto`,
    ready: `🍽️ ¡Pedido #${orderNumber} LISTO!\n\n📦 El repartidor sale en 5 min\n🏠 Llegada estimada: 10-15 min`,
    delivered: `🎉 ¡Pedido #${orderNumber} entregado!\n\n⭐ ¿Qué tal estuvo?\n💚 ¡Gracias por confiar en nosotros!`
  }

  try {
    // En desarrollo, solo logueamos
    console.log('📱 WhatsApp enviado:', messages[status])
    
    // En producción, descomenta esto:
    /*
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:+34666000000', // Número del cliente
      body: messages[status]
    })
    */

    res.status(200).json({ success: true })
    
  } catch (error) {
    console.error('Error WhatsApp:', error)
    res.status(500).json({ error: 'Error enviando mensaje' })
  }
}

// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
