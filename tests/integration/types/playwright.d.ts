// Type declarations for Playwright global functions and types
declare module '@playwright/test' {
  export const test: any;
  export const expect: any;
  export interface Page {
    goto: (url: string) => Promise<any>;
    fill: (selector: string, value: string) => Promise<void>;
    click: (selector: string) => Promise<void>;
    waitForURL: (url: string) => Promise<void>;
    getByLabel: (text: string) => any;
    getByRole: (role: string, options?: any) => any;
    getByText: (text: string) => any;
    url: () => string;
  }
  export const devices: Record<string, any>;
  export function defineConfig(config: any): any;
} 