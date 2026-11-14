import { AppLifecycle } from 'capacitor-plugin-app-lifecycle';

window.testEcho = () => {
    const inputValue = document.getElementById("echoInput").value;
    AppLifecycle.echo({ value: inputValue })
}
