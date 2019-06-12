import { useMemo, useState, useEffect, useRef } from 'react';
import {
    GraphQLTaggedNode,
    getRequest,
    // @ts-ignore
    createOperationDescriptor,
    OperationBase,
    OperationSelector,
} from 'relay-runtime';

import { useEnvironment } from './context';
import { Suspender } from './suspender';

function hasChanged(prev: any[], next: any[]): boolean {
    return prev.some((value, index) => !Object.is(value, next[index]));
}

type Skip = 'lookup' | 'execute' | boolean;

type QueryArgs<T extends OperationBase> =
    | [GraphQLTaggedNode, any[]]
    | [GraphQLTaggedNode, T['variables'], any[]]
    | [GraphQLTaggedNode, T['variables'], Skip, any[]];
type ArgsTuple<T extends OperationBase> = [
    GraphQLTaggedNode,
    T['variables'] | undefined,
    boolean,
    boolean,
    any[]
];

function extractArgs<T extends OperationBase>(
    args: QueryArgs<T>,
): ArgsTuple<T> {
    switch (args.length) {
        case 2:
            const [query2, inputs2] = args;
            return [query2, undefined, false, false, inputs2];
        case 3:
            const [query3, variables3, inputs3] = args;
            return [query3, variables3, false, false, inputs3];
        case 4:
            const [query4, variables4, skip4, inputs4] = args;
            return [
                query4,
                variables4,
                skip4 === true || skip4 === 'lookup',
                skip4 === true || skip4 === 'execute',
                inputs4,
            ];
    }
}

export function useQuery<T extends OperationBase>(
    taggedNode: GraphQLTaggedNode,
    inputs: any[],
): Suspender<T['response']>;
export function useQuery<T extends OperationBase>(
    taggedNode: GraphQLTaggedNode,
    variables: T['variables'],
    inputs: any[],
): Suspender<T['response']>;
export function useQuery<T extends OperationBase>(
    taggedNode: GraphQLTaggedNode,
    variables: T['variables'],
    skip: 'lookup',
    inputs: any[],
): Suspender<T['response']>;
export function useQuery<T extends OperationBase>(
    taggedNode: GraphQLTaggedNode,
    variables: T['variables'],
    skip: 'execute' | boolean,
    inputs: any[],
): Suspender<T['response'] | null>;

export function useQuery<T extends OperationBase>(
    ...args: QueryArgs<T>
): Suspender<T['response'] | null> {
    const [
        taggedNode,
        variables,
        skipLookup,
        skipExecute,
        inputs,
    ] = extractArgs(args);

    const environment = useEnvironment();

    const operation: OperationSelector = useMemo(() => {
        if (skipLookup && skipExecute) {
            return null;
        }
        const query = getRequest(taggedNode);
        if (query.params.operationKind !== 'query') {
            throw new Error('useQuery: Expected query operation');
        }
        return createOperationDescriptor(query, variables);
    }, inputs);

    const [data, setData] = useState<T['response'] | null>(() => {
        if (!skipLookup && environment.check(operation.root)) {
            const snapshot = environment.lookup(operation.fragment);
            return snapshot.data;
        }
        return null;
    });

    const prevInputs = useRef(inputs);
    if (hasChanged(prevInputs.current, inputs)) {
        prevInputs.current = inputs;
        setData(null);
    }

    useEffect(() => {
        if (skipLookup && skipExecute) {
            return;
        }
        if (environment.check(operation.root)) {
            const snapshot = environment.lookup(operation.fragment);
            const disposable = environment.subscribe(snapshot, () => {
                if (environment.check(operation.root)) {
                    const { data } = environment.lookup(operation.fragment);
                    setData(data || null);
                } else {
                    setData(null);
                }
            });
            return () => disposable.dispose();
        }
    });

    if (data !== null) {
        return Suspender.resolve(data);
    }

    if (skipExecute) {
        return Suspender.resolve(null);
    }

    return Suspender.observable(
        environment.execute({ operation }).map(() => {
            const { data = null } = environment.lookup(operation.fragment);
            setData(data);
            return data;
        }),
    );
}
