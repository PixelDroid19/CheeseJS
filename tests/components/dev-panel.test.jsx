import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DevPanel } from '../../src/components/dev-panel/dev-panel.jsx';

// Mock de dependencias
vi.mock('../../src/components/layout/theme-provider.jsx', () => ({
  useTheme: () => ({
    currentTheme: 'light',
    isDarkTheme: false
  })
}));

vi.mock('../../src/hooks/use-i18n.js', () => ({
  useI18n: () => ({
    t: (key) => key,
    isReady: true
  })
}));

vi.mock('../../src/hooks/use-dev-panel-store.js', () => ({
  useDevPanel: () => ({
    isInitialized: true,
    isLoading: false,
    hasError: false,
    error: null,
    activeTab: 'output',
    panels: {
      available: [
        {
          id: 'output',
          name: 'OUTPUT',
          icon: '📄',
          component: () => React.createElement('div', null, 'Output Panel'),
          disabled: false,
          showCount: true,
          priority: 2
        },
        {
          id: 'terminal',
          name: 'TERMINAL',
          icon: '🖥️',
          component: () => React.createElement('div', null, 'Terminal Panel'),
          disabled: false,
          showCount: false,
          priority: 4
        }
      ],
      active: {
        id: 'output',
        name: 'OUTPUT',
        icon: '📄',
        component: () => React.createElement('div', null, 'Output Panel'),
        disabled: false,
        showCount: true,
        priority: 2
      }
    },
    navigation: {
      switch: vi.fn()
    },
    panelState: {
      get: () => ({}),
      updateActive: vi.fn()
    },
    actions: {
      execute: vi.fn()
    },
    initialize: vi.fn(),
    stats: {}
  })
}));

vi.mock('../../src/core/default-panels.jsx', () => ({
  registerDefaultPanels: vi.fn().mockResolvedValue([])
}));

vi.mock('../../src/components/dev-panel/panel-tab-manager.jsx', () => ({
  PanelTabManager: ({ panels, activeTab }) => (
    React.createElement('div', { 'data-testid': 'panel-tab-manager' },
      React.createElement('div', null, 'Active Tab: ' + activeTab),
      React.createElement('div', null, 'Panels Count: ' + panels.length)
    )
  )
}));

describe('DevPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar correctamente cuando está inicializado', () => {
    render(React.createElement(DevPanel));
    
    // Verificar que se muestra el contenido del panel
    expect(screen.getByText('Output Panel')).toBeInTheDocument();
    
    // Verificar que se muestra el tab manager
    expect(screen.getByTestId('panel-tab-manager')).toBeInTheDocument();
  });

  it('debería mostrar mensaje de carga cuando no está inicializado', () => {
    // Mock del hook para simular estado no inicializado
    vi.mock('../../src/hooks/use-dev-panel-store.js', async () => {
      const actual = await vi.importActual('../../src/hooks/use-dev-panel-store.js');
      return {
        ...actual,
        useDevPanel: () => ({
          isInitialized: false,
          isLoading: true,
          hasError: false,
          error: null,
          activeTab: 'output',
          panels: {
            available: [],
            active: null
          },
          navigation: {
            switch: vi.fn()
          },
          panelState: {
            get: () => ({}),
            updateActive: vi.fn()
          },
          actions: {
            execute: vi.fn()
          },
          initialize: vi.fn(),
          stats: {}
        })
      };
    });
    
    render(React.createElement(DevPanel));
    
    // Verificar que se muestra el mensaje de carga
    expect(screen.getByText('Inicializando Panel de Desarrollo...')).toBeInTheDocument();
  });
});