import { Dispatch, SetStateAction } from 'react';

export const useLazyState: <S extends object>(initialState: S) => [S, Dispatch<SetStateAction<S>>]
