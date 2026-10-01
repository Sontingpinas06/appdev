/// <reference types="vite/client" />

declare module 'virtual:register-sw' {
    export function registerSW(): Promise<ServiceWorkerRegistration>;
}

declare module '@fortawesome/fontawesome-free/css/all.min.css' {
    const content: string;
    export default content;
}