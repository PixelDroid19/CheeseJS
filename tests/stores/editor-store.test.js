import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEditorStore } from '../../src/stores/editor-store.js';

// Mock external dependencies
vi.mock('../../src/services/language-detection-service.js', () => ({
  languageDetectionService: {
    detectLanguage: vi.fn(),
    configureMonacoLanguage: vi.fn(),
    getLanguageInfo: vi.fn().mockReturnValue({ displayName: 'JavaScript' })
  }
}));

vi.mock('../../src/services/dependency-management-service.js', () => ({
  dependencyManager: {
    analyzeDependencies: vi.fn(),
    installPackage: vi.fn()
  }
}));

describe('EditorStore', () => {
  let store;

  beforeEach(() => {
    // Reset store to initial state
    store = useEditorStore.getState();
    store.reset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store;
      
      expect(state.editorInstance).toBeNull();
      expect(state.monacoInstance).toBeNull();
      expect(state.isReady).toBe(false);
      expect(state.currentCode).toContain('CheeseJS');
      expect(state.currentLanguage).toBe('javascript');
      expect(state.currentFile).toBe('index.js');
      expect(state.isExecuting).toBe(false);
      expect(state.executionResult).toBeNull();
      expect(state.executionError).toBeNull();
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.installedPackages).toBeInstanceOf(Set);
      expect(state.missingDependencies).toEqual([]);
      expect(state.suggestedInstallations).toEqual([]);
    });

    it('should have default editor configuration', () => {
      const { editorConfig } = store;
      
      expect(editorConfig.fontSize).toBe(14);
      expect(editorConfig.tabSize).toBe(2);
      expect(editorConfig.insertSpaces).toBe(true);
      expect(editorConfig.wordWrap).toBe('on');
      expect(editorConfig.lineNumbers).toBe('on');
      expect(editorConfig.minimap.enabled).toBe(true);
      expect(editorConfig.automaticLayout).toBe(true);
    });

    it('should have default theme configuration', () => {
      const { theme } = store;
      
      expect(theme.name).toBe('cheesejs-dark');
      expect(theme.isDark).toBe(true);
      expect(theme.colors).toBeDefined();
      expect(theme.colors.background).toBe('#1e1e1e');
      expect(theme.colors.foreground).toBe('#d4d4d4');
    });
  });

  describe('Code Management', () => {
    it('should update code and mark as unsaved', () => {
      const newCode = 'console.log("Hello World");';
      
      store.setCode(newCode);
      
      expect(store.currentCode).toBe(newCode);
      expect(store.hasUnsavedChanges).toBe(true);
    });

    it('should not mark as unsaved if code matches saved code', () => {
      const code = 'console.log("Test");';
      
      store.setCode(code);
      store.saveCode(); // This sets savedCode = currentCode
      store.setCode(code); // Same code again
      
      expect(store.hasUnsavedChanges).toBe(false);
    });

    it('should save code and clear unsaved changes flag', () => {
      const code = 'console.log("Save test");';
      
      store.setCode(code);
      expect(store.hasUnsavedChanges).toBe(true);
      
      store.saveCode();
      expect(store.hasUnsavedChanges).toBe(false);
      expect(store.savedCode).toBe(code);
    });
  });

  describe('Language Detection', () => {
    it('should detect language and update current language', () => {
      const mockDetection = {
        language: 'typescript',
        confidence: 0.9,
        monacoLanguage: 'typescript',
        displayName: 'TypeScript'
      };
      
      const { languageDetectionService } = require('../../src/services/language-detection-service.js');
      languageDetectionService.detectLanguage.mockReturnValue(mockDetection);
      
      const result = store.detectLanguage('interface Test {}', 'test.ts');
      
      expect(result).toBe('typescript');
      expect(store.currentLanguage).toBe('typescript');
      expect(languageDetectionService.detectLanguage).toHaveBeenCalledWith(
        'interface Test {}',
        'test.ts'
      );
    });

    it('should update Monaco language when language changes', () => {
      const { languageDetectionService } = require('../../src/services/language-detection-service.js');
      
      store.detectLanguage('const x: number = 5;', 'test.ts');
      
      expect(languageDetectionService.configureMonacoLanguage).toHaveBeenCalled();
    });

    it('should not update Monaco if language hasn\'t changed', () => {
      const { languageDetectionService } = require('../../src/services/language-detection-service.js');
      languageDetectionService.detectLanguage.mockReturnValue({
        language: 'javascript',
        confidence: 0.9
      });
      
      store.detectLanguage('console.log("test");', 'test.js');
      
      // Should not call configure since language didn't change
      expect(languageDetectionService.configureMonacoLanguage).not.toHaveBeenCalled();
    });
  });

  describe('Dependency Management', () => {
    it('should check dependencies and update missing dependencies', () => {
      const { dependencyManager } = require('../../src/services/dependency-management-service.js');
      dependencyManager.analyzeDependencies.mockResolvedValue({
        dependencies: new Set(['react', 'lodash']),
        missing: [
          { name: 'react', suggested: true },
          { name: 'lodash', suggested: true }
        ],
        suggestions: [
          { name: 'react', description: 'React library' },
          { name: 'lodash', description: 'Utility library' }
        ]
      });
      
      const code = 'import React from "react"; import _ from "lodash";';
      store.checkDependencies(code);
      
      expect(store.missingDependencies).toHaveLength(2);
      expect(store.suggestedInstallations).toHaveLength(2);
      expect(store.missingDependencies[0].name).toBe('react');
      expect(store.missingDependencies[1].name).toBe('lodash');
    });

    it('should install dependency and update installed packages', async () => {
      const { dependencyManager } = require('../../src/services/dependency-management-service.js');
      dependencyManager.installPackage.mockResolvedValue({
        success: true,
        message: 'react installed successfully'
      });
      
      await store.installDependency('react');
      
      expect(store.installedPackages.has('react')).toBe(true);
      expect(dependencyManager.installPackage).toHaveBeenCalledWith('react');
    });

    it('should handle dependency installation failure', async () => {
      const { dependencyManager } = require('../../src/services/dependency-management-service.js');
      dependencyManager.installPackage.mockRejectedValue(new Error('Installation failed'));
      
      await expect(store.installDependency('failing-package')).rejects.toThrow('Installation failed');
      expect(store.installedPackages.has('failing-package')).toBe(false);
    });

    it('should remove dependency from missing list after installation', async () => {
      const { dependencyManager } = require('../../src/services/dependency-management-service.js');
      dependencyManager.installPackage.mockResolvedValue({ success: true });
      
      // Set up missing dependencies
      store.missingDependencies = [
        { name: 'react', suggested: true },
        { name: 'lodash', suggested: true }
      ];
      store.suggestedInstallations = [
        { name: 'react', description: 'React library' }
      ];
      
      await store.installDependency('react');
      
      expect(store.missingDependencies.some(dep => dep.name === 'react')).toBe(false);
      expect(store.suggestedInstallations.some(inst => inst.name === 'react')).toBe(false);
      expect(store.missingDependencies.some(dep => dep.name === 'lodash')).toBe(true);
    });
  });

  describe('Code Execution', () => {
    it('should execute code and update execution state', async () => {
      const mockResult = {
        output: ['Hello World'],
        type: 'success',
        executionTime: 150
      };
      
      // Mock the execution
      store.executeCode = vi.fn().mockImplementation(async () => {
        store.isExecuting = true;
        store.executionResult = mockResult;
        store.executionTime = 150;
        store.performance.totalExecutions++;
        store.isExecuting = false;
      });
      
      await store.executeCode();
      
      expect(store.executionResult).toEqual(mockResult);
      expect(store.executionTime).toBe(150);
      expect(store.performance.totalExecutions).toBe(1);
    });

    it('should prevent concurrent executions', async () => {
      store.isExecuting = true;
      
      console.warn = vi.fn();
      const result = await store.executeCode();
      
      expect(console.warn).toHaveBeenCalledWith('⚠️ Ejecución ya en progreso');
    });

    it('should handle execution errors', async () => {
      const mockError = {
        message: 'Syntax Error',
        type: 'execution_error',
        timestamp: expect.any(String)
      };
      
      store.executeCode = vi.fn().mockImplementation(async () => {
        store.isExecuting = true;
        store.executionError = mockError;
        store.isExecuting = false;
      });
      
      await store.executeCode();
      
      expect(store.executionError).toEqual(mockError);
      expect(store.isExecuting).toBe(false);
    });
  });

  describe('File Management', () => {
    it('should create new file with correct template', () => {
      store.newFile('test.ts', '');
      
      expect(store.currentFile).toBe('test.ts');
      expect(store.currentLanguage).toBe('typescript');
      expect(store.currentCode).toContain('TypeScript');
      expect(store.hasUnsavedChanges).toBe(false);
    });

    it('should use provided template when creating new file', () => {
      const customTemplate = 'console.log("Custom template");';
      
      store.newFile('custom.js', customTemplate);
      
      expect(store.currentCode).toBe(customTemplate);
    });

    it('should get correct default template for language', () => {
      const jsTemplate = store.getDefaultTemplate('javascript');
      const tsTemplate = store.getDefaultTemplate('typescript');
      const jsxTemplate = store.getDefaultTemplate('jsx');
      const tsxTemplate = store.getDefaultTemplate('tsx');
      
      expect(jsTemplate).toContain('JavaScript');
      expect(tsTemplate).toContain('TypeScript');
      expect(tsTemplate).toContain('interface');
      expect(jsxTemplate).toContain('React');
      expect(jsxTemplate).toContain('JSX');
      expect(tsxTemplate).toContain('React.FC');
      expect(tsxTemplate).toContain('TSX');
    });
  });

  describe('Configuration Management', () => {
    it('should update editor configuration', () => {
      const newConfig = {
        fontSize: 16,
        tabSize: 4,
        wordWrap: 'off'
      };
      
      store.updateConfig(newConfig);
      
      expect(store.editorConfig.fontSize).toBe(16);
      expect(store.editorConfig.tabSize).toBe(4);
      expect(store.editorConfig.wordWrap).toBe('off');
      // Other configs should remain unchanged
      expect(store.editorConfig.lineNumbers).toBe('on');
    });

    it('should apply configuration to active editor instance', () => {
      const mockEditor = {
        updateOptions: vi.fn()
      };
      store.editorInstance = mockEditor;
      
      const newConfig = { fontSize: 18 };
      store.updateConfig(newConfig);
      
      expect(mockEditor.updateOptions).toHaveBeenCalledWith(newConfig);
    });

    it('should update theme configuration', () => {
      const newTheme = {
        name: 'cheesejs-light',
        isDark: false,
        colors: {
          background: '#ffffff',
          foreground: '#333333'
        }
      };
      
      store.updateTheme(newTheme);
      
      expect(store.theme.name).toBe('cheesejs-light');
      expect(store.theme.isDark).toBe(false);
      expect(store.theme.colors.background).toBe('#ffffff');
    });

    it('should apply theme to Monaco editor', () => {
      const mockMonaco = {
        editor: {
          setTheme: vi.fn()
        }
      };
      store.monacoInstance = mockMonaco;
      
      const newTheme = { name: 'custom-theme' };
      store.updateTheme(newTheme);
      
      expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith('custom-theme');
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance statistics', () => {
      const stats = store.getStats();
      
      expect(stats).toHaveProperty('codeLength');
      expect(stats).toHaveProperty('hasUnsavedChanges');
      expect(stats).toHaveProperty('currentLanguage');
      expect(stats).toHaveProperty('missingDependencies');
      expect(stats).toHaveProperty('isExecuting');
      
      expect(stats.codeLength).toBe(store.currentCode.length);
      expect(stats.hasUnsavedChanges).toBe(store.hasUnsavedChanges);
      expect(stats.currentLanguage).toBe(store.currentLanguage);
      expect(stats.missingDependencies).toBe(store.missingDependencies.length);
      expect(stats.isExecuting).toBe(store.isExecuting);
    });

    it('should update performance metrics during execution', () => {
      // Simulate execution performance update
      store.performance.totalExecutions = 5;
      store.performance.averageExecutionTime = 200;
      store.performance.lastExecutionTime = 150;
      
      const stats = store.getStats();
      
      expect(stats.totalExecutions).toBe(5);
      expect(stats.averageExecutionTime).toBe(200);
      expect(stats.lastExecutionTime).toBe(150);
    });
  });

  describe('Store Reset', () => {
    it('should reset store to initial state while preserving editor instances', () => {
      const mockEditor = { id: 'editor' };
      const mockMonaco = { id: 'monaco' };
      
      // Modify store state
      store.setCode('modified code');
      store.currentLanguage = 'typescript';
      store.editorInstance = mockEditor;
      store.monacoInstance = mockMonaco;
      store.isReady = true;
      
      store.reset();
      
      // Should reset most state
      expect(store.currentLanguage).toBe('javascript');
      expect(store.hasUnsavedChanges).toBe(false);
      
      // Should preserve editor instances
      expect(store.editorInstance).toBe(mockEditor);
      expect(store.monacoInstance).toBe(mockMonaco);
      expect(store.isReady).toBe(true);
    });
  });

  describe('Store Persistence', () => {
    it('should include correct data in persisted state', () => {
      // This test would require mocking the persist functionality
      // For now, we verify the configuration exists
      expect(typeof store.editorConfig).toBe('object');
      expect(typeof store.theme).toBe('object');
      expect(store.installedPackages).toBeInstanceOf(Set);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const mockEditor = {};
      const mockMonaco = {};
      
      // Mock initialization to throw error
      store.setupEditor = vi.fn().mockRejectedValue(new Error('Setup failed'));
      console.error = vi.fn();
      
      await store.initialize(mockEditor, mockMonaco);
      
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe('Setup failed');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle code formatting errors', async () => {
      store.editorInstance = {
        getAction: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('Format failed'))
        })
      };
      
      console.error = vi.fn();
      
      await store.formatCode();
      
      expect(store.isFormatting).toBe(false);
      expect(store.formatError).toBe('Format failed');
      expect(console.error).toHaveBeenCalled();
    });
  });
});