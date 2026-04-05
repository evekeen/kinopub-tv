import './styles/global.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('viewport');
if (!container) {
  throw new Error('Root element #viewport not found');
}

const root = createRoot(container);
root.render(<App />);
