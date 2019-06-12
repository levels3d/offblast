import { useEffect } from 'react';
import {
    GraphQLTaggedNode,
    RelayMutationConfig as GenericMutationConfig,
    OperationBase,
    RecordSourceSelectorProxy,
} from 'relay-runtime';
import { requestSubscription } from 'react-relay';
import { useEnvironment } from './context';
interface SubscriptionConfig<T extends OperationBase> {
    subscription: GraphQLTaggedNode;
    variables: T['variables'];
    configs?: GenericMutationConfig[];
    updater?(store: RecordSourceSelectorProxy): void;
    onError?(error: Error): void;
    onNext?(response: T['response']): void;
    onCompleted?(): void;
}
export function useSubscription<T extends OperationBase>(
    config: SubscriptionConfig<T>,
    inputs: any[],
) {
    const environment = useEnvironment();
    useEffect(() => {
        const disposable = requestSubscription(environment, config);
        return () => disposable.dispose();
    }, [environment, ...inputs]);
}
