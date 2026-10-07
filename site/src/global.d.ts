declare global {
  interface Window {
    ym?: (id: number, action: string, target: string) => void;
  }
}

export {};
