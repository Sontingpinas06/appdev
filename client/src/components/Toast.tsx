import { useToastStore } from '../store/toast';

export default function Toast() {
    const { message, type, visible, hide } = useToastStore();

    return (
        <div
            id="toast"
            className={`toast ${type} ${visible ? 'show' : ''}`}
            onClick={hide}
            role="status"
            aria-live="polite"
        >
            {message}
        </div>
    );
}
