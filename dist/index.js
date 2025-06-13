const d = class d {
  constructor(e, a = {}) {
    this._data = e, this._listeners = /* @__PURE__ */ new Set(), this._middleware = [], this._validators = [], this.safeDeepClone = (t) => {
      if (t === null || typeof t != "object")
        return t;
      if (Array.isArray(t))
        return t.map((n) => this.safeDeepClone(n));
      const i = {};
      for (const n in t)
        if (Object.prototype.hasOwnProperty.call(t, n))
          try {
            i[n] = this.safeDeepClone(t[n]);
          } catch (l) {
            console.warn(`Failed to clone property ${n}`, l), i[n] = t[n];
          }
      return i;
    }, this._prevData = this.safeDeepClone(this._data), this._middleware = a.middleware || [], this._validators = a.validators || [];
  }
  /**
   * Добавить новое middleware в хранилище
   * @param middleware Функция middleware для добавления
   * @returns Функция для удаления этого middleware
   */
  addMiddleware(e) {
    return this._middleware.push(e), () => {
      const a = this._middleware.indexOf(e);
      a !== -1 && this._middleware.splice(a, 1);
    };
  }
  /**
   * Добавить несколько middleware в хранилище
   * @param middleware Массив функций middleware
   * @returns Функция для удаления всех добавленных middleware
   */
  addMiddlewares(e) {
    const a = e.map((t) => this.addMiddleware(t));
    return () => a.forEach((t) => t());
  }
  /**
   * Добавить новый валидатор в хранилище
   * @param validator Функция валидатора для добавления
   * @returns Функция для удаления этого валидатора
   */
  addValidator(e) {
    return this._validators.push(e), () => {
      const a = this._validators.indexOf(e);
      a !== -1 && this._validators.splice(a, 1);
    };
  }
  /**
   * Добавить несколько валидаторов в хранилище
   * @param validators Массив функций валидаторов
   * @returns Функция для удаления всех добавленных валидаторов
   */
  addValidators(e) {
    const a = e.map((t) => this.addValidator(t));
    return () => a.forEach((t) => t());
  }
  /**
   * Получить текущий middleware
   */
  get middleware() {
    return [...this._middleware];
  }
  /**
   * Получить текущее состояние
   */
  get rawState() {
    return this._data;
  }
  /**
   * Получить текущее состояние, используя Proxy для предотвращения прямых мутаций
   */
  /**
   * Получить предыдущее состояние в виде копии
   */
  get prev() {
    return this.safeDeepClone(this._prevData);
  }
  /**
   * Получить текущее состояние
   */
  get state() {
    return new Proxy(this._data, {
      get: (e, a) => {
        const t = e[a];
        return t instanceof Object ? new Proxy(t, {}) : t;
      },
      set: () => (console.warn("Direct state mutation is not allowed. Use setState instead."), !1)
    });
  }
  /**
   * Подписаться на изменения состояния
   * @param listener Функция обратного вызова, вызываемая при изменении состояния
   * @returns Функция отписки
   */
  subscribe(e) {
    return this._listeners.add(e), () => this._listeners.delete(e);
  }
  /**
   * Проверить обновление без его применения
   * @param update Частичное обновление для проверки
   * @throws Error если проверка не пройдена
   */
  validateUpdate(e) {
    for (const a of this._validators) {
      const t = a(e);
      if (t !== !0)
        throw new Error(typeof t == "string" ? t : "Validation failed");
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
  update(e) {
    const a = e(this.state);
    this.validateUpdate(a);
    const t = (n, l) => ({ ...n, ...l });
    let i = t(this._data, a);
    for (const n of this._middleware)
      i = n(i, a, t);
    this._prevData = this.safeDeepClone(this._data), this._data = i, this.notifyListeners();
  }
  /**
   * Выполнить транзакцию, которая может быть отменена
   * @param transaction Объект транзакции с функциями применения и отката
   */
  transaction(e) {
    const a = this.state;
    try {
      this._prevData = this.safeDeepClone(this._data), this._data = e.apply(this.state), this.notifyListeners();
    } catch (t) {
      throw this._data = e.rollback(a), this.notifyListeners(), t;
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
  simpleTransaction(e) {
    const a = e(this.state), t = {};
    Object.keys(a).forEach((i) => {
      t[i] = this.state[i];
    }), this.transaction({
      apply: (i) => ({ ...i, ...a }),
      rollback: (i) => ({ ...i, ...t })
    });
  }
  /**
   * Сбросить хранилище к начальному состоянию
   * @param initialData Начальные данные для сброса
   */
  reset(e = {}) {
    this._prevData = this.safeDeepClone(this._data), this._data = e, this.notifyListeners();
  }
  /**
   * Клонирует текущее состояние хранилища. Использует safeDeepClone для глубокого копирования.
   * 
   * @returns Глубокая копия текущего состояния
   */
  cloneState() {
    return this.safeDeepClone(this._data);
  }
  /**
   * Клонирует предыдущее состояние хранилища. Использует safeDeepClone для глубокого копирования.
   * 
   * @returns Глубокая копия предыдущего состояния
   */
  clonePrevState() {
    return this.safeDeepClone(this._prevData);
  }
  notifyListeners() {
    if (d._isNotifying) {
      d._pendingNotifications.add(this);
      return;
    }
    d._notificationScheduled || (d._notificationScheduled = !0, queueMicrotask(() => {
      d._isNotifying = !0;
      try {
        d._pendingNotifications.forEach((e) => {
          e._listeners.forEach((a) => a(e._data, e._prevData));
        });
      } finally {
        d._isNotifying = !1, d._notificationScheduled = !1, d._pendingNotifications.clear();
      }
    })), d._pendingNotifications.add(this);
  }
};
d._pendingNotifications = /* @__PURE__ */ new Set(), d._isNotifying = !1, d._notificationScheduled = !1;
let u = d;
const _ = /* @__PURE__ */ new Set();
function w(h, e) {
  let a, t = !1;
  const i = Array.isArray(h) ? h : [h], n = () => {
    const s = i.map((r) => r.state);
    return Array.isArray(h) ? s : s[0];
  }, l = i.map(
    (s) => s.subscribe(() => {
      t || (a = void 0);
    })
  ), o = {
    get value() {
      if (t)
        throw new Error("Cannot access disposed computed value");
      if (_.has(o))
        throw new Error("Circular dependency detected in computed properties");
      if (a === void 0) {
        _.add(o);
        try {
          a = e(n());
        } finally {
          _.delete(o);
        }
      }
      return a;
    },
    dispose() {
      t || (t = !0, l.forEach((s) => s()), a = void 0);
    }
  };
  return typeof window < "u" && window.addEventListener("unload", () => o.dispose()), o;
}
function v(h, e = {}) {
  const a = h.reduce((l, o) => ({
    ...l,
    ...o.state
  }), {});
  class t extends u {
    cleanup() {
      n.forEach((o) => o());
    }
    update(o) {
      const s = o(this.state);
      this.validateUpdate(s), h.forEach((r) => {
        const p = {};
        let f = !1;
        for (const c in s)
          c in r.state && r.state[c] !== s[c] && (p[c] = s[c], f = !0);
        f && r.validateUpdate(p);
      }), super.update((r) => s), h.forEach((r) => {
        const p = {};
        let f = !1;
        for (const c in s)
          c in r.state && r.state[c] !== s[c] && (p[c] = s[c], f = !0);
        if (f) {
          const c = r.update;
          r.update = function(y) {
            u.prototype.update.call(this, y);
          }, r.update(() => p), r.update = c;
        }
      });
    }
  }
  const i = new t(a, {
    middleware: e.middleware || [],
    validators: e.validators || []
  }), n = h.map((l) => {
    const o = l.update;
    return l.update = function(s) {
      const r = this.state, p = s(r);
      this.validateUpdate(p), i.update((f) => p);
    }, () => {
      l.update = o;
    };
  });
  return i;
}
export {
  u as Store,
  w as computed,
  v as mixStores
};
