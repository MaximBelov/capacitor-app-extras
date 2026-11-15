import { AppExtras } from 'capacitor-app-extras';

const status = document.getElementById('status');

window.forceClose = async () => {
  status.textContent = 'Closing...';
  try {
    await AppExtras.forceClose();
    // Reached on iOS, where the promise resolves about 0.3 s before the exit. On Android the process is usually gone already.
    status.textContent = 'Resolved, the app should exit now.';
  } catch (error) {
    status.textContent = `Rejected: ${error.code ?? ''} ${error.message}`;
  }
};
