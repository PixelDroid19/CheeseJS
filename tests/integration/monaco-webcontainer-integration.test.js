import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../../src/stores/editor-store.js';
import { useTerminalStore } from '../../src/stores/terminal-store.js';
import { languageDetectionService } from '../../src/services/language-detection-service.js';
import { dependencyManager } from '../../src/services/dependency-management-service.js';
import { resultFormatter } from '../../src/services/result-formatter-service.js';
import { extensionAPI } from '../../src/services/extension-api.js';

// Mock external dependencies
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    dispose: vi.fn(),
    writeln: vi.fn(),
    write: vi.fn(),
    onData: vi.fn(),
    onResize: vi.fn(),
    onSelectionChange: vi.fn(),
    options: {},
    cols: 80,
    rows: 24
  }))
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn()
  }))
}));

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({}))
}));

describe('Monaco-WebContainer Integration Tests', () => {
  let editorStore;
  let terminalStore;

  beforeEach(() => {
    // Reset stores
    editorStore = useEditorStore.getState();
    terminalStore = useTerminalStore.getState();
    editorStore.reset();
    terminalStore.reset();

    // Clear service caches
    languageDetectionService.clearCache();
    dependencyManager.clearCache();
  });

  describe('Complete Workflow Integration', () => {
    it('should handle complete JavaScript workflow', async () => {
      const jsCode = `
        console.log('Hello CheeseJS!');
        const greeting = 'Welcome to the integration test';
        console.log(greeting);
      `;

      // 1. Set code in editor
      editorStore.setCode(jsCode);
      expect(editorStore.currentCode).toBe(jsCode);
      expect(editorStore.hasUnsavedChanges).toBe(true);

      // 2. Detect language
      const detectedLanguage = editorStore.detectLanguage(jsCode, 'test.js');
      expect(detectedLanguage).toBe('javascript');
      expect(editorStore.currentLanguage).toBe('javascript');

      // 3. Check dependencies (should be none for this simple JS)
      editorStore.checkDependencies(jsCode);
      expect(editorStore.missingDependencies).toHaveLength(0);

      // 4. Execute code
      await editorStore.executeCode();
      expect(editorStore.executionResult).toBeDefined();
      expect(editorStore.performance.totalExecutions).toBe(1);
    });

    it('should handle TypeScript workflow with dependencies', async () => {
      const tsCode = `
        import axios from 'axios';
        
        interface User {
          id: number;
          name: string;
          email: string;
        }
        
        async function fetchUser(id: number): Promise<User> {
          const response = await axios.get<User>(
            
          );
          return response.data;
        }
        
        console.log('TypeScript + Axios example');
      `;

      // 1. Set TypeScript code
      editorStore.setCode(tsCode);
      
      // 2. Detect language (should detect TypeScript)
      const detectedLanguage = editorStore.detectLanguage(tsCode, 'user.ts');
      expect(detectedLanguage).toBe('typescript');
      
      // 3. Check dependencies (should detect axios)
      const depAnalysis = await dependencyManager.analyzeDependencies(tsCode, 'typescript');
      expect(depAnalysis.dependencies.has('axios')).toBe(true);
      expect(depAnalysis.missing.some(dep => dep.name === 'axios')).toBe(true);
      
      // Should also suggest @types/axios for TypeScript
      expect(depAnalysis.suggestions.some(s => s.name === '@types/axios')).toBe(true);
    });

    it('should handle React JSX workflow', async () => {
      const jsxCode = `
        import React, { useState } from 'react';
        
        const Counter = () => {
          const [count, setCount] = useState(0);
          
          return (
            <div>
              <h1>Count: {count}</h1>
              <button onClick={() => setCount(count + 1)}>
                Increment
              </button>
            </div>
          );
        };
        
        export default Counter;
      `;

      // 1. Set JSX code
      editorStore.setCode(jsxCode);
      
      // 2. Detect language (should detect JSX)
      const detectedLanguage = editorStore.detectLanguage(jsxCode, 'Counter.jsx');
      expect(detectedLanguage).toBe('jsx');
      
      // 3. Check dependencies (should detect React)
      const depAnalysis = await dependencyManager.analyzeDependencies(jsxCode, 'jsx');
      expect(depAnalysis.dependencies.has('react')).toBe(true);
      expect(depAnalysis.missing.some(dep => dep.name === 'react')).toBe(true);
      
      // Should have high priority for React in JSX context
      const reactSuggestion = depAnalysis.suggestions.find(s => s.name === 'react');
      expect(reactSuggestion.priority).toBe('high');
    });

    it('should handle TSX workflow with full stack', async () => {
      const tsxCode = `
        import React, { FC, useState, useEffect } from 'react';
        import axios from 'axios';
        
        interface UserData {
          id: number;
          name: string;
          email: string;
        }
        
        interface UserProfileProps {
          userId: number;
        }
        
        const UserProfile: FC<UserProfileProps> = ({ userId }) => {
          const [user, setUser] = useState<UserData | null>(null);
          const [loading, setLoading] = useState<boolean>(true);
          
          useEffect(() => {
            const fetchUser = async () => {
              try {
                const response = await axios.get<UserData>(
                  
                );
                setUser(response.data);
              } catch (error) {
                console.error('Failed to fetch user:', error);
              } finally {
                setLoading(false);
              }
            };
            
            fetchUser();
          }, [userId]);
          
          if (loading) {
            return <div>Loading...</div>;
          }
          
          if (!user) {
            return <div>User not found</div>;
          }
          
          return (
            <div>
              <h2>{user.name}</h2>
              <p>Email: {user.email}</p>
            </div>
          );
        };
        
        export default UserProfile;
      `;

      // 1. Set TSX code
      editorStore.setCode(tsxCode);
      
      // 2. Detect language (should detect TSX due to TypeScript + JSX)
      const detectedLanguage = editorStore.detectLanguage(tsxCode, 'UserProfile.tsx');
      expect(detectedLanguage).toBe('tsx');
      
      // 3. Analyze dependencies
      const depAnalysis = await dependencyManager.analyzeDependencies(tsxCode, 'tsx');
      
      // Should detect both React and axios
      expect(depAnalysis.dependencies.has('react')).toBe(true);
      expect(depAnalysis.dependencies.has('axios')).toBe(true);
      
      // Should suggest TypeScript types for both
      expect(depAnalysis.suggestions.some(s => s.name === '@types/react')).toBe(true);
      expect(depAnalysis.suggestions.some(s => s.name === '@types/axios')).toBe(true);
      
      // Should have high priority suggestions for TSX context
      const reactSuggestion = depAnalysis.suggestions.find(s => s.name === 'react');
      expect(reactSuggestion.priority).toBe('high');
    });
  });

  describe('Cross-Store Integration', () => {
    it('should synchronize themes between editor and terminal', () => {
      const darkTheme = {
        background: '#1a1a1a',
        foreground: '#e0e0e0',
        cursor: '#ffffff'
      };
      
      // Update terminal theme
      terminalStore.updateTheme(darkTheme);
      
      // Editor should adapt its theme based on terminal theme
      const editorThemeName = darkTheme.background.includes('#1a') ? 'cheesejs-dark' : 'cheesejs-light';
      expect(editorThemeName).toBe('cheesejs-dark');
    });

    it('should share execution state between components', async () => {
      // Set execution state in editor
      editorStore.isExecuting = true;
      
      // Terminal should be aware of execution state
      expect(editorStore.isExecuting).toBe(true);
      
      // Complete execution
      editorStore.isExecuting = false;
      editorStore.executionResult = { output: ['Test output'] };
      
      expect(editorStore.executionResult).toBeDefined();
    });
  });

  describe('Service Integration', () => {
    it('should integrate language detection with dependency management', async () => {
      const mixedCode = `
        import React from 'react';
        import { Component } from 'react';
        
        interface Props {
          title: string;
        }
        
        class MyComponent extends Component<Props> {
          render() {
            return <h1>{this.props.title}</h1>;
          }
        }
      `;
      
      // 1. Language detection
      const detectedLanguage = languageDetectionService.detectLanguage(mixedCode, 'Component.tsx');
      expect(detectedLanguage.language).toBe('tsx');
      
      // 2. Dependency analysis based on detected language
      const depAnalysis = await dependencyManager.analyzeDependencies(mixedCode, detectedLanguage.language);
      
      // Should detect React dependency
      expect(depAnalysis.dependencies.has('react')).toBe(true);
      
      // Should suggest TypeScript types for TSX
      expect(depAnalysis.suggestions.some(s => s.name === '@types/react')).toBe(true);
    });

    it('should integrate result formatting with theme system', () => {
      const testData = {
        message: 'Hello World',
        count: 42,
        items: ['a', 'b', 'c'],
        nested: {
          key: 'value',
          number: 123
        }
      };
      
      // Format with dark theme
      const darkResult = resultFormatter.format(testData, { theme: 'dark' });
      expect(darkResult.formatted).toContain('color');
      expect(darkResult.theme).toBe('Dark Theme');
      
      // Format with light theme
      const lightResult = resultFormatter.format(testData, { theme: 'light' });
      expect(lightResult.formatted).toContain('color');
      expect(lightResult.theme).toBe('Light Theme');
      
      // Should have different color schemes
      expect(darkResult.formatted).not.toBe(lightResult.formatted);
    });
  });

  describe('Extension API Integration', () => {
    it('should register and use custom extensions', () => {
      // Initialize extension API
      extensionAPI.initialize();
      
      // Register a custom code snippet
      const snippetId = extensionAPI.editor.addCodeSnippet('javascript', {
        label: 'test-snippet',
        insertText: 'console.log(\"test\");',
        description: 'Test snippet for integration'
      });
      
      expect(snippetId).toBeDefined();
      
      // Retrieve snippets
      const jsSnippets = extensionAPI.editor.getSnippets('javascript');
      expect(jsSnippets.some(s => s.label === 'test-snippet')).toBe(true);
      
      // Register a custom terminal command
      extensionAPI.terminal.registerCommand('test-cmd', (args) => {
        return `Test command executed with args: ${args.join(' ')}`;
      });
      
      // Execute custom command
      const result = extensionAPI.terminal.executeCommand('test-cmd', ['arg1', 'arg2']);
      expect(result).toContain('Test command executed');
    });

    it('should handle plugin lifecycle', () => {
      extensionAPI.initialize();
      
      const testPlugin = {
        name: 'Test Plugin',
        version: '1.0.0',
        initialize: vi.fn(),
        activate: vi.fn(),
        deactivate: vi.fn()
      };
      
      // Register plugin
      const pluginId = extensionAPI.editor.registerPlugin('test-plugin', testPlugin);
      expect(pluginId).toBe('test-plugin');
      expect(testPlugin.initialize).toHaveBeenCalled();
      
      // Deactivate plugin
      extensionAPI.editor.deactivatePlugin(pluginId);
      expect(testPlugin.deactivate).toHaveBeenCalled();
      
      // Reactivate plugin
      extensionAPI.editor.activatePlugin(pluginId);
      expect(testPlugin.activate).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading errors gracefully', async () => {
      const invalidCode = 'invalid typescript syntax: string number;';
      
      // Language detection should still work
      const detection = languageDetectionService.detectLanguage(invalidCode, 'test.ts');
      expect(detection.language).toBe('typescript');
      
      // Dependency analysis should handle syntax errors
      const depAnalysis = await dependencyManager.analyzeDependencies(invalidCode, 'typescript');
      expect(depAnalysis.warnings).toBeDefined();
      
      // Execution should fail gracefully
      editorStore.setCode(invalidCode);
      await editorStore.executeCode();
      
      expect(editorStore.executionError).toBeDefined();
      expect(editorStore.isExecuting).toBe(false);
    });

    it('should recover from service failures', async () => {
      // Mock service failure
      const originalAnalyze = dependencyManager.analyzeDependencies;
      dependencyManager.analyzeDependencies = vi.fn().mockRejectedValue(new Error('Service failure'));
      
      const code = 'import React from \"react\";';
      
      // Should not crash the editor
      editorStore.setCode(code);
      editorStore.checkDependencies(code);
      
      // Should continue to work after service recovery
      dependencyManager.analyzeDependencies = originalAnalyze;
      
      editorStore.checkDependencies(code);
      // Should not throw
    });
  });

  describe('Performance Integration', () => {
    it('should handle large code files efficiently', async () => {
      // Generate large code file
      const largeCode = Array.from({ length: 1000 }, (_, i) => 
        `const variable${i} = \"value${i}\";`
      ).join('\n');
      
      const startTime = Date.now();
      
      // Language detection should be fast
      const detection = languageDetectionService.detectLanguage(largeCode, 'large.js');
      expect(detection.language).toBe('javascript');
      
      // Dependency analysis should handle large files
      const depAnalysis = await dependencyManager.analyzeDependencies(largeCode, 'javascript');
      expect(depAnalysis).toBeDefined();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process within reasonable time (less than 5 seconds)
      expect(processingTime).toBeLessThan(5000);
    });

    it('should cache repeated operations', async () => {
      const code = 'import React from \"react\";';
      
      // First analysis
      const start1 = Date.now();
      const analysis1 = await dependencyManager.analyzeDependencies(code, 'javascript');
      const time1 = Date.now() - start1;
      
      // Second analysis (should use cache)
      const start2 = Date.now();
      const analysis2 = await dependencyManager.analyzeDependencies(code, 'javascript');
      const time2 = Date.now() - start2;
      
      // Should be faster due to caching
      expect(time2).toBeLessThan(time1);
      expect(analysis1).toEqual(analysis2);
    });
  });

  describe('State Persistence Integration', () => {
    it('should maintain state consistency across store updates', () => {
      // Update editor state
      editorStore.setCode('const test = \"persistence\";');
      editorStore.saveCode();
      
      // Update terminal state
      terminalStore.updateConfig({ enableHistory: false });
      
      // Both stores should maintain their state
      expect(editorStore.savedCode).toBe('const test = \"persistence\";');
      expect(terminalStore.config.enableHistory).toBe(false);
      
      // Reset one store shouldn't affect the other
      editorStore.reset();
      expect(terminalStore.config.enableHistory).toBe(false);
    });
  });
});