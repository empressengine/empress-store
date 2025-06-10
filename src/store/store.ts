import { Listener, Middleware, IStoreOptions, ITransaction, Validator } from "./models";

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
export class Store<T extends Object> {
    private static _pendingNotifications = new Set<Store<any>>();
    private static _isNotifying = false;
    private static _notificationScheduled = false;

    private _listeners: Set<Listener<T>> = new Set();
    private _middleware: Middleware<T>[] = [];
    private _validators: Validator<T>[] = [];

    constructor(
        private _data: T,
        options: IStoreOptions<T> = {}
    ) {
        this._middleware = options.middleware || [];
        this._validators = options.validators || [];
    }

    /**
     * Добавить новое middleware в хранилище
     * @param middleware Функция middleware для добавления
     * @returns Функция для удаления этого middleware
     */
    public addMiddleware(middleware: Middleware<T>): () => void {
        this._middleware.push(middleware);
        return () => {
            const index = this._middleware.indexOf(middleware);
            if (index !== -1) {
                this._middleware.splice(index, 1);
            }
        };
    }

    /**
     * Добавить несколько middleware в хранилище
     * @param middleware Массив функций middleware
     * @returns Функция для удаления всех добавленных middleware
     */
    public addMiddlewares(middleware: Middleware<T>[]): () => void {
        const removers = middleware.map(m => this.addMiddleware(m));
        return () => removers.forEach(remove => remove());
    }

    /**
     * Добавить новый валидатор в хранилище
     * @param validator Функция валидатора для добавления
     * @returns Функция для удаления этого валидатора
     */
    public addValidator(validator: Validator<T>): () => void {
        this._validators.push(validator);
        return () => {
            const index = this._validators.indexOf(validator);
            if (index !== -1) {
                this._validators.splice(index, 1);
            }
        };
    }

    /**
     * Добавить несколько валидаторов в хранилище
     * @param validators Массив функций валидаторов
     * @returns Функция для удаления всех добавленных валидаторов
     */
    public addValidators(validators: Validator<T>[]): () => void {
        const removers = validators.map(v => this.addValidator(v));
        return () => removers.forEach(remove => remove());
    }

    /**
     * Получить текущий middleware
     */
    public get middleware(): Middleware<T>[] {
        return [...this._middleware];
    }

    /**
     * Получить текущее состояние
     */
    protected get rawState(): T {
        return this._data;
    }

    /**
     * Получить текущее состояние, используя Proxy для предотвращения прямых мутаций
     */
    public get state(): T {
        return new Proxy(this._data, {
            get: (target, prop) => {
                const value = target[prop as keyof T];
                return value instanceof Object ? new Proxy(value, {}) : value;
            },
            set: () => {
                console.warn('Direct state mutation is not allowed. Use setState instead.');
                return false;
            }
        });
    }

    /**
     * Подписаться на изменения состояния
     * @param listener Функция обратного вызова, вызываемая при изменении состояния
     * @returns Функция отписки
     */
    public subscribe(listener: Listener<T>): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    /**
     * Проверить обновление без его применения
     * @param update Частичное обновление для проверки
     * @throws Error если проверка не пройдена
     */
    public validateUpdate(update: Partial<T>): void {
        for (const validator of this._validators) {
            const result = validator(update);
            if (result !== true) {
                throw new Error(typeof result === 'string' ? result : 'Validation failed');
            }
        }
    }

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
    public update(callback: (current: T) => Partial<T>): void {
        const update = callback(this.state);

        this.validateUpdate(update);
        const applyUpdate = (state: T, update: Partial<T>): T => ({ ...state, ...update });
        let finalState = applyUpdate(this._data, update);

        for (const middleware of this._middleware) {
            finalState = middleware(finalState, update, applyUpdate);
        }

        this._data = finalState;
        this.notifyListeners();
    }

    /**
     * Выполнить транзакцию, которая может быть отменена
     * @param transaction Объект транзакции с функциями применения и отката
     */
    public transaction(transaction: ITransaction<T>): void {
        const previousState = this.state;
        try {
            this._data = transaction.apply(this.state);
            this.notifyListeners();
        } catch (error) {
            this._data = transaction.rollback(previousState);
            this.notifyListeners();
            throw error;
        }
    }

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
    public simpleTransaction(apply: (state: T) => Partial<T>): void {
        const update = apply(this.state);
        const previousValues = {} as Partial<T>;
        
        Object.keys(update).forEach(key => {
            previousValues[key as keyof T] = this.state[key as keyof T];
        });

        this.transaction({
            apply: state => ({ ...state, ...update }),
            rollback: state => ({ ...state, ...previousValues })
        });
    }

    /**
     * Сбросить хранилище к начальному состоянию
     * @param initialData Начальные данные для сброса
     */
    public reset(initialData: T = {} as T): void {
        this._data = initialData;
        this.notifyListeners();
    }

    /**
     * Клонирует текущее состояние хранилища. Использует structuredClone для глубокого копирования.
     * 
     * @returns Глубокая копия текущего состояния
     */
    public cloneState(): T {
        return structuredClone(this._data);
    }

    private notifyListeners(): void {
        if (Store._isNotifying) {
            Store._pendingNotifications.add(this);
            return;
        }

        if (!Store._notificationScheduled) {
            Store._notificationScheduled = true;
            queueMicrotask(() => {
                Store._isNotifying = true;
                try {
                    Store._pendingNotifications.forEach(store => {
                        store._listeners.forEach(listener => listener(store._data));
                    });
                } finally {
                    Store._isNotifying = false;
                    Store._notificationScheduled = false;
                    Store._pendingNotifications.clear();
                }
            });
        }

        Store._pendingNotifications.add(this);
    }
}