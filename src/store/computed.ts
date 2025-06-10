import { Store } from './store';

const computedStack = new Set<ComputedRef<any>>();

export interface ComputedRef<T> {
    readonly value: T;
    dispose: () => void;
}

type StoresTuple<T extends any[]> = { [K in keyof T]: Store<T[K]> };

type StatesTuple<T extends any[]> = { [K in keyof T]: T[K] };

/**
 * Создает вычисляемое свойство, которое автоматически обновляется при изменении его зависимостей.
 * Поддерживает как одиночное хранилище, так и несколько хранилищ в качестве зависимостей.
 * 
 * Возможности:
 * - Ленивые вычисления (вычисляется только при обращении)
 * - Кэширование (пересчитывается только при изменении зависимостей)
 * - Обнаружение циклических зависимостей
 * - Автоматическая очистка при выгрузке страницы
 * - Типобезопасность
 * 
 * @example
 * ```typescript
 * // Вычисляемое свойство с одним хранилищем
 * const store = new Store<GameState>({ score: 0, multiplier: 1 });
 * 
 * const totalScore = computed(
 *   store,
 *   state => state.score * state.multiplier
 * );
 * 
 * console.log(totalScore.value); // Доступ к вычисленному значению
 * 
 * // Вычисляемое свойство с несколькими хранилищами
 * const store1 = new Store<{count: number}>({ count: 1 });
 * const store2 = new Store<{multiplier: number}>({ multiplier: 2 });
 * 
 * const result = computed(
 *   [store1, store2],
 *   ([s1, s2]) => s1.count * s2.multiplier
 * );
 * 
 * // Очистка, когда свойство больше не нужно
 * result.dispose();
 * ```
 *
 * @param store - Одно хранилище или массив хранилищ, от которых зависит свойство
 * @param getter - Функция, которая вычисляет значение на основе состояния хранилищ(а)
 * @returns Объект ComputedRef со свойством .value и методом dispose
 */
export function computed<T extends object, R>(
    store: Store<T>,
    getter: (state: T) => R
): ComputedRef<R>;

export function computed<T extends object[], R>(
    stores: [...StoresTuple<T>],
    getter: (states: StatesTuple<T>) => R
): ComputedRef<R>;

export function computed<T extends object | object[], R>(
    storeOrStores: Store<any> | Store<any>[],
    getter: (stateOrStates: any) => R
): ComputedRef<R> {
    let cache: R | undefined;
    let disposed = false;
    const stores = Array.isArray(storeOrStores) ? storeOrStores : [storeOrStores];

    const getStates = () => {
        const states = stores.map(store => store.state);
        return Array.isArray(storeOrStores) ? states : states[0];
    };

    const unsubscribes = stores.map(store =>
        store.subscribe(() => {
            if (!disposed) {
                cache = undefined;
            }
        })
    );

    const ref: ComputedRef<R> = {
        get value() {
            if (disposed) {
                throw new Error('Cannot access disposed computed value');
            }

            if (computedStack.has(ref)) {
                throw new Error('Circular dependency detected in computed properties');
            }

            if (cache === undefined) {
                computedStack.add(ref);
                try {
                    cache = getter(getStates());
                } finally {
                    computedStack.delete(ref);
                }
            }

            return cache;
        },
        dispose() {
            if (!disposed) {
                disposed = true;
                unsubscribes.forEach(unsubscribe => unsubscribe());
                cache = undefined;
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('unload', () => ref.dispose());
    }

    return ref;
}
