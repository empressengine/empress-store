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
export declare function computed<T extends object, R>(store: Store<T>, getter: (state: T) => R): ComputedRef<R>;

export declare function computed<T extends object[], R>(stores: [...StoresTuple<T>], getter: (states: StatesTuple<T>) => R): ComputedRef<R>;

export declare interface ComputedRef<T> {
    readonly value: T;
    dispose: () => void;
}

/**
 * Расширенные опции для объединенного хранилища
 * Дополняет базовые опции возможностью указания связей между хранилищами
 *
 * @template T Тип объединенного состояния
 */
export declare interface IMixedStoreOptions<T extends StoreState> extends IStoreOptions<T> {
    links?: Array<IStoreLink<StoreState, T>>;
}

/**
 * Интерфейс для связи между хранилищами
 * Определяет как состояния преобразуются между хранилищами
 *
 * @template T Тип целевого хранилища
 * @template K Тип исходного хранилища
 */
export declare interface IStoreLink<T extends StoreState, K extends StoreState> {
    store: Store<T>;
    mapFrom: (sourceState: K) => Partial<T>;
    mapTo: (targetState: T) => Partial<K>;
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
export declare interface IStoreLinkConfig<T extends StoreState, K extends StoreState> {
    targetStore: Store<T>;
    sourceStore: Store<K>;
    mapFromSource: (state: K) => Partial<T>;
    mapToSource: (state: T) => Partial<K>;
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
export declare interface IStoreOptions<T> {
    middleware?: Middleware<T>[];
    validators?: Validator<T>[];
}

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
export declare interface ITransaction<T> {
    apply: (state: T) => T;
    rollback: (state: T) => T;
}

/**
 * Функция обратного вызова для подписки на изменения в хранилище
 * @param state Текущее состояние после обновления
 */
export declare type Listener<T> = (state: T) => void;

/**
 * Функция middleware для перехвата и преобразования обновлений
 *
 * @example
 * ```typescript
 * const loggerMiddleware: Middleware<GameState> = (state, update, next) => {
 *   console.log('Предыдущее состояние:', state);
 *   console.log('Обновление:', update);
 *   const nextState = next(state, update);
 *   console.log('Следующее состояние:', nextState);
 *   return nextState;
 * };
 * ```
 *
 * @param state Текущее состояние до обновления
 * @param update Частичное обновление состояния
 * @param next Функция для вызова с модифицированным обновлением
 */
export declare type Middleware<T> = (state: T, update: Partial<T>, next: (state: T, update: Partial<T>) => T) => T;

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
export declare function mixStores<const T extends Store<any>[]>(stores: T, options?: MixStoresOptions<StoresUnion<T>>): Store<StoresUnion<T>>;

declare interface MixStoresOptions<T> {
    middleware?: Middleware<T>[];
    validators?: Validator<T>[];
}

declare type StatesTuple<T extends any[]> = {
    [K in keyof T]: T[K];
};

/**
 * Типобезопасная реактивная реализация хранилища с поддержкой middleware и валидации.
 *
 * Возможности:
 * - Типобезопасное управление состоянием
 * - Поддержка middleware для перехвата и преобразования обновлений
 * - Система валидации для предотвращения недопустимых состояний
 * - Оптимизированные пакетные обновления с использованием микрозадач
 * - Поддержка транзакций с возможностью отката
 *
 * @example
 * ```typescript
 * // Создание хранилища с валидаторами и middleware
 * interface GameState {
 *   playerCount: number;
 *   score: number;
 * }
 *
 * const validator = numberRangeValidator<GameState>({
 *   playerCount: { min: 2, max: 10 }
 * });
 *
 * const store = new Store<GameState>(
 *   { playerCount: 2, score: 0 },
 *   { validators: [validator] }
 * );
 *
 * // Подписка на изменения
 * store.subscribe(state => {
 *   console.log('Новое состояние:', state);
 * });
 *
 * // Обновление состояния
 * store.update(state => ({
 *   ...state,
 *   score: state.score + 10
 * }));
 *
 * // Использование транзакций для сложных обновлений
 * store.transaction({
 *   apply: state => ({ ...state, score: state.score + 5 }),
 *   rollback: state => ({ ...state, score: state.score - 5 })
 * });
 * ```
 */
export declare class Store<T extends Object> {
    private _data;
    private static _pendingNotifications;
    private static _isNotifying;
    private static _notificationScheduled;
    private _listeners;
    private _middleware;
    private _validators;
    constructor(_data: T, options?: IStoreOptions<T>);
    /**
     * Добавить новое middleware в хранилище
     * @param middleware Функция middleware для добавления
     * @returns Функция для удаления этого middleware
     */
    addMiddleware(middleware: Middleware<T>): () => void;
    /**
     * Добавить несколько middleware в хранилище
     * @param middleware Массив функций middleware
     * @returns Функция для удаления всех добавленных middleware
     */
    addMiddlewares(middleware: Middleware<T>[]): () => void;
    /**
     * Добавить новый валидатор в хранилище
     * @param validator Функция валидатора для добавления
     * @returns Функция для удаления этого валидатора
     */
    addValidator(validator: Validator<T>): () => void;
    /**
     * Добавить несколько валидаторов в хранилище
     * @param validators Массив функций валидаторов
     * @returns Функция для удаления всех добавленных валидаторов
     */
    addValidators(validators: Validator<T>[]): () => void;
    /**
     * Получить текущий middleware
     */
    get middleware(): Middleware<T>[];
    /**
     * Получить текущее состояние
     */
    protected get rawState(): T;
    /**
     * Получить текущее состояние, используя Proxy для предотвращения прямых мутаций
     */
    get state(): T;
    /**
     * Подписаться на изменения состояния
     * @param listener Функция обратного вызова, вызываемая при изменении состояния
     * @returns Функция отписки
     */
    subscribe(listener: Listener<T>): () => void;
    /**
     * Проверить обновление без его применения
     * @param update Частичное обновление для проверки
     * @throws Error если проверка не пройдена
     */
    validateUpdate(update: Partial<T>): void;
    /**
     * Обновить состояние, используя функцию обратного вызова
     * @param callback Функция, возвращающая частичное обновление
     * @throws Error если проверка не пройдена
     * @example
     * ```typescript
     * store.update(state => ({
     *   score: state.score + 10,
     *   level: state.level + 1
     * }));
     * ```
     */
    update(callback: (current: T) => Partial<T>): void;
    /**
     * Выполнить транзакцию, которая может быть отменена
     * @param transaction Объект транзакции с функциями применения и отката
     */
    transaction(transaction: ITransaction<T>): void;
    /**
     * Вспомогательный метод для простых транзакций с автоматическим откатом
     * @param apply Функция, возвращающая новое состояние
     * @example
     * ```typescript
     * // Атомарное увеличение счета и уровня
     * store.simpleTransaction(state => ({
     *   score: state.score + 10,
     *   level: state.level + 1
     * }));
     * ```
     */
    simpleTransaction(apply: (state: T) => Partial<T>): void;
    /**
     * Сбросить хранилище к начальному состоянию
     * @param initialData Начальные данные для сброса
     */
    reset(initialData?: T): void;
    /**
     * Клонирует текущее состояние хранилища. Использует structuredClone для глубокого копирования.
     *
     * @returns Глубокая копия текущего состояния
     */
    cloneState(): T;
    private notifyListeners;
}

/** Базовый тип для всех состояний хранилища */
export declare type StoreState = Record<string, any>;

declare type StoresTuple<T extends any[]> = {
    [K in keyof T]: Store<T[K]>;
};

declare type StoresUnion<T extends Store<any>[]> = T extends [Store<infer U>] ? U : T extends [Store<infer U>, ...infer Rest extends Store<any>[]] ? U & StoresUnion<Rest> : never;

export declare type Validator<T> = (update: Partial<T>) => ValidatorResult;

/**
 * Определение типа для полей валидатора
 *
 * @example
 * ```typescript
 * const validatorFields: ValidatorFields<GameState> = {
 *   playerCount: {
 *     min: 2,
 *     max: 10,
 *   },
 * };
 * ```
 */
export declare type ValidatorFields<T> = {
    [K in keyof T]?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    } | undefined;
};

/**
 * Функция валидатора для проверки обновлений перед их применением
 *
 * @example
 * ```typescript
 * const playerCountValidator: Validator<GameState> = (update) => {
 *   if (update.playerCount !== undefined) {
 *     if (update.playerCount < 2) return 'Необходимо минимум 2 игрока';
 *     if (update.playerCount > 10) return 'Максимум 10 игроков';
 *   }
 *   return true;
 * };
 * ```
 *
 * @param update Частичное обновление состояния для проверки
 * @returns true если валидно, или строка с сообщением об ошибке, если невалидно
 */
export declare type ValidatorResult = true | string;

export { }
