/**
 * Event Bus - Sistema de eventos para comunicación entre componentes
 * Implementa patrón Observer para desacoplar componentes
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.isDebugMode = false;
  }

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   * @param {Object} options - Opciones de suscripción
   * @returns {Function} - Función para desuscribirse
   */
  subscribe(event, callback, options = {}) {
    const { once = false, priority = 0 } = options;

    if (typeof callback !== 'function') {
      throw new Error('El callback debe ser una función');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const subscription = {
      callback,
      once,
      priority,
      id: Math.random().toString(36).substr(2, 9)
    };

    const subscribers = this.events.get(event);
    subscribers.push(subscription);

    // Ordenar por prioridad (mayor prioridad primero)
    subscribers.sort((a, b) => b.priority - a.priority);

    if (this.isDebugMode) {
      console.log(`📡 Suscripción agregada para evento: ${event}`, subscription);
    }

    // Retornar función para desuscribirse
    return () => this.unsubscribe(event, subscription.id);
  }

  /**
   * Suscribirse a un evento solo una vez
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   * @param {number} priority - Prioridad del callback
   * @returns {Function} - Función para desuscribirse
   */
  once(event, callback, priority = 0) {
    return this.subscribe(event, callback, { once: true, priority });
  }

  /**
   * Emitir un evento
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a enviar
   * @returns {boolean} - True si se ejecutó al menos un callback
   */
  emit(event, data) {
    if (!this.events.has(event)) {
      if (this.isDebugMode) {
        console.log(`📡 No hay suscriptores para el evento: ${event}`);
      }
      return false;
    }

    const subscribers = this.events.get(event);
    const toRemove = [];

    if (this.isDebugMode) {
      console.log(`📡 Emitiendo evento: ${event}`, { data, subscribers: subscribers.length });
    }

    let executed = false;

    for (const subscription of subscribers) {
      try {
        subscription.callback(data, event);
        executed = true;

        if (subscription.once) {
          toRemove.push(subscription.id);
        }
      } catch (error) {
        console.error(`❌ Error en callback del evento ${event}:`, error);
      }
    }

    // Remover suscripciones de una sola vez
    if (toRemove.length > 0) {
      this.events.set(event, subscribers.filter(sub => !toRemove.includes(sub.id)));
    }

    return executed;
  }

  /**
   * Emitir evento de forma asíncrona
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos a enviar
   * @returns {Promise<boolean>}
   */
  async emitAsync(event, data) {
    if (!this.events.has(event)) {
      return false;
    }

    const subscribers = this.events.get(event);
    const toRemove = [];
    let executed = false;

    for (const subscription of subscribers) {
      try {
        await subscription.callback(data, event);
        executed = true;

        if (subscription.once) {
          toRemove.push(subscription.id);
        }
      } catch (error) {
        console.error(`❌ Error en callback asíncrono del evento ${event}:`, error);
      }
    }

    // Remover suscripciones de una sola vez
    if (toRemove.length > 0) {
      this.events.set(event, subscribers.filter(sub => !toRemove.includes(sub.id)));
    }

    return executed;
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event - Nombre del evento
   * @param {string|Function} callbackOrId - ID de suscripción o función callback
   */
  unsubscribe(event, callbackOrId) {
    if (!this.events.has(event)) {
      return;
    }

    const subscribers = this.events.get(event);
    
    if (typeof callbackOrId === 'string') {
      // Desuscribir por ID
      this.events.set(event, subscribers.filter(sub => sub.id !== callbackOrId));
    } else if (typeof callbackOrId === 'function') {
      // Desuscribir por función callback
      this.events.set(event, subscribers.filter(sub => sub.callback !== callbackOrId));
    }

    if (this.isDebugMode) {
      console.log(`📡 Desuscripción del evento: ${event}`);
    }
  }

  /**
   * Remover todos los suscriptores de un evento
   * @param {string} event - Nombre del evento
   */
  clear(event) {
    if (event) {
      this.events.delete(event);
      if (this.isDebugMode) {
        console.log(`📡 Todos los suscriptores removidos del evento: ${event}`);
      }
    } else {
      this.events.clear();
      if (this.isDebugMode) {
        console.log(`📡 Todos los eventos limpiados`);
      }
    }
  }

  /**
   * Obtener lista de eventos disponibles
   * @returns {string[]}
   */
  getEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * Obtener número de suscriptores de un evento
   * @param {string} event - Nombre del evento
   * @returns {number}
   */
  getSubscriberCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }

  /**
   * Verificar si un evento tiene suscriptores
   * @param {string} event - Nombre del evento
   * @returns {boolean}
   */
  hasSubscribers(event) {
    return this.getSubscriberCount(event) > 0;
  }

  /**
   * Activar/desactivar modo debug
   * @param {boolean} enabled - Activar debug
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    console.log(`📡 Modo debug del Event Bus: ${enabled ? 'activado' : 'desactivado'}`);
  }

  /**
   * Obtener estadísticas del Event Bus
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalEvents: this.events.size,
      totalSubscribers: 0,
      events: {}
    };

    for (const [event, subscribers] of this.events) {
      stats.totalSubscribers += subscribers.length;
      stats.events[event] = {
        subscribers: subscribers.length,
        subscriptions: subscribers.map(sub => ({
          id: sub.id,
          once: sub.once,
          priority: sub.priority
        }))
      };
    }

    return stats;
  }

  /**
   * Crear namespace para eventos
   * @param {string} namespace - Namespace
   * @returns {Object} - Event Bus con namespace
   */
  namespace(namespace) {
    return {
      subscribe: (event, callback, options) => 
        this.subscribe(`${namespace}:${event}`, callback, options),
      once: (event, callback, priority) => 
        this.once(`${namespace}:${event}`, callback, priority),
      emit: (event, data) => 
        this.emit(`${namespace}:${event}`, data),
      emitAsync: (event, data) => 
        this.emitAsync(`${namespace}:${event}`, data),
      unsubscribe: (event, callbackOrId) => 
        this.unsubscribe(`${namespace}:${event}`, callbackOrId),
      clear: (event) => 
        this.clear(event ? `${namespace}:${event}` : undefined)
    };
  }
}

// Instancia global del Event Bus
const eventBus = new EventBus();

export default EventBus;
export { eventBus };