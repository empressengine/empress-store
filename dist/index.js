const n = class n {
  constructor(t, e = {}) {
    this._data = t, this._listeners = /* @__PURE__ */ new Set(), this._middleware = [], this._validators = [], this._middleware = e.middleware || [], this._validators = e.validators || [];
  }
  /**
   * Добавить новое middleware в хранилище
   * @param middleware Функция middleware для добавления
   * @returns Функция для удаления этого middleware
   */
  addMiddleware(t) {
    return this._middleware.push(t), () => {
      const e = this._middleware.indexOf(t);
      e !== -1 && this._middleware.splice(e, 1);
    };
  }
  /**
   * Добавить несколько middleware в хранилище
   * @param middleware Массив функций middleware
   * @returns Функция для удаления всех добавленных middleware
   */
  addMiddlewares(t) {
    const e = t.map((i) => this.addMiddleware(i));
    return () => e.forEach((i) => i());
  }
  /**
   * Добавить новый валидатор в хранилище
   * @param validator Функция валидатора для добавления
   * @returns Функция для удаления этого валидатора
   */
  addValidator(t) {
    return this._validators.push(t), () => {
      const e = this._validators.indexOf(t);
      e !== -1 && this._validators.splice(e, 1);
    };
  }
  /**
   * Добавить несколько валидаторов в хранилище
   * @param validators Массив функций валидаторов
   * @returns Функция для удаления всех добавленных валидаторов
   */
  addValidators(t) {
    const e = t.map((i) => this.addValidator(i));
    return () => e.forEach((i) => i());
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
  get state() {
    return new Proxy(this._data, {
      get: (t, e) => {
        const i = t[e];
        return i instanceof Object ? new Proxy(i, {}) : i;
      },
      set: () => (console.warn("Direct state mutation is not allowed. Use setState instead."), !1)
    });
  }
  /**
   * Подписаться на изменения состояния
   * @param listener Функция обратного вызова, вызываемая при изменении состояния
   * @returns Функция отписки
   */
  subscribe(t) {
    return this._listeners.add(t), () => this._listeners.delete(t);
  }
  /**
   * Проверить обновление без его применения
   * @param update Частичное обновление для проверки
   * @throws Error если проверка не пройдена
   */
  validateUpdate(t) {
    for (const e of this._validators) {
      const i = e(t);
      if (i !== !0)
        throw new Error(typeof i == "string" ? i : "Validation failed");
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
  update(t) {
    const e = t(this.state);
    this.validateUpdate(e);
    const i = (h, c) => ({ ...h, ...c });
    let s = i(this._data, e);
    for (const h of this._middleware)
      s = h(s, e, i);
    this._data = s, this.notifyListeners();
  }
  /**
   * Выполнить транзакцию, которая может быть отменена
   * @param transaction Объект транзакции с функциями применения и отката
   */
  transaction(t) {
    const e = this.state;
    try {
      this._data = t.apply(this.state), this.notifyListeners();
    } catch (i) {
      throw this._data = t.rollback(e), this.notifyListeners(), i;
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
  simpleTransaction(t) {
    const e = t(this.state), i = {};
    Object.keys(e).forEach((s) => {
      i[s] = this.state[s];
    }), this.transaction({
      apply: (s) => ({ ...s, ...e }),
      rollback: (s) => ({ ...s, ...i })
    });
  }
  /**
   * Сбросить хранилище к начальному состоянию
   * @param initialData Начальные данные для сброса
   */
  reset(t = {}) {
    this._data = t, this.notifyListeners();
  }
  /**
   * Клонирует текущее состояние хранилища. Использует structuredClone для глубокого копирования.
   * 
   * @returns Глубокая копия текущего состояния
   */
  cloneState() {
    return structuredClone(this._data);
  }
  notifyListeners() {
    if (n._isNotifying) {
      n._pendingNotifications.add(this);
      return;
    }
    n._notificationScheduled || (n._notificationScheduled = !0, queueMicrotask(() => {
      n._isNotifying = !0;
      try {
        n._pendingNotifications.forEach((t) => {
          t._listeners.forEach((e) => e(t._data));
        });
      } finally {
        n._isNotifying = !1, n._notificationScheduled = !1, n._pendingNotifications.clear();
      }
    })), n._pendingNotifications.add(this);
  }
};
n._pendingNotifications = /* @__PURE__ */ new Set(), n._isNotifying = !1, n._notificationScheduled = !1;
let p = n;
const w = /* @__PURE__ */ new Set();
function _(l, t) {
  let e, i = !1;
  const s = Array.isArray(l) ? l : [l], h = () => {
    const a = s.map((d) => d.state);
    return Array.isArray(l) ? a : a[0];
  }, c = s.map(
    (a) => a.subscribe(() => {
      i || (e = void 0);
    })
  ), r = {
    get value() {
      if (i)
        throw new Error("Cannot access disposed computed value");
      if (w.has(r))
        throw new Error("Circular dependency detected in computed properties");
      if (e === void 0) {
        w.add(r);
        try {
          e = t(h());
        } finally {
          w.delete(r);
        }
      }
      return e;
    },
    dispose() {
      i || (i = !0, c.forEach((a) => a()), e = void 0);
    }
  };
  return typeof window < "u" && window.addEventListener("unload", () => r.dispose()), r;
}
function m(l, t = {}) {
  const e = l.reduce((c, r) => ({
    ...c,
    ...r.state
  }), {});
  class i extends p {
    cleanup() {
      h.forEach((r) => r());
    }
    update(r) {
      const a = r(this.state);
      this.validateUpdate(a), l.forEach((d) => {
        const u = {};
        let f = !1;
        for (const o in a)
          o in d.state && d.state[o] !== a[o] && (u[o] = a[o], f = !0);
        f && d.validateUpdate(u);
      }), super.update((d) => a), l.forEach((d) => {
        const u = {};
        let f = !1;
        for (const o in a)
          o in d.state && d.state[o] !== a[o] && (u[o] = a[o], f = !0);
        if (f) {
          const o = d.update;
          d.update = function(y) {
            p.prototype.update.call(this, y);
          }, d.update(() => u), d.update = o;
        }
      });
    }
  }
  const s = new i(e, {
    middleware: t.middleware || [],
    validators: t.validators || []
  }), h = l.map((c) => {
    const r = c.update;
    return c.update = function(a) {
      const d = this.state, u = a(d);
      this.validateUpdate(u), s.update((f) => u);
    }, () => {
      c.update = r;
    };
  });
  return s;
}
export {
  p as Store,
  _ as computed,
  m as mixStores
};
