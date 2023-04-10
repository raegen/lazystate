import { useCallback, useMemo, useRef, useState } from 'react';

const createProxy = <T>(value: T, onTrap: (...path: PropertyKey[]) => void): T => {
  switch (typeof value) {
    case 'function':
      return new Proxy(value as Function, {
        apply(target, thisArg, argArray) {
          onTrap();
          return target.apply(thisArg, argArray);
        },
      }) as T;
    case 'object':
      return new Proxy(value as object, {
        get(target, key) {
          return createProxy(target[key as keyof typeof target], onTrap.bind(null, key));
        },
      }) as T;
    default:
      onTrap();
      return value;
  }
};

const isEmpty = (obj: object) => !Object.keys(obj).length;

const lens = <R>(o: R, ...path: PropertyKey[]): R =>
  path.reduce((acc, key) => acc[key as keyof typeof acc] as R, o) as R;

const isEqualFactory =
  <T>(...path: PropertyKey[]) =>
  (prevState: T, nextState: T) =>
    lens(prevState, ...path) === lens(nextState, ...path);

// Atomize state by key. Accessing a state key subscribes to changes of its respective value for the current cycle.
// Observed keys are not persisted between cycles, meaning that if a key is not accessed in the next cycle,
// it will not trigger a rerender. This means they can be accessed/observed conditionally.
// The purpose of this is to avoid unnecessary rerenders when a component is only interested in a subset of state
// or the subset of interest changes between cycles, keeping the rerenders to bare minimum.
// This is what makes this hook "lazy".
export const useLazyState = <T extends object>(initialState: T = {} as T) => {
  const [state, setShallow] = useState<T>(initialState);
  const stateRef = useRef<T & { isEmpty: boolean }>({
    ...initialState,
    isEmpty: true,
  });
  const subStates = useRef<Map<string, (prevState: T, nextState: T) => boolean>>(new Map()).current;

  const proxy = useMemo(
    () =>
      createProxy(stateRef.current, (...path) =>
        subStates.set(path.join('.'), isEqualFactory(...path)),
      ),
    [state],
  );

  const setState = useCallback((nextState: T) => {
    if ([...subStates.values()].some((isEqual) => !isEqual(stateRef.current, nextState))) {
      setShallow(nextState);
    }

    stateRef.current = {
      ...nextState,
      isEmpty: isEmpty(nextState),
    };
  }, []);

  subStates.clear();

  return [proxy, setState] as const;
};
