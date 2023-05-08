export const useLazyState: <S extends object>(initialState: S) => [S, (value: S | ((prevState: S) => S)) => void]
