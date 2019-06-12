import { RelayObservable } from 'relay-runtime';

type SuspenderState<T> =
    | {
          state: 0;
          promise: Promise<T>;
      }
    | {
          state: 1;
          result: T;
      }
    | {
          state: 2;
          error: Error;
      };

type Resolvable<T> = Promise<T> & {
    resolve: (value: T) => void;
    reject: (err: Error) => void;
};

function resolvable<T>(): Resolvable<T> {
    let resolve: (value: T) => void, reject: (err: any) => void;

    return Object.assign(
        new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        }),
        {
            resolve(value: T) {
                resolve(value);
            },
            reject(err: Error) {
                reject(err);
            },
        },
    );
}

export class Suspender<T> {
    private state: SuspenderState<T>;

    private constructor(state: SuspenderState<T>) {
        this.state = state;
        if (this.state.state === 0) {
            this.state.promise.then(
                result => {
                    this.state = {
                        state: 1,
                        result,
                    };
                },
                error => {
                    this.state = {
                        state: 2,
                        error,
                    };
                },
            );
        }
    }

    static await<T>(promise: Promise<T>): Suspender<T> {
        return new Suspender({ state: 0, promise });
    }
    static resolve<T>(result: T): Suspender<T> {
        return new Suspender({ state: 1, result });
    }
    static reject<T>(error: Error): Suspender<T> {
        return new Suspender({ state: 2, error });
    }

    static observable<T>(observable: RelayObservable<T>): Suspender<T> {
        const promise = resolvable<T>();
        const instance = new Suspender({ state: 0, promise });
        observable.subscribe({
            next(value) {
                promise.resolve(value);
            },
            error(error) {
                promise.reject(error);
            },
        });
        return instance;
    }

    map<R>(mapper: (input: T) => R): Suspender<R> {
        switch (this.state.state) {
            case 0:
                return Suspender.await(this.state.promise.then(mapper));
            case 1:
                return Suspender.resolve(mapper(this.state.result));
            case 2:
                return Suspender.reject(this.state.error);
        }
    }
}
