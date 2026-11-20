import { createContext, useContext } from 'react';

/** Set by the web AppShell: the sidebar's top-level paths (a page at one of them shows no breadcrumb). */
export interface ShellInfo {
  topPaths: string[];
}

export const ShellContext = createContext<ShellInfo | null>(null);
export const useShell = () => useContext(ShellContext);

/** Screen ↔ LargeTitle: the page title, for the breadcrumb and the browser tab title. */
export const PageTitleContext = createContext<((title: string) => void) | null>(null);
