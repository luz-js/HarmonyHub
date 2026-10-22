import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { enterStageMode, markUpdateReady } from '../pwa-state';
import { PwaBanners } from './PwaBanners';

let online = true;
Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => online });

function goOffline() {
  online = false;
  act(() => void window.dispatchEvent(new Event('offline')));
}
function goOnline() {
  online = true;
  act(() => void window.dispatchEvent(new Event('online')));
}

describe('PwaBanners', () => {
  afterEach(() => {
    online = true;
  });

  it('muestra "Sin conexión" al perder la red y lo quita al volver', () => {
    render(<PwaBanners />);
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
    goOffline();
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión. Ves lo que ya habías abierto en este dispositivo');
    goOnline();
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument();
  });

  it('versión nueva: espera mientras el modo escenario está abierto y recarga solo al tocar el botón', () => {
    const apply = vi.fn();
    const leaveStage = enterStageMode();
    render(<PwaBanners />);
    act(() => markUpdateReady(apply));
    expect(screen.queryByText(/versión nueva/)).not.toBeInTheDocument();

    act(() => leaveStage());
    expect(screen.getByText('Hay una versión nueva de HarmonyHub.')).toBeInTheDocument();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Recargar/ }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
