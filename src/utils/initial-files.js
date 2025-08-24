/**
 * Archivos iniciales para WebContainer
 * Define la estructura de archivos que se montará en el sandbox
 */

/** @satisfies {import('@webcontainer/api').FileSystemTree} */
export const initialFiles = {
  'package.json': {
    file: {
      contents: JSON.stringify({
        name: 'cheesejs-workspace',
        type: 'module',
        version: '1.0.0',
        description: 'CheeseJS Workspace - Entorno de desarrollo JavaScript interactivo',
        main: 'index.js',
        dependencies: {},
        scripts: {
          start: 'node index.js',
          dev: 'nodemon index.js'
        },
        keywords: ['javascript', 'playground', 'repl', 'cheese'],
        author: 'CheeseJS',
        license: 'MIT'
      }, null, 2)
    }
  },
  'index.js': {
    file: {
      contents: `// 🧀 Bienvenido a CheeseJS
// Tu entorno de desarrollo JavaScript interactivo

console.log('¡Hola CheeseJS! 🧀');
console.log('=====================================');

// Ejemplo básico de JavaScript
const saludo = 'Hola mundo desde CheeseJS';
console.log(saludo);

// Trabajando con funciones
function sumar(a, b) {
  return a + b;
}

const resultado = sumar(5, 3);
console.log(\`5 + 3 = \${resultado}\`);

// Arrays y métodos
const numeros = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log('Números originales:', numeros);

const pares = numeros.filter(n => n % 2 === 0);
console.log('Números pares:', pares);

const cuadrados = numeros.map(n => n * n);
console.log('Cuadrados:', cuadrados);

const suma = numeros.reduce((acc, n) => acc + n, 0);
console.log('Suma total:', suma);

// Trabajando con objetos
const persona = {
  nombre: 'CheeseJS User',
  edad: 25,
  ciudad: 'JavaScript Land',
  programador: true
};

console.log('Información personal:', persona);
console.log(\`Hola, soy \${persona.nombre} y tengo \${persona.edad} años\`);

console.log('=====================================');
console.log('🚀 ¡Listo para programar! Presiona Ctrl+Enter para ejecutar código');
console.log('📦 Instala paquetes npm con el botón de paquetes en la barra superior');
console.log('🎨 Cambia el theme desde el selector en la barra superior');
console.log('🌍 Cambia el idioma desde el selector de idioma');`
    }
  },
  '.gitignore': {
    file: {
      contents: `# Dependencias
node_modules/
npm-debug.log*

# Archivos de configuración
.env
.env.local

# Logs
logs
*.log

# Cache
.npm
.eslintcache

# Build outputs
dist/
build/

# IDE/Editor files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db`
    }
  },
  'README.md': {
    file: {
      contents: `# CheeseJS Workspace 🧀

Bienvenido a tu entorno de desarrollo JavaScript interactivo.

## Características

- ✨ Ejecución de código JavaScript en tiempo real
- 📦 Instalación y gestión de paquetes npm
- 🎨 Themes personalizables (light/dark)
- 🌍 Soporte multiidioma
- 💡 Autocompletado inteligente
- 📝 Editor Monaco con syntax highlighting

## Uso Rápido

1. Escribe código JavaScript en el editor
2. Presiona \`Ctrl+Enter\` para ejecutar
3. Ve los resultados en la consola
4. Instala paquetes npm desde el panel lateral

## ¡Feliz codificación! 🚀

CheeseJS hace que experimentar con JavaScript sea fácil y divertido.`
    }
  }
};

export default initialFiles;