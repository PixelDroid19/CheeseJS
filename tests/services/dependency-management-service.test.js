import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DependencyManagementService } from '../../src/services/dependency-management-service.js';

describe('DependencyManagementService', () => {
  let service;

  beforeEach(() => {
    service = new DependencyManagementService();
    // Reset to clean state
    service.installedPackages.clear();
    service.installedPackages.add('@types/node'); // Default package
    service.installationQueue.clear();
    service.installationHistory = [];
  });

  describe('Dependency Analysis', () => {
    it('should detect ES6 imports correctly', async () => {
      const code = `
        import React from 'react';
        import { useState } from 'react';
        import axios from 'axios';
        import * as lodash from 'lodash';
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.dependencies.has('react')).toBe(true);
      expect(analysis.dependencies.has('axios')).toBe(true);
      expect(analysis.dependencies.has('lodash')).toBe(true);
      expect(analysis.missing.some(dep => dep.name === 'react')).toBe(true);
      expect(analysis.missing.some(dep => dep.name === 'axios')).toBe(true);
      expect(analysis.missing.some(dep => dep.name === 'lodash')).toBe(true);
    });

    it('should detect CommonJS requires correctly', async () => {
      const code = `
        const express = require('express');
        const path = require('path');
        const fs = require('fs');
        const moment = require('moment');
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.dependencies.has('express')).toBe(true);
      expect(analysis.dependencies.has('path')).toBe(true); // Native module
      expect(analysis.dependencies.has('fs')).toBe(true); // Native module
      expect(analysis.dependencies.has('moment')).toBe(true);
      
      // Native modules should not be in missing dependencies
      expect(analysis.missing.some(dep => dep.name === 'path')).toBe(false);
      expect(analysis.missing.some(dep => dep.name === 'fs')).toBe(false);
      
      // Third-party modules should be in missing dependencies
      expect(analysis.missing.some(dep => dep.name === 'express')).toBe(true);
      expect(analysis.missing.some(dep => dep.name === 'moment')).toBe(true);
    });

    it('should detect dynamic imports', async () => {
      const code = `
        const loadModule = async () => {
          const { default: chalk } = await import('chalk');
          const utils = await import('lodash/utils');
        };
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.dependencies.has('chalk')).toBe(true);
      expect(analysis.dependencies.has('lodash')).toBe(true); // Should normalize to base package
    });

    it('should ignore local imports', async () => {
      const code = `
        import './local-file.js';
        import '../parent/file.js';
        import '/absolute/path/file.js';
        const local = require('./local-module');
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.metadata.localImports).toBe(4);
      expect(analysis.metadata.thirdPartyPackages).toBe(0);
    });

    it('should handle scoped packages correctly', async () => {
      const code = `
        import { babel } from '@babel/core';
        import { ESLint } from '@eslint/js';
        const webpack = require('@webpack/cli');
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.dependencies.has('@babel/core')).toBe(true);
      expect(analysis.dependencies.has('@eslint/js')).toBe(true);
      expect(analysis.dependencies.has('@webpack/cli')).toBe(true);
    });

    it('should generate TypeScript type suggestions', async () => {
      const code = `
        import express from 'express';
        import lodash from 'lodash';
      `;
      
      const analysis = await service.analyzeDependencies(code, 'typescript');
      
      const typeSuggestions = analysis.suggestions.filter(s => s.category === 'types');
      expect(typeSuggestions.length).toBeGreaterThan(0);
      expect(typeSuggestions.some(s => s.name === '@types/express')).toBe(true);
      expect(typeSuggestions.some(s => s.name === '@types/lodash')).toBe(true);
    });
  });

  describe('Package Installation', () => {
    it('should install a package successfully', async () => {
      const result = await service.installPackage('react');
      
      expect(result.success).toBe(true);
      expect(service.isInstalled('react')).toBe(true);
      expect(service.installationHistory).toHaveLength(1);
      expect(service.installationHistory[0].package).toBe('react');
      expect(service.installationHistory[0].success).toBe(true);
    });

    it('should skip installation if package is already installed', async () => {
      service.installedPackages.add('react');
      
      const result = await service.installPackage('react');
      
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.message).toContain('ya está instalado');
    });

    it('should handle installation queue correctly', async () => {
      // Start installation but don't await
      const promise1 = service.installPackage('react');
      
      // Try to install same package again
      const result2 = await service.installPackage('react');
      
      expect(result2.success).toBe(false);
      expect(result2.pending).toBe(true);
      expect(result2.message).toContain('ya está en proceso');
      
      // Wait for first installation to complete
      await promise1;
    });

    it('should install multiple packages sequentially', async () => {
      const packages = ['react', 'lodash', 'axios'];
      
      const results = await service.installMultiplePackages(packages);
      
      expect(results.totalPackages).toBe(3);
      expect(results.successful).toBe(3);
      expect(results.failed).toBe(0);
      
      packages.forEach(pkg => {
        expect(service.isInstalled(pkg)).toBe(true);
      });
    });

    it('should install multiple packages in parallel', async () => {
      const packages = ['react', 'lodash', 'axios'];
      
      const results = await service.installMultiplePackages(packages, { parallel: true });
      
      expect(results.totalPackages).toBe(3);
      expect(results.successful).toBe(3);
      expect(results.failed).toBe(0);
    });

    it('should handle installation failures', async () => {
      // Mock a package that will fail
      const originalSimulate = service.simulateInstallation;
      service.simulateInstallation = vi.fn().mockRejectedValue(new Error('Installation failed'));
      
      const result = await service.installPackage('failing-package');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Installation failed');
      expect(service.isInstalled('failing-package')).toBe(false);
      
      // Restore original method
      service.simulateInstallation = originalSimulate;
    });
  });

  describe('Package Uninstallation', () => {
    it('should uninstall a package successfully', async () => {
      service.installedPackages.add('test-package');
      
      const result = await service.uninstallPackage('test-package');
      
      expect(result.success).toBe(true);
      expect(service.isInstalled('test-package')).toBe(false);
    });

    it('should handle uninstalling non-existent package', async () => {
      const result = await service.uninstallPackage('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('no está instalado');
    });
  });

  describe('Dependency Utilities', () => {
    it('should normalize package names correctly', () => {
      expect(service.normalizePackageName('lodash/debounce')).toBe('lodash');
      expect(service.normalizePackageName('@babel/core/lib')).toBe('@babel/core');
      expect(service.normalizePackageName('react')).toBe('react');
      expect(service.normalizePackageName('@types/node')).toBe('@types/node');
    });

    it('should identify native modules correctly', () => {
      expect(service.isNativeModule('fs')).toBe(true);
      expect(service.isNativeModule('path')).toBe(true);
      expect(service.isNativeModule('os')).toBe(true);
      expect(service.isNativeModule('crypto')).toBe(true);
      expect(service.isNativeModule('react')).toBe(false);
      expect(service.isNativeModule('lodash')).toBe(false);
    });

    it('should identify local imports correctly', () => {
      expect(service.isLocalImport('./file.js')).toBe(true);
      expect(service.isLocalImport('../parent/file.js')).toBe(true);
      expect(service.isLocalImport('/absolute/path')).toBe(true);
      expect(service.isLocalImport('react')).toBe(false);
      expect(service.isLocalImport('@babel/core')).toBe(false);
    });

    it('should calculate install priority correctly', () => {
      expect(service.calculateInstallPriority('react', 'jsx')).toBe('high');
      expect(service.calculateInstallPriority('react', 'javascript')).toBe('medium');
      expect(service.calculateInstallPriority('typescript', 'typescript')).toBe('high');
      expect(service.calculateInstallPriority('@types/node', 'typescript')).toBe('medium');
      expect(service.calculateInstallPriority('lodash', 'javascript')).toBe('medium');
      expect(service.calculateInstallPriority('unknown-package', 'javascript')).toBe('low');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting packages', async () => {
      const code = `
        import moment from 'moment';
        import { format } from 'date-fns';
        import _ from 'lodash';
        import * as underscore from 'underscore';
      `;
      
      const analysis = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis.conflicts.length).toBeGreaterThan(0);
      
      const momentConflict = analysis.conflicts.find(c => 
        c.packages.includes('moment') && c.packages.includes('date-fns')
      );
      expect(momentConflict).toBeDefined();
      expect(momentConflict.type).toBe('alternative');
      
      const utilityConflict = analysis.conflicts.find(c => 
        c.packages.includes('lodash') && c.packages.includes('underscore')
      );
      expect(utilityConflict).toBeDefined();
    });
  });

  describe('Smart Suggestions', () => {
    it('should provide smart suggestions for JSX', () => {
      const suggestions = service.getSmartSuggestions('jsx', '<div>Hello</div>');
      
      const reactSuggestion = suggestions.find(s => s.name === 'react');
      expect(reactSuggestion).toBeDefined();
      expect(reactSuggestion.priority).toBe('high');
      expect(reactSuggestion.reason).toContain('Required for JSX');
    });

    it('should provide smart suggestions for TypeScript', () => {
      const suggestions = service.getSmartSuggestions('typescript', 'interface User {}');
      
      const typesSuggestion = suggestions.find(s => s.name === '@types/node');
      expect(typesSuggestion).toBeDefined();
      expect(typesSuggestion.priority).toBe('medium');
    });

    it('should provide smart suggestions for TSX', () => {
      const suggestions = service.getSmartSuggestions('tsx', 'const App: React.FC = () => <div />;');
      
      expect(suggestions.some(s => s.name === 'react')).toBe(true);
      expect(suggestions.some(s => s.name === '@types/node')).toBe(true);
    });

    it('should provide context-based suggestions', () => {
      const httpSuggestions = service.getSmartSuggestions('javascript', 'fetch("http://api.example.com")');
      
      const axiosSuggestion = httpSuggestions.find(s => s.name === 'axios');
      expect(axiosSuggestion).toBeDefined();
      expect(axiosSuggestion.reason).toContain('HTTP client');
    });
  });

  describe('Package Information', () => {
    it('should return known package information', async () => {
      const reactInfo = await service.getPackageInfo('react');
      
      expect(reactInfo.exists).toBe(true);
      expect(reactInfo.description).toContain('interfaces de usuario');
      expect(reactInfo.category).toBe('ui-framework');
      expect(reactInfo.dependencies).toContain('react-dom');
    });

    it('should handle unknown packages', async () => {
      const unknownInfo = await service.getPackageInfo('very-unknown-package-12345');
      
      // Should still return mock info (90% chance of existing in current implementation)
      expect(unknownInfo.exists).toBeDefined();
      expect(unknownInfo.description).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should export configuration correctly', () => {
      service.installedPackages.add('react');
      service.installedPackages.add('lodash');
      service.installationHistory.push({
        package: 'react',
        success: true,
        installedAt: new Date().toISOString()
      });
      
      const config = service.exportConfig();
      
      expect(config.installedPackages).toContain('react');
      expect(config.installedPackages).toContain('lodash');
      expect(config.installationHistory).toHaveLength(1);
      expect(config.config).toBeDefined();
    });

    it('should import configuration correctly', () => {
      const testConfig = {
        installedPackages: ['test1', 'test2'],
        config: { autoInstallSuggestions: false },
        installationHistory: [{ package: 'test1', success: true }]
      };
      
      service.importConfig(testConfig);
      
      expect(service.isInstalled('test1')).toBe(true);
      expect(service.isInstalled('test2')).toBe(true);
      expect(service.config.autoInstallSuggestions).toBe(false);
      expect(service.installationHistory).toHaveLength(1);
    });
  });

  describe('Cache Management', () => {
    it('should cache analysis results', async () => {
      const code = 'import React from "react";';
      
      // First analysis
      const analysis1 = await service.analyzeDependencies(code, 'javascript');
      
      // Second analysis should use cache
      const analysis2 = await service.analyzeDependencies(code, 'javascript');
      
      expect(analysis1).toEqual(analysis2);
    });

    it('should respect cache size limits', async () => {
      const originalMaxSize = service.maxCacheSize;
      service.maxCacheSize = 2;
      
      // Add more items than cache size
      await service.analyzeDependencies('code1', 'javascript');
      await service.analyzeDependencies('code2', 'javascript');
      await service.analyzeDependencies('code3', 'javascript');
      
      expect(service.analysisCache.size).toBeLessThanOrEqual(2);
      
      service.maxCacheSize = originalMaxSize;
    });

    it('should clear cache when requested', async () => {
      await service.analyzeDependencies('import React from "react";', 'javascript');
      
      expect(service.analysisCache.size).toBeGreaterThan(0);
      
      service.clearCache();
      expect(service.analysisCache.size).toBe(0);
    });
  });

  describe('Status and Statistics', () => {
    it('should provide dependency status', () => {
      service.installedPackages.add('react');
      service.installationQueue.set('lodash', { status: 'pending' });
      service.installationHistory.push({ package: 'axios', success: true });
      
      const status = service.getDependencyStatus();
      
      expect(status.installed).toContain('react');
      expect(status.installing).toContain('lodash');
      expect(status.history).toHaveLength(1);
      expect(status.cacheStats).toBeDefined();
    });
  });
});