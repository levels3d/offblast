import { useState, useEffect } from 'react';
import { Suspender } from './suspender';

export function useSuspense<T>(value: Suspender<T>): T {
    const state = value['state'];
    switch (state.state) {
        case 0:
            throw state.promise;
        case 1:
            return state.result;
        case 2:
            throw state.error;
    }
}

export function useSuspender<T>(value: Suspender<T>): T | null {
    const state = value['state'];
    switch (state.state) {
        case 0:
            return null;
        case 1:
            return state.result;
        case 2:
            throw state.error;
    }
}

export function useResult<T>(value: Suspender<T>): T | null {
    const inner = useSuspender(value);
    const [, setResult] = useState(inner);
    const state = value['state'];
    useEffect(() => {
        if (state.state === 0) {
            state.promise.then(setResult);
        }
    }, [state.state]);
    return inner;
}
