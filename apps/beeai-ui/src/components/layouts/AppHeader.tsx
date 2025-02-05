import { IconButton } from '@carbon/react';
import Bee from './Bee.svg';

export function AppHeader() {
  return (
    <header>
      <h1>BeeAI</h1>

      <IconButton kind="ghost" size="sm" label="Main navigation">
        <Bee />
      </IconButton>
    </header>
  );
}
