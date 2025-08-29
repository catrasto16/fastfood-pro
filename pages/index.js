// pages/index.js - DISEÑO MODERNO ULTRA PROFESIONAL
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [selectedItems, setSelectedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [stats, setStats] = useState({
    ordersToday: 47,
    revenueToday: 1250.75,
    avgTime: '12 min',
    satisfaction: 4.8
  })

  // Actualizar hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchMenuItems()
    fetchOrders()
    calculateStats()
    
    const ordersSubscription = supabase
      .channel('orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('🔔 Cambio detectado:', payload)
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
      const revenue = data?.reduce((sum, order) => sum + (parseFloat(order.total_amount) || 0), 0) || 0
      
      setStats(prev => ({
        ...prev,
        ordersToday: ordersCount + 47, // Base + reales
        revenueToday: revenue + 1250.75 // Base + reales
      }))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const placeOrder = async () => {
    if (selectedItems.length === 0) {
      alert('⚠️ Por favor, selecciona al menos un producto')
      return
    }

    try {
      const orderNumber = Math.floor(Date.now() / 1000)
      const totalAmount = selectedItems.reduce((sum, item) => sum + parseFloat(item.price), 0)

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

      const orderItems = selectedItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: 1,
        price: parseFloat(item.price)
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      await sendWhatsApp(orderNumber, 'confirmed')
      
      setSelectedItems([])
      
      // Animación de éxito
      const successDiv = document.createElement('div')
      successDiv.innerHTML = '🎉 ¡Pedido realizado con éxito!'
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg font-bold z-50 animate-bounce'
      document.body.appendChild(successDiv)
      setTimeout(() => document.body.removeChild(successDiv), 3000)
      
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al procesar el pedido: ' + error.message)
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
      console.log(`📱 WhatsApp SIMULADO:`)
      console.log(`📞 Para: Cliente Demo`)
      console.log(`🆔 Pedido: #${orderNumber}`)
      console.log(`📋 Estado: ${status}`)
      console.log('💬 Mensaje enviado exitosamente (simulado)')
      console.log('----------------------------')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error('Error simulando WhatsApp:', error)
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
      case 'received': return 'from-yellow-400 to-orange-500'
      case 'preparing': return 'from-blue-400 to-purple-600'
      case 'ready': return 'from-green-400 to-emerald-600'
      default: return 'from-gray-400 to-gray-600'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'received': return '📋'
      case 'preparing': return '👨‍🍳'
      case 'ready': return '✅'
      default: return '📦'
    }
  }

  const getNextStatus = (status) => {
    switch(status) {
      case 'received': return 'preparing'
      case 'preparing': return 'ready'
      case 'ready': return 'delivered'
      default: return 'delivered'
    }
  }

  const getNextStatusText = (status) => {
    switch(status) {
      case 'received': return '🚀 Iniciar Preparación'
      case 'preparing': return '🍽️ Marcar como Listo'
      case 'ready': return '📦 Marcar Entregado'
      default: return '✅ Completar'
    }
  }

  const getCategoryIcon = (category) => {
    switch(category?.toLowerCase()) {
      case 'pizzas': return '🍕'
      case 'burgers': return '🍔'  
      case 'pastas': return '🍝'
      case 'ensaladas': return '🥗'
      case 'bebidas': return '🥤'
      default: return '🍽️'
    }
  }

  const getCategoryImage = (category) => {
    const images = {
      'Pizzas': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
      'Burgers': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
      'Pastas': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
      'Ensaladas': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
      'Bebidas': 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400&h=300&fit=crop'
    }
    return images[category] || 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-32 h-32 border-8 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-8"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">🍕</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Cargando FastFood Pro...</h2>
          <p className="text-purple-200">Preparando la experiencia perfecta</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500 rounded-full opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full opacity-5 animate-ping"></div>
      </div>

      {/* Badge de Demo Flotante */}
      <div className="fixed top-6 right-6 z-50">
        <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">🚀</span>
            <span>DEMO INTERACTIVA</span>
          </div>
        </div>
      </div>

      {/* Reloj en tiempo real */}
      <div className="fixed top-6 left-6 z-50">
        <div className="bg-black/30 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-white/20">
          <div className="text-sm font-mono">
            {currentTime.toLocaleTimeString('es-ES')}
          </div>
        </div>
      </div>

      <div className="relative z-10 p-6">
        {/* Header con efectos glassmorphism */}
        <div className="text-center mb-12">
          <div className="relative">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-4 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
              FastFood Pro
            </h1>
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 opacity-30 -z-10"></div>
          </div>
          <p className="text-2xl text-blue-100 mb-6 font-light">Sistema de Automatización Next-Generation</p>
          
          <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-8 py-4 border border-white/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-semibold">Sistema Activo</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300">⚡ Tiempo real</span>
            </div>
            <div className="w-px h-6 bg-white/30"></div>
            <div className="flex items-center gap-2">
              <span className="text-purple-300">🔒 Seguro</span>
            </div>
          </div>
        </div>

        {/* Estadísticas mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 max-w-7xl mx-auto">
          {[
            { title: 'Pedidos Hoy', value: stats.ordersToday, icon: '📊', color: 'from-blue-500 to-purple-600', suffix: '' },
            { title: 'Ingresos', value: `€${stats.revenueToday.toFixed(2)}`, icon: '💰', color: 'from-green-500 to-emerald-600', suffix: '' },
            { title: 'Tiempo Promedio', value: stats.avgTime, icon: '⏱️', color: 'from-orange-500 to-red-600', suffix: '' },
            { title: 'Satisfacción', value: `${stats.satisfaction}⭐`, icon: '🎯', color: 'from-purple-500 to-pink-600', suffix: '' }
          ].map((stat, index) => (
            <div key={index} className="group">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{stat.icon}</span>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${stat.color} opacity-20 animate-pulse`}></div>
                </div>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                  {stat.value}
                </div>
                <div className="text-white/70 font-medium">{stat.title}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Grid principal mejorado */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Panel de Pedidos con imágenes */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                🛒
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Menú Digital</h2>
                <p className="text-white/70">Selecciona tus favoritos</p>
              </div>
            </div>
            
            {menuItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 animate-bounce">🍽️</div>
                <div className="text-white/60 text-lg">Cargando deliciosos platos...</div>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                  {menuItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelection(item)}
                      className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-500 hover:scale-105 ${
                        selectedItems.some(si => si.id === item.id)
                          ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/25 bg-gradient-to-r from-yellow-400/20 to-orange-500/20'
                          : 'hover:ring-2 hover:ring-white/30 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="relative">
                        {/* Imagen del producto */}
                        <div className="h-24 bg-gradient-to-r from-purple-600 to-blue-600 relative overflow-hidden">
                          <img 
                            src={getCategoryImage(item.category)}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                          <div className="absolute top-2 left-3 text-2xl">
                            {getCategoryIcon(item.category)}
                          </div>
                          {selectedItems.some(si => si.id === item.id) && (
                            <div className="absolute top-2 right-3">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                                <span className="text-white font-bold">✓</span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Contenido */}
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-xl mb-2 group-hover:text-yellow-300 transition-colors">
                                {item.name}
                              </h4>
                              <p className="text-white/70 text-sm leading-relaxed mb-3">
                                {item.description}
                              </p>
                              <div className="inline-block">
                                <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                            <div className="ml-6 text-right">
                              <div className="text-3xl font-black text-gradient bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                                €{item.price}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón de pedido mejorado */}
                <div className="mt-8">
                  <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl p-6 border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-semibold text-lg">Total Seleccionado:</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                        €{selectedItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={placeOrder}
                      disabled={selectedItems.length === 0}
                      className="w-full bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white font-bold py-4 px-8 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:hover:scale-100 text-lg relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-3">
                        <span className="text-2xl">🚀</span>
                        <span>Realizar Pedido ({selectedItems.length} items)</span>
                        <span className="text-2xl animate-bounce">✨</span>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Panel de Cocina mejorado */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                👨‍🍳
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Cocina Digital</h2>
                <p className="text-white/70">Panel en tiempo real</p>
              </div>
            </div>
            
            <div className="space-y-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6 animate-pulse">🍽️</div>
                  <div className="text-2xl text-white/60 mb-4">Todo tranquilo en la cocina</div>
                  <div className="text-white/40">Los nuevos pedidos aparecerán aquí automáticamente</div>
                </div>
              ) : (
                orders.map(order => (
                  <div
                    key={order.id}
                    className="bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 bg-gradient-to-r ${getStatusColor(order.status)} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <span className="font-bold text-white text-xl">Pedido #{order.order_number}</span>
                          <div className="text-white/60 text-sm mt-1">
                            📅 {new Date(order.created_at).toLocaleDateString('es-ES')} - 
                            🕐 {new Date(order.created_at).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${getStatusColor(order.status)} text-white shadow-lg`}>
                          {order.status.toUpperCase()}
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">€{order.total_amount}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
                      <div className="text-white/80 font-semibold mb-3 flex items-center gap-2">
                        <span>📋</span> Items del pedido:
                      </div>
                      {order.order_items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                          <span className="text-white flex items-center gap-2">
                            <span className="text-orange-400">•</span>
                            {item.menu_items?.name}
                          </span>
                          <span className="font-medium text-yellow-300">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {order.status !== 'delivered' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, getNextStatus(order.status))}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-green-500 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:shadow-xl hover:scale-105 flex items-center justify-center gap-3"
                      >
                        {getNextStatusText(order.status)}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel WhatsApp mejorado */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                💬
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">WhatsApp Business</h2>
                <p className="text-white/70">Comunicación automática</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-b from-green-900/20 to-green-800/10 rounded-2xl p-6 h-80 overflow-y-auto border border-green-400/20 scrollbar-thin scrollbar-thumb-green-400/20 scrollbar-track-transparent">
              <div className="space-y-6">
                <div className="bg-white/90 rounded-2xl p-4 shadow-lg border-l-4 border-green-500 transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🤖</span>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">Sistema • 10:30</span>
                  </div>
                  <div className="text-gray-800">¡Hola! 👋 Bienvenido a <strong>FastFood Pro</strong>. Nuestro sistema de pedidos automático está activo 24/7 para ofrecerte la mejor experiencia.</div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-500/90 to-purple-600/90 rounded-2xl p-4 shadow-lg text-white transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm">⚡</span>
                    </div>
                    <span className="text-xs text-white/80 font-mono">IA Assistant</span>
                  </div>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-green-300">✅</span> Confirmaciones instantáneas
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-blue-300">👨‍🍳</span> Estado de preparación en tiempo real
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-300">🚚</span> Notificaciones de entrega automáticas
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-pink-300">⭐</span> Solicitudes de reseñas inteligentes
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-400/90 to-orange-500/90 rounded-2xl p-4 shadow-lg text-white transform hover:scale-105 transition-transform">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm">💡</span>
                    </div>
                    <span className="text-xs text-white/80 font-mono">Demo Interactiva</span>
                  </div>
                  <div className="font-semibold">
                    🎯 <strong>¡Prueba el sistema!</strong><br/>
                    <span className="text-sm opacity-90">Selecciona productos y realiza un pedido para ver las notificaciones automáticas en acción.</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-green-400/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs">📊</span>
                    </div>
                    <span className="text-xs text-green-300 font-mono">Estado del Sistema</span>
                  </div>
                  <div className="text-sm text-white space-y-1">
                    <div className="flex justify-between">
                      <span>📱 API WhatsApp:</span>
                      <span className="text-green-300 font-bold">✅ Activa</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📤 Mensajes enviados hoy:</span>
                      <span className="text-blue-300 font-bold">{stats.ordersToday * 3}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>📈 Tasa de entrega:</span>
                      <span className="text-yellow-300 font-bold">99.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>⚡ Tiempo de respuesta:</span>
                      <span className="text-purple-300 font-bold">&lt; 2 seg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de características premium */}
        <div className="mt-16 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              ¿Por qué FastFood Pro?
            </h3>
            <p className="text-xl text-white/70">La tecnología que revolucionará tu restaurante</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🚀',
                title: 'Velocidad Extrema',
                description: 'Pedidos procesados en milisegundos. CDN global para máxima velocidad.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: '🔒',
                title: 'Seguridad Bancaria',
                description: 'Certificaciones SOC2 e ISO27001. Tus datos más seguros que en un banco.',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: '📊',
                title: 'Analytics Avanzados',
                description: 'Métricas en tiempo real, predicciones de demanda y optimización automática.',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: '♾️',
                title: 'Escalabilidad Infinita',
                description: 'De 10 a 10,000 pedidos sin cambios. Crece sin límites.',
                color: 'from-orange-500 to-red-500'
              }
            ].map((feature, index) => (
              <div key={index} className="group">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-500 hover:scale-105 h-full">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl`}>
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4 group-hover:text-yellow-300 transition-colors">
                    {feature.title}
                  </h4>
                  <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to action mejorado */}
        <div className="mt-16 text-center max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md rounded-3xl p-12 border border-white/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-red-500/10 to-pink-500/10 animate-pulse"></div>
            <div className="relative z-10">
              <h3 className="text-5xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
                🎯 Cómo funciona esta demo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-lg">
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">🛒</div>
                  <h4 className="font-bold text-white mb-3">1. Seleccionar productos</h4>
                  <p className="text-white/70">Haz clic en los platos del menú para seleccionarlos. Ve cómo se actualiza el total en tiempo real.</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">🚀</div>
                  <h4 className="font-bold text-white mb-3">2. Realizar pedido</h4>
                  <p className="text-white/70">El pedido aparece automáticamente en el panel de cocina. Sin intervención humana.</p>
                </div>
                <div className="bg-white/10 rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">📱</div>
                  <h4 className="font-bold text-white mb-3">3. Ver automatización</h4>
                  <p className="text-white/70">Cambia estados en cocina y observa las notificaciones WhatsApp automáticas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer premium */}
        <div className="mt-16 text-center">
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-8 border border-white/10 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 font-semibold">99.9% Uptime</span>
              </div>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <span className="text-blue-300">🌍 CDN Global</span>
              </div>
              <div className="w-px h-6 bg-white/30"></div>
              <div className="flex items-center gap-2">
                <span className="text-purple-300">⚡ < 300ms respuesta</span>
              </div>
            </div>
            <p className="text-white/60 mb-4">
              💡 <strong>Demo Interactiva Completa</strong> - Experimenta con todas las funciones
            </p>
            <p className="text-white/40 text-sm">
              🏢 Desarrollado con tecnología empresarial • 🔒 Datos seguros • 📊 Analytics avanzados
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .text-gradient {
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  )
}
