import type { KeyboardEvent } from 'react';

export function radioGroupKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'));
  if (!radios.length) return;
  const current = radios.indexOf(document.activeElement as HTMLElement);
  let next = current;
  if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = radios.length - 1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % radios.length;
  else next = (current - 1 + radios.length) % radios.length;
  e.preventDefault();
  radios[next]?.focus();
  radios[next]?.click();
}

export function tabListKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(e.key)) return;
  const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
  if (!tabs.length) return;
  const current = tabs.indexOf(document.activeElement as HTMLElement);
  let next = current;
  if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (current + 1) % tabs.length;
  else next = (current - 1 + tabs.length) % tabs.length;
  e.preventDefault();
  tabs[next]?.focus();
}
