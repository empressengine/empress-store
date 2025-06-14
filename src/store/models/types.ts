/** Базовый тип для всех состояний хранилища */
export type StoreState = Record<string, any>;

/** 
 * Функция обратного вызова для подписки на изменения в хранилище
 * @param state Текущее состояние после обновления
 * @param prev Предыдущее состояние до обновления
 */
export type Listener<T> = (state: T, prev: T) => void;

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
export type Middleware<T> = (
    state: T,
    update: Partial<T>,
    next: (state: T, update: Partial<T>) => T
) => T;

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
export type ValidatorResult = true | string;

export type Validator<T> = (update: Partial<T>) => ValidatorResult;

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
export type ValidatorFields<T> = {
    [K in keyof T]?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
    } | undefined;
};
