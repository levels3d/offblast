# Offblast

Offblast is a helper library for [Relay](https://github.com/facebook/relay/)
that provides [React](https://github.com/facebook/react/) hooks to send GraphQL
queries, mutations and subscriptions from functional components.

## Context

Offblast uses the `ReactRelayContext` from `react-relay` to access the current
Relay environment. Depending on how you use this library along with
`react-relay`, you may need to add a `<Provider />` component higher in the
React tree to use the hooks.

## Suspender

`Suspender<T>` is a utility class provided by this library that acts as a
wrapper for a `Promise<T>`, with the ability to query its result synchronously
once it has resolved (or its error if it has rejected).

This is useful as a common pattern with GraphQL and Relay is to merge all the
data needed by a page in a single query, but you don't necessarily want to show
a single loading indicator for the whole page but only in the places where data
is missing. The `Suspender<T>` class exposes a `map` method with the signature
`map<U>(func: (value: T) => U): Suspender<U>` to help you narrow a query result
to a specific bit of data while passing the Suspender object down the props of
the components to the point where the data is actually needed, which is where a
loading indicator should be displayed.

## Hooks

### `useQuery`

The `useQuery` hook has the following signature:

```typescript
function useQuery<T extends OperationBase>(
  query: GraphQLTaggedNode,
  variables?: T["variables"],
  skip?: "execute" | "lookup" | boolean,
  inputs: any[]
): Suspender<T["response"]>;
```

This hook executes the GraphQL query specified in `query` with the variables
optionally specified in `variables`, and returns a `Suspender` that will
eventually resolve to the result of said query.

`useQuery` will also subscribe to updates of the Relay cache, so your components
will automatically re-render when the data previously returned by the hook has
changed.

Please note that the hook does **NOT** check if your variables or your query has
changed since the last render: instead, is uses the same pattern as native hooks
such as `useEffect` or `useMemo` and exposes an `input: any[]` parameter that is
used to detect whether the query should be executed again.

Finally, the hooks has a `skip` for advanced use cases where you want to
partially or completely skip the query execution. Since the Rule of Hooks
forbids hooks in `if` branches, setting this argument to `true` will skip the
execution of the query and return a `Suspender<null>` that resolves immediately.
Alternatively, you can set the `skip` parameter to `'lookup'` to skip the Relay
cache lookup and force the query to be sent to the server, or `'execute'` to
skip the execution of the query and only query the Relay cache, possibly
returning incomplete data.

### `useMutation`

The `useMutation` hook has the following signature:

```typescript
function useMutation<T extends OperationBase, A extends any[]>(
  config: (...args: A) => MutationConfig<T>,
  inputs: any[]
): (...args: A) => Cancelable<T["response"]>;
```

It is essentially a wrapper for `useCallback`, and returns a function that will
in turn call `commitMutation` with the configuration you provided. Just like
`useMemo` it takes 2 parameters: `config` is a function that returns a
`MutationConfig` object, and `inputs` is an arbitrary array that drives the
memoization of the returned function. The `Cancelable<T>` returned by the
callback function is a `Promise<T>` with an additional `cancel(): void` method
that will dispose of the internal operation.

### `useSubscription`

The `useSubscription` hook has the following signature:

```typescript
function useSubscription<T extends OperationBase>(
  config: SubscriptionConfig<T>,
  inputs: any[]
): void;
```

The `config` object describes the subscription to be created, and the `inputs`
array is used to determine whether to configuration has changed and the
subscription should be recreated. Note that this hook does not return anything:
it is expected that your configuration will use an `updater` function to mutate
the Relay store in response to subscription updates which will automatically
trigger a re-render of any query that uses the modified values.

### `useEnvironment`

The `useEnvironment` hook has the following signature:

```typescript
function useEnvironment(): Environment;
```

It simply returns the current Relay environment, or throw an error if there is
none (usually this is because you need to have a `<Provider />` component higher
in the React tree).

### `useResult`

The `useResult` hook has the following signature:

```typescript
function useResult<T>(value: Suspender<T>): T | null;
```

This hook unwraps a `Suspender` object. If it has already resolved, the result
is returned and can be used immediately. If it has rejected, the error is thrown
and can be caught using the `componentDidCatch` lifecycle method. Finally, if it
hasn't resolved yet, the hooks will return `null` and subscribe to it in order
to trigger a re-render when it will eventually resolve.

### `useSuspender`

The `useSuspender` hook has the following signature:

```typescript
function useSuspender<T>(value: Suspender<T>): T | null;
```

This hook unwraps a `Suspender` object. If it has already resolved, the result
is returned and can be used immediately. If it has rejected, the error is thrown
and can be caught using the `componentDidCatch` lifecycle method. Finally, if it
hasn't resolved yet, the hooks will return `null`. Note that unlike `useResult`,
this hooks does **NOT** subscribe to the `Suspender` and will **NOT** trigger a
re-render if it resolves after having previously returned `null`.

### `useSuspense`

The `useSuspense` hook has the following signature:

```typescript
function useSuspense<T>(value: Suspender<T>): T;
```

This hook unwraps a `Suspender` object. If it has already resolved, the result
is returned and can be used immediately. If it has rejected, the error is thrown
and can be caught using the `componentDidCatch` lifecycle method. Finally, if it
hasn't resolved yet, the `Suspender`'s internal `Promise` will be thrown which
will cause the current React tree (up to the nearest `<React.Suspense />`
component) to become suspended.

Please note that React Suspense is **NOT STABLE** yet, please use this hook at
your own risk.
