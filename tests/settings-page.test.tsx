/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from '../src/pages/Settings';

const authState = vi.hoisted(() => ({
  logout: vi.fn(),
  refreshAccount: vi.fn(),
  isAdmin: false,
  user: null as null | { id: number; username: string; role: string; created_at: string },
}));

const refreshDashboardStats = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const getAccount = vi.hoisted(() => vi.fn());
const updateAccount = vi.hoisted(() => vi.fn());
const resetCollection = vi.hoisted(() => vi.fn());
const changePassword = vi.hoisted(() => vi.fn());
const listUsers = vi.hoisted(() => vi.fn());
const renameUser = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../src/lib/DashboardStatsContext', () => ({
  useDashboardStats: () => ({
    refresh: refreshDashboardStats,
  }),
}));

vi.mock('../src/lib/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../src/lib/ToastContext', () => ({
  useToast: () => ({
    success: toastSuccess,
    error: toastError,
  }),
}));

vi.mock('../src/lib/api', () => ({
  api: {
    getAccount,
    updateAccount,
    resetCollection,
    changePassword,
    listUsers,
    renameUser,
  },
}));

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderSettings() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root?.render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

function requireElement<T extends Element>(element: T | null | undefined, description: string) {
  if (!element) {
    throw new Error(`Expected ${description} to exist`);
  }

  return element;
}

function getInputByLabel(rendered: HTMLElement, labelText: string) {
  const label = Array.from(rendered.querySelectorAll('label')).find((nextLabel) =>
    nextLabel.textContent?.includes(labelText),
  );

  return requireElement(label?.querySelector('input'), `${labelText} input`);
}

function getButtonByText(rendered: HTMLElement, buttonText: string) {
  const button = Array.from(rendered.querySelectorAll('button')).find(
    (nextButton) => nextButton.textContent === buttonText,
  );

  return requireElement(button, `${buttonText} button`);
}

describe('Settings page', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    authState.logout.mockReset();
    authState.refreshAccount.mockReset();
    authState.refreshAccount.mockResolvedValue(undefined);
    authState.isAdmin = false;
    authState.user = null;
    refreshDashboardStats.mockReset();
    refreshDashboardStats.mockResolvedValue(null);
    toastSuccess.mockReset();
    toastError.mockReset();
    getAccount.mockReset();
    getAccount.mockResolvedValue({
      discogsUsername: 'miles',
      tokenConfigured: true,
      tokenPreview: 'abcd...wxyz',
      currency: 'EUR',
    });
    updateAccount.mockReset();
    updateAccount.mockResolvedValue({
      discogsUsername: 'sonny',
      tokenConfigured: true,
      tokenPreview: 'abcd...wxyz',
      currency: 'EUR',
      cacheReset: true,
      message: 'backend.account.updatedReset',
    });
    resetCollection.mockReset();
    resetCollection.mockResolvedValue({
      ok: true,
      message: 'backend.account.reset',
    });
    changePassword.mockReset();
    changePassword.mockResolvedValue({
      ok: true,
      message: 'settings.passwordSaved',
    });
    listUsers.mockReset();
    listUsers.mockResolvedValue({ users: [] });
    renameUser.mockReset();
    renameUser.mockResolvedValue({ ok: true, message: 'backend.admin.usernameUpdated' });
    window.confirm = vi.fn(() => true);
  });

  afterEach(async () => {
    window.confirm = originalConfirm;
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it('refreshes account and dashboard state after saving a changed Discogs account', async () => {
    const rendered = await renderSettings();
    const usernameInput = getInputByLabel(rendered, 'settings.discogsUser');
    const accountForm = requireElement(usernameInput.closest('form'), 'account form');

    await act(async () => {
      usernameInput.value = 'sonny';
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      accountForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(updateAccount).toHaveBeenCalledTimes(1);
    expect(authState.refreshAccount).toHaveBeenCalledTimes(1);
    expect(refreshDashboardStats).toHaveBeenCalledTimes(1);
  });

  it('masks the Discogs token input', async () => {
    const rendered = await renderSettings();
    const tokenInput = getInputByLabel(rendered, 'settings.newTokenOptional');

    expect(tokenInput.getAttribute('type')).toBe('password');
  });

  it('lets an administrator rename their own login and refreshes the displayed account', async () => {
    const user = { id: 7, username: 'administrator', role: 'admin', created_at: '2026-01-01' };
    authState.isAdmin = true;
    authState.user = user;
    listUsers.mockResolvedValue({ users: [user] });
    const rendered = await renderSettings();

    const renameButton = getButtonByText(rendered, 'settings.renameUsername');
    await act(async () => {
      renameButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const usernameInput = getInputByLabel(rendered, 'settings.renameUsername');
    const renameForm = requireElement(usernameInput.closest('form'), 'rename form');
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(usernameInput, 'collection-admin');
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      renameForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renameUser).toHaveBeenCalledWith(7, { username: 'collection-admin' });
    expect(authState.refreshAccount).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith('backend.admin.usernameUpdated');
  });

  it('refreshes account and dashboard state after resetting local data', async () => {
    const rendered = await renderSettings();
    const resetButton = getButtonByText(rendered, 'settings.reset');

    await act(async () => {
      resetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(resetCollection).toHaveBeenCalledTimes(1);
    expect(authState.refreshAccount).toHaveBeenCalledTimes(1);
    expect(refreshDashboardStats).toHaveBeenCalledTimes(1);
  });
});
