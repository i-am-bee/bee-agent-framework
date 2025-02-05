import { Outlet } from 'react-router';
import { AppHeader } from './AppHeader';

export function AppLayout() {
  return (
    <>
      <AppHeader />

      <Outlet />
    </>
  );
}
