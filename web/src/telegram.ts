import { isTMA, on, postEvent, retrieveRawInitData } from '@telegram-apps/bridge';

type MaxBackButton = {
  show?: () => void;
  hide?: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
};

type MaxWebApp = {
  initData?: string;
  platform?: string;
  ready?: () => void;
  expand?: () => void;
  openLink?: (url: string) => void;
  BackButton?: MaxBackButton;
  HapticFeedback?: { impactOccurred?: (style: string) => Promise<unknown> };
};

declare global {
  interface Window {
    WebApp?: MaxWebApp;
  }
}

export type Platform = 'tg' | 'max' | '';

const detectTg = () => {
  try {
    return isTMA();
  } catch {
    return false;
  }
};

let platform: Platform = detectTg() ? 'tg' : '';
let maxApp: MaxWebApp | null = null;

const MAX_BRIDGE_URL = 'https://st.max.ru/js/max-web-app.js';

const loadMaxBridge = () =>
  new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = MAX_BRIDGE_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

export const initPlatform = async () => {
  if (platform) return;
  try {
    await loadMaxBridge();
    if (window.WebApp?.initData) {
      platform = 'max';
      maxApp = window.WebApp;
    }
  } catch {}
};

const inMessenger = () => platform !== '';

const safe = (call: () => void) => {
  if (!inMessenger()) return;
  try {
    call();
  } catch {}
};

const BG = '#121833';

export const telegram = {
  get inTelegram() {
    return inMessenger();
  },
  get platform() {
    return platform;
  },
  init: initPlatform,
  initData: () => {
    if (platform === 'max') return maxApp?.initData ?? '';
    if (platform === 'tg') {
      try {
        return retrieveRawInitData() ?? '';
      } catch {
        return '';
      }
    }
    return '';
  },
  ready: () => {
    if (platform === 'max') {
      safe(() => maxApp?.ready?.());
      safe(() => maxApp?.expand?.());
      return;
    }
    safe(() => postEvent('web_app_ready'));
    safe(() => postEvent('web_app_expand'));
    safe(() => postEvent('web_app_set_header_color', { color: BG }));
    safe(() => postEvent('web_app_set_background_color', { color: BG }));
  },
  backButton: (visible: boolean) => {
    if (platform === 'max') {
      safe(() => (visible ? maxApp?.BackButton?.show?.() : maxApp?.BackButton?.hide?.()));
      return;
    }
    safe(() => postEvent('web_app_setup_back_button', { is_visible: visible }));
  },
  onBack: (handler: () => void) => {
    if (platform === 'max') {
      const button = maxApp?.BackButton;
      if (button?.onClick) {
        safe(() => button.onClick?.(handler));
        return () => safe(() => button.offClick?.(handler));
      }
      return () => {};
    }
    return on('back_button_pressed', handler);
  },
  impact: (style: 'light' | 'medium') => {
    if (platform === 'max') {
      safe(() => void maxApp?.HapticFeedback?.impactOccurred?.(style));
      return;
    }
    safe(() => postEvent('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: style }));
  },
  openLink: (url: string) => {
    if (platform === 'max') {
      const app = maxApp;
      if (app?.openLink) {
        safe(() => app.openLink?.(url));
        return;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (platform === 'tg') {
      safe(() => postEvent('web_app_open_link', { url }));
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
};
