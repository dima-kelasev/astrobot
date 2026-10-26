import { isTMA, on, postEvent, retrieveRawInitData } from '@telegram-apps/bridge';

const detect = () => {
  try {
    return isTMA();
  } catch {
    return false;
  }
};

const inTelegram = detect();

const safe = (call: () => void) => {
  if (!inTelegram) return;
  try {
    call();
  } catch {}
};

const BG = '#121833';

export const telegram = {
  inTelegram,
  initData: () => {
    if (!inTelegram) return '';
    try {
      return retrieveRawInitData() ?? '';
    } catch {
      return '';
    }
  },
  ready: () => {
    safe(() => postEvent('web_app_ready'));
    safe(() => postEvent('web_app_expand'));
    safe(() => postEvent('web_app_set_header_color', { color: BG }));
    safe(() => postEvent('web_app_set_background_color', { color: BG }));
  },
  backButton: (visible: boolean) => safe(() => postEvent('web_app_setup_back_button', { is_visible: visible })),
  onBack: (handler: () => void) => on('back_button_pressed', handler),
  impact: (style: 'light' | 'medium') => safe(() => postEvent('web_app_trigger_haptic_feedback', { type: 'impact', impact_style: style })),
  openLink: (url: string) => {
    if (inTelegram) {
      safe(() => postEvent('web_app_open_link', { url }));
      return;
    }
    window.open(url, '_blank', 'noopener');
  }
};
