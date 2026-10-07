'use client';

import type { ReactNode } from 'react';
import { METRIKA_ID, botLink } from '../config';

type Props = { className?: string; place: string; children: ReactNode };

export const BotLink = ({ className, place, children }: Props) => {
  const onClick = () => {
    if (METRIKA_ID) window.ym?.(METRIKA_ID, 'reachGoal', `open_bot_${place}`);
  };

  return (
    <a className={className} href={botLink} target="_blank" rel="noopener" onClick={onClick}>
      {children}
    </a>
  );
};
