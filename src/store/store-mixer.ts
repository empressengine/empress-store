import { Store } from './store';
import { Middleware, Validator } from './models';

type StoresUnion<T extends Store<any>[]> = T extends [Store<infer U>]
    ? U
    : T extends [Store<infer U>, ...infer Rest extends Store<any>[]]
    ? U & StoresUnion<Rest>
    : never;

interface MixStoresOptions<T> {
    middleware?: Middleware<T>[];
    validators?: Validator<T>[];
}

/**
 * Создает новое хранилище, объединяющее несколько хранилищ в одно
 * Изменения в объединенном хранилище будут пропагироваться в оригинальные хранилища и наоборот
 */
/**
 * Объединяет несколько хранилищ в одно с синхронизированным состоянием.
 * 
 * Возможности:
 * - Двунаправленная синхронизация состояния
 * - Оптимизированные обновления (только измененные поля)
 * - Сохранение middleware и валидаторов
 * - Типобезопасное объединение состояний
 * - Предотвращение циклов обновления
 * 
 * Объединенное хранилище содержит все поля из всех исходных хранилищ.
 * Обновления можно делать как через объединенное хранилище, так и через оригинальные.
 * Только фактически измененные поля вызывают обновления и middleware.
 * 
 * @example
 * ```typescript
 * // Создание оригинальных хранилищ
 * const gameStore = new Store<GameState>({
 *   playerCount: 2,
 *   score: 0
 * }, {
 *   validators: [playerCountValidator]
 * });
 * 
 * const uiStore = new Store<UiState>({
 *   isMenuOpen: false,
 *   selectedTab: 'game'
 * });
 * 
 * // Создание объединенного хранилища
 * const mixedStore = mixStores(
 *   [gameStore, uiStore],
 *   { middleware: [loggerMiddleware] }
 * );
 * 
 * // Обновление через объединенное хранилище
 * mixedStore.update(state => ({
 *   ...state,
 *   score: state.score + 10,
 *   isMenuOpen: true
 * }));
 * 
 * // Или обновление через оригинальное хранилище
 * gameStore.update(state => ({
 *   ...state,
 *   playerCount: 4
 * }));
 * ```
 * 
 * @param stores - Массив хранилищ для объединения
 * @param options - Опциональные middleware и валидаторы для объединенного хранилища
 * @returns Новое хранилище, содержащее все поля из входных хранилищ
 */
export function mixStores<const T extends Store<any>[]>(
    stores: T,
    options: MixStoresOptions<StoresUnion<T>> = {}
): Store<StoresUnion<T>> {
    const initialState = stores.reduce((acc, store) => ({
        ...acc,
        ...store.state
    }), {}) as StoresUnion<T>;

    interface ExtendedStore<T extends object> extends Store<T> {
        cleanup: () => void;
    }

    class MixedStore extends Store<StoresUnion<T>> implements ExtendedStore<StoresUnion<T>> {
        cleanup(): void {
            unsubscribes.forEach(unsub => unsub());
        }

        update(callback: (current: StoresUnion<T>) => Partial<StoresUnion<T>>): void {
            const update = callback(this.state);
            this.validateUpdate(update);

            stores.forEach(store => {
                const storeUpdate = {} as any;
                let hasUpdate = false;

                for (const key in update) {
                    if (key in store.state && store.state[key] !== update[key]) {
                        storeUpdate[key] = update[key];
                        hasUpdate = true;
                    }
                }

                if (hasUpdate) {
                    store.validateUpdate(storeUpdate);
                }
            });

            super.update(current => update);

            stores.forEach(store => {
                const storeUpdate = {} as any;
                let hasUpdate = false;

                for (const key in update) {
                    if (key in store.state && store.state[key] !== update[key]) {
                        storeUpdate[key] = update[key];
                        hasUpdate = true;
                    }
                }

                if (hasUpdate) {
                    const originalUpdate = store.update;
                    store.update = function(this: Store<any>, cb: any) {
                        Store.prototype.update.call(this, cb);
                    };
                    store.update(() => storeUpdate);
                    store.update = originalUpdate;
                }
            });
        }
    }

    const mixedStore = new MixedStore(initialState, {
        middleware: options.middleware || [],
        validators: options.validators || []
    });

    const unsubscribes = stores.map(store => {
        const originalUpdate = store.update;
        store.update = function(this: Store<any>, callback: any) {
            const state = this.state;
            const update = callback(state);

            this.validateUpdate(update);
            mixedStore.update(current => update);
        };

        return () => {
            store.update = originalUpdate;
        };
    });

    return mixedStore;
}
