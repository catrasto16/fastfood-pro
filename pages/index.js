// pages/index.js - PÁGINA PRINCIPAL
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    ordersToday: 0,
    revenueToday: 0,
    avgTime: '15 min'
  })

  useEffect(() => {
    fetchMenuItems()
    fetchOrders()
    calculateStats()
    
    // Suscripción en tiempo real
    const ordersSubscription = supabase
      .channel('orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('🔔 Nuevo cambio:', payload)
          fetchOrders()
          calculateStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSubscription)
    }
  }, [])

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category, name')
      
      if (error) throw error
      setMenuItems(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            menu_items (name)
          )
        `)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const calculateStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today + 'T00:00:00')
        .lte('created_at', today + 'T23:59:59')
      
      if (error) throw error
      
      const ordersCount = data?.length || 0
      const revenue = data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      
      setStats({
        ordersToday: ordersCount,
        revenueToday: revenue.toFixed(2),
        avgTime: '12 min'
      })
    } catch (error) {
      console.error('Error calculando stats:', error)
    }
  }

  const placeOrder = async () => {
    if (selectedItems.length === 0) {
      alert('⚠️ Selecciona al menos un producto')
      return
    }

    try {
      const orderNumber = Date.now()
      const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0)

      // Crear pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          total_amount: totalAmount,
          customer_phone: '+34666000000',
          customer_name: 'Cliente Demo',
          status: 'received',
          order_source: 'web'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Crear items del pedido
      const orderItems = selectedItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: 1,
        price: item.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Enviar WhatsApp
      await sendWhatsApp(orderNumber, 'confirmed')
      
      setSelectedItems([])
      alert('🎉 ¡Pedido realizado con éxito!')
      
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al procesar el pedido')
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      const order = orders.find(o => o.id === orderId)
      await sendWhatsApp(order.order_number, newStatus)
      
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const sendWhatsApp = async (orderNumber, status) => {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, status })
      })
    } catch (error) {
      console.error('Error WhatsApp:', error)
    }
  }

  const toggleItemSelection = (item) => {
    const isSelected = selectedItems.some(si => si.id === item.id)
    if (isSelected) {
      setSelectedItems(selectedItems.filter(si => si.id !== item.id))
    } else {
      setSelectedItems([...selectedItems, item])
    }
  }

  const getStatusColor = (status) => {
    switch(status) {
      case 'received': return 'bg-yellow-100 border-yellow-500 text-yellow-800'
      case 'preparing': return 'bg-blue-100 border-blue-500 text-blue-800'
      case 'ready': return 'bg-green-100 border-green-500 text-green-800'
      default: return 'bg-gray-100 border-gray-500 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'received': return '📝 Recibido'
      case 'preparing': return '👨‍🍳 Preparando'
      case 'ready': return '🍽️ Listo'
      default: return status
    }
  }

  const getNextStatus = (status) => {
    switch(status) {
      case 'received': return 'preparing'
      case 'preparing': return 'ready'
      case 'ready': return 'delivered'
      default: return status
    }
  }

  const getNextStatusText = (status) => {
    switch(status) {
      case 'received': return '▶️ Iniciar Preparación'
      case 'preparing': return '✅ Marcar Listo'
      case 'ready': return '🚚 Entregado'
      default: return 'Actualizar'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Cargando sistema...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">🍕 FastFood Pro</h1>
        <p className="text-xl text-white/90">Sistema de Automatización Completo</p>
        <div className="mt-4 inline-block bg-red-500 text-white px-4 py-2 rounded-full font-bold animate-pulse">
          🚀 DEMO INTERACTIVA
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 max-w-6xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.ordersToday}</div>
          <div className="text-gray-600">Pedidos Hoy</div>
        </div>
        <div className="bg-white/95 backdrop-blur rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">€{stats.revenueToday}</div>
          <div className="text-gray-600">Ingresos Hoy</div>
        </div>
        <div className="bg-white/95 backdrop-blur rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.avgTime}</div>
          <div className="text-gray-600">Tiempo Promedio</div>
        </div>
        <div className="bg-white/95 backdrop-blur rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">4.8⭐</div>
          <div className="text-gray-600">Satisfacción</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        
        {/* Panel de Pedidos */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            🛒 Panel de Pedidos
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {menuItems.map(item => (
              <div
                key={item.id}
                onClick={() => toggleItemSelection(item)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedItems.some(si => si.id === item.id)
                    ? 'border-red-500 bg-red-50 shadow-lg scale-105'
                    : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                    <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs mt-2">
                      {item.category}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-xl font-bold text-red-600">€{item.price}</div>
                    {selectedItems.some(si => si.id === item.id) && (
                      <div className="text-green-600 text-center">✓</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={placeOrder}
            disabled={selectedItems.length === 0}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold py-4 rounded-xl mt-6 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-300"
          >
            🚀 Realizar Pedido ({selectedItems.length} items - €{selectedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)})
          </button>
        </div>

        {/* Panel de Cocina */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            👨‍🍳 Panel de Cocina
          </h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                📋 No hay pedidos pendientes
              </div>
            ) : (
              orders.map(order => (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border-l-4 ${getStatusColor(order.status)} transition-all duration-500`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-lg">Pedido #{order.order_number}</span>
                      <div className="text-sm opacity-75">
                        {new Date(order.created_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </div>
                      <div className="text-sm font-bold mt-1">€{order.total_amount}</div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>• {item.menu_items?.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.status !== 'delivered' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300"
                    >
                      {getNextStatusText(order.status)}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel WhatsApp */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            💬 WhatsApp Business
          </h2>
          
          <div className="bg-gradient-to-b from-green-100 to-green-50 rounded-xl p-4 h-80 overflow-y-auto border">
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500">
                <div className="text-sm text-gray-600 mb-1">10:30 - Sistema</div>
                <div>¡Hola! 👋 Bienvenido a FastFood Pro. Sistema de pedidos automático activado.</div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
                <div className="text-sm text-gray-600 mb-1">🤖 Notificaciones automáticas</div>
                <div className="text-sm">
                  ✅ Confirmación de pedidos<br/>
                  👨‍🍳 Estado de preparación<br/>
                  🚚 Notificación de entrega<br/>
                  ⭐ Solicitud de reseña
                </div>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <div className="text-sm text-gray-600 mb-1">💡 Demo</div>
                <div className="text-sm font-bold">
                  Realiza un pedido arriba para ver las notificaciones automáticas en acción!
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-800">
              <strong>📊 WhatsApp API Activo</strong><br/>
              Mensajes enviados hoy: {stats.ordersToday * 3}<br/>
              Tasa de respuesta: 98%
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-white/70">
        <p>💡 <strong>Demo Interactiva</strong> - Selecciona productos y realiza un pedido para ver el flujo completo</p>
      </div>
    </div>
  )
}
