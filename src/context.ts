import { ReactNode, useContext, createElement } from 'react';
import { Environment } from 'relay-runtime';
import { ReactRelayContext } from 'react-relay';

export function useEnvironment() {
    const context = useContext(ReactRelayContext);
    if (!context) {
        throw new Error('Missing Relay Context');
    }
    return context.environment;
}

interface ProviderProps {
    relay: Environment;
    children: ReactNode;
}

export const Provider = ({ relay, children }: ProviderProps) =>
    createElement(ReactRelayContext.Provider, {
        value: { environment: relay, variables: {} },
        children,
    });
