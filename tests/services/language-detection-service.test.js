import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageDetectionService } from '../../src/services/language-detection-service.js';

describe('LanguageDetectionService', () => {
  let service;

  beforeEach(() => {
    service = new LanguageDetectionService();
  });

  describe('Language Detection by File Extension', () => {
    it('should detect JavaScript from .js extension', () => {
      const result = service.detectByFileName('index.js');
      expect(result.language).toBe('javascript');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect TypeScript from .ts extension', () => {
      const result = service.detectByFileName('component.ts');
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect JSX from .jsx extension', () => {
      const result = service.detectByFileName('Component.jsx');
      expect(result.language).toBe('jsx');
      expect(result.confidence).toBe(0.9);
    });

    it('should detect TSX from .tsx extension', () => {
      const result = service.detectByFileName('Component.tsx');
      expect(result.language).toBe('tsx');
      expect(result.confidence).toBe(0.9);
    });

    it('should default to JavaScript for unknown extensions', () => {
      const result = service.detectByFileName('unknown.xyz');
      expect(result.language).toBe('javascript');
      expect(result.confidence).toBe(0.1);
    });
  });

  describe('Language Detection by Content', () => {
    it('should detect TypeScript from type annotations', () => {
      const code = `
        function greet(name: string): string {
          return 'Hello ' + name;
        }
      `;
      const result = service.detectByContent(code);
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect TypeScript from interfaces', () => {
      const code = `
        interface User {
          id: number;
          name: string;
        }
      `;
      const result = service.detectByContent(code);
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect JSX from React components', () => {
      const code = `
        const Component = () => {
          return <div>Hello World</div>;
        };
      `;
      const result = service.detectByContent(code);
      expect(result.language).toBe('jsx');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect TSX from TypeScript React components', () => {
      const code = `
        interface Props {
          name: string;
        }
        const Component: React.FC<Props> = ({ name }) => {
          return <div>Hello {name}</div>;
        };
      `;
      const result = service.detectByContent(code);
      expect(result.language).toBe('tsx');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should detect JavaScript for plain JS code', () => {
      const code = `
        function hello() {
          console.log('Hello World');
        }
      `;
      const result = service.detectByContent(code);
      expect(result.language).toBe('javascript');
    });
  });

  describe('Combined Detection', () => {
    it('should prioritize content over filename when content is more specific', () => {
      const tsCode = `
        interface Config {
          name: string;
          version: number;
        }
      `;
      const result = service.detectLanguage(tsCode, 'config.js');
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect TSX when both TypeScript and JSX patterns are present', () => {
      const tsxCode = `
        interface ComponentProps {
          title: string;
        }
        const MyComponent: React.FC<ComponentProps> = ({ title }) => {
          return <h1>{title}</h1>;
        };
      `;
      const result = service.detectLanguage(tsxCode, 'Component.tsx');
      expect(result.language).toBe('tsx');
    });

    it('should use filename when content is ambiguous', () => {
      const simpleCode = 'console.log("hello");';
      const result = service.detectLanguage(simpleCode, 'test.ts');
      expect(result.language).toBe('typescript');
    });
  });

  describe('Content Analysis Patterns', () => {
    it('should identify TypeScript patterns correctly', () => {
      expect(service.containsTypeScript('let x: number = 5;')).toBe(true);
      expect(service.containsTypeScript('enum Color { Red, Green }')).toBe(true);
      expect(service.containsTypeScript('namespace Utils {}')).toBe(true);
      expect(service.containsTypeScript('declare module "test"')).toBe(true);
      expect(service.containsTypeScript('let x = 5;')).toBe(false);
    });

    it('should identify JSX patterns correctly', () => {
      expect(service.containsJSX('<Component />')).toBe(true);
      expect(service.containsJSX('<div className="test">')).toBe(true);
      expect(service.containsJSX('React.createElement("div")')).toBe(true);
      expect(service.containsJSX('<Fragment>')).toBe(true);
      expect(service.containsJSX('console.log("test")')).toBe(false);
    });
  });

  describe('Language Support', () => {
    it('should return all supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('jsx');
      expect(languages).toContain('tsx');
    });

    it('should validate language support correctly', () => {
      expect(service.isLanguageSupported('javascript')).toBe(true);
      expect(service.isLanguageSupported('typescript')).toBe(true);
      expect(service.isLanguageSupported('jsx')).toBe(true);
      expect(service.isLanguageSupported('tsx')).toBe(true);
      expect(service.isLanguageSupported('python')).toBe(false);
    });

    it('should return correct language info', () => {
      const jsInfo = service.getLanguageInfo('javascript');
      expect(jsInfo.displayName).toBe('JavaScript');
      expect(jsInfo.monacoLanguage).toBe('javascript');
      expect(jsInfo.extensions).toContain('js');

      const tsInfo = service.getLanguageInfo('typescript');
      expect(tsInfo.displayName).toBe('TypeScript');
      expect(tsInfo.monacoLanguage).toBe('typescript');
      expect(tsInfo.extensions).toContain('ts');
    });
  });

  describe('Caching', () => {
    it('should cache detection results', () => {
      const code = 'const x: number = 5;';
      const filename = 'test.ts';
      
      // First call
      const result1 = service.detectLanguage(code, filename);
      
      // Second call should return cached result
      const result2 = service.detectLanguage(code, filename);
      
      expect(result1).toEqual(result2);
    });

    it('should clear cache when requested', () => {
      const code = 'const x: number = 5;';
      service.detectLanguage(code, 'test.ts');
      
      expect(service.getCacheStats().size).toBeGreaterThan(0);
      
      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });

    it('should limit cache size', () => {
      const originalMaxSize = service.maxCacheSize;
      service.maxCacheSize = 2;
      
      // Add more items than cache size
      service.detectLanguage('code1', 'test1.js');
      service.detectLanguage('code2', 'test2.js');
      service.detectLanguage('code3', 'test3.js');
      
      expect(service.getCacheStats().size).toBeLessThanOrEqual(2);
      
      service.maxCacheSize = originalMaxSize;
    });
  });

  describe('Language Suggestions', () => {
    it('should provide appropriate suggestions for TypeScript', () => {
      const suggestions = service.getLanguageSuggestions('typescript');
      expect(suggestions.dependencies).toContain('typescript');
      expect(suggestions.dependencies).toContain('@types/node');
      expect(suggestions.settings.strict).toBe(true);
    });

    it('should provide appropriate suggestions for JSX', () => {
      const suggestions = service.getLanguageSuggestions('jsx');
      expect(suggestions.dependencies).toContain('react');
      expect(suggestions.dependencies).toContain('@types/react');
      expect(suggestions.settings.jsx).toBe('react');
    });

    it('should provide appropriate suggestions for TSX', () => {
      const suggestions = service.getLanguageSuggestions('tsx');
      expect(suggestions.dependencies).toContain('typescript');
      expect(suggestions.dependencies).toContain('react');
      expect(suggestions.dependencies).toContain('@types/react');
      expect(suggestions.settings.jsx).toBe('react');
      expect(suggestions.settings.strict).toBe(true);
    });
  });

  describe('Language Watcher', () => {
    it('should create a debounced language watcher', (done) => {
      let callCount = 0;
      const callback = (result) => {
        callCount++;
        expect(result.language).toBe('typescript');
        
        // Should only be called once due to debouncing
        setTimeout(() => {
          expect(callCount).toBe(1);
          done();
        }, 100);
      };

      const watcher = service.createLanguageWatcher(callback, 50);
      
      // Rapid calls should be debounced
      watcher('const x: number = 5;', 'test.ts');
      watcher('const y: string = "test";', 'test.ts');
      watcher('const z: boolean = true;', 'test.ts');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty code', () => {
      const result = service.detectLanguage('', 'test.js');
      expect(result.language).toBe('javascript');
      expect(result.confidence).toBe(0.1);
    });

    it('should handle null/undefined code', () => {
      const result1 = service.detectLanguage(null, 'test.js');
      const result2 = service.detectLanguage(undefined, 'test.js');
      
      expect(result1.language).toBe('javascript');
      expect(result2.language).toBe('javascript');
    });

    it('should handle very long code strings', () => {
      const longCode = 'const x = 5;\n'.repeat(10000);
      const result = service.detectLanguage(longCode, 'test.js');
      expect(result.language).toBe('javascript');
    });

    it('should handle files without extensions', () => {
      const result = service.detectByFileName('README');
      expect(result.language).toBe('javascript');
      expect(result.confidence).toBe(0.1);
    });

    it('should handle mixed content correctly', () => {
      const mixedCode = `
        // TypeScript interface
        interface User {
          name: string;
        }
        
        // JSX component
        const Component = () => <div>Hello</div>;
      `;
      const result = service.detectLanguage(mixedCode);
      expect(result.language).toBe('tsx'); // Should detect as TSX due to both TS and JSX
    });
  });
});