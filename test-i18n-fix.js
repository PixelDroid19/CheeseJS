// Test para verificar la corrección del hook useI18n
import { i18nService } from './src/services/i18n-service.js';

async function testI18nService() {
  console.log('🧪 Probando i18nService...');
  
  try {
    // Verificar que isInitialized es una propiedad, no un método
    console.log('1. Verificando isInitialized como propiedad:', i18nService.isInitialized);
    
    // Verificar que no tiene método isInitialized()
    console.log('2. ¿Tiene método isInitialized()?: ', typeof i18nService.isInitialized === 'function');
    
    // Inicializar el servicio
    console.log('3. Inicializando servicio...');
    await i18nService.initialize();
    
    // Verificar estado después de inicialización
    console.log('4. Estado después de inicialización:', i18nService.isInitialized);
    
    // Probar traducción
    console.log('5. Traducción de prueba:', i18nService.t('header.run'));
    
    console.log('✅ Todas las pruebas pasaron!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testI18nService();
}

export { testI18nService };