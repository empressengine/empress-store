import { Store } from "../store";
import { StoreState, Middleware, Validator } from "./types";

/**
 * Интерфейс транзакции для атомарных операций с возможностью отката
 * 
 * @example
 * ```typescript
 * const transaction: ITransaction<GameState> = {
 *   apply: (state) => ({ ...state, score: state.score + 10 }),
 *   rollback: (state) => ({ ...state, score: state.score - 10 })
 * };
 * ```
 * 
 * @template T Тип состояния
 */
export interface ITransaction<T> {
    apply: (state: T) => T;
    rollback: (state: T) => T;
}

/**
 * Опции при создании хранилища
 * 
 * @example
 * ```typescript
 * const options: IStoreOptions<GameState> = {
 *   middleware: [loggerMiddleware],
 *   validators: [playerCountValidator]
 * };
 * ```
 * 
 * @template T Тип состояния хранилища
 */
export interface IStoreOptions<T> {
    middleware?: Middleware<T>[];
    validators?: Validator<T>[];
}

/**
 * Интерфейс для связи между хранилищами
 * Определяет как состояния преобразуются между хранилищами
 * 
 * @template T Тип целевого хранилища
 * @template K Тип исходного хранилища
 */
export interface IStoreLink<T extends StoreState, K extends StoreState> {
    store: Store<T>;
    mapFrom: (sourceState: K) => Partial<T>;
    mapTo: (targetState: T) => Partial<K>;
}

/**
 * Расширенные опции для объединенного хранилища
 * Дополняет базовые опции возможностью указания связей между хранилищами
 * 
 * @template T Тип объединенного состояния
 */
export interface IMixedStoreOptions<T extends StoreState> extends IStoreOptions<T> {
    links?: Array<IStoreLink<StoreState, T>>;
}

/**
 * Конфигурация связи между двумя хранилищами
 * Определяет как данные передаются между хранилищами
 * 
 * @example
 * ```typescript
 * const config: IStoreLinkConfig<UIState, GameState> = {
 *   targetStore: uiStore,
 *   sourceStore: gameStore,
 *   mapFromSource: (gameState) => ({
 *     isLoading: gameState.isProcessing,
 *     errorMessage: gameState.error
 *   }),
 *   mapToSource: (uiState) => ({
 *     isProcessing: uiState.isLoading
 *   })
 * };
 * ```
 * 
 * @template T Тип целевого хранилища
 * @template K Тип исходного хранилища
 */
export interface IStoreLinkConfig<T extends StoreState, K extends StoreState> {
    targetStore: Store<T>;
    sourceStore: Store<K>;
    mapFromSource: (state: K) => Partial<T>;
    mapToSource: (state: T) => Partial<K>;
}