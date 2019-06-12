import { useCallback } from 'react';
import {
    GraphQLTaggedNode,
    RelayMutationConfig as GenericMutationConfig,
    OperationBase,
    UploadableMap,
    SelectorStoreUpdater,
    Disposable,
} from 'relay-runtime';
import { commitMutation, _FragmentRefs } from 'react-relay';

import { useEnvironment } from './context';

type DeepPartial<T> = T extends _FragmentRefs<any>
    ? any
    : (T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T);

export interface MutationConfig<T extends OperationBase> {
    mutation: GraphQLTaggedNode;
    variables: T['variables'];
    configs?: GenericMutationConfig[];
    uploadables?: UploadableMap;
    optimisticUpdater?: SelectorStoreUpdater<T['response']>;
    optimisticResponse?: DeepPartial<T['response']>;
    updater?: SelectorStoreUpdater<T['response']>;
}

type Cancelable<T> = Promise<T> & {
    cancel(): void;
};

function cancelable<T>(
    thunk: (
        resolve: (value: T) => void,
        reject: (error: any) => void,
    ) => Disposable,
): Cancelable<T> {
    let disposable: Disposable | null = null;
    return Object.assign(
        new Promise<T>((resolve, reject) => {
            disposable = thunk(resolve, reject);
        }),
        {
            cancel() {
                if (disposable) {
                    disposable.dispose();
                }
            },
        },
    );
}

export function useMutation<T extends OperationBase, A extends any[]>(
    configCallback: (...args: A) => MutationConfig<T>,
    inputs: any[],
): (...args: A) => Cancelable<T['response']> {
    const environment = useEnvironment();

    return useCallback(
        (...args: A) =>
            cancelable((resolve, reject) =>
                commitMutation(environment, {
                    ...configCallback(...args),
                    onCompleted(response, errors) {
                        if (errors && errors.length > 0) {
                            reject(errors);
                        } else {
                            resolve(response);
                        }
                    },
                    onError(error) {
                        reject(error);
                    },
                }),
            ),
        [environment, ...inputs],
    );
}
