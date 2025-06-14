![Empress Logo](https://empressengine.github.io/empress-documentation/assets/images/empress_logo_big_store-6569934567c12e323e193e1c043b4340.png)

# Empress Store

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)]()

Empress Store - это типобезопасная библиотека управления состоянием для Empress приложений с поддержкой реактивности, валидации и оптимизированных обновлений.

## Содержание

- [Установка](#установка)
- [Основные концепции](#основные-концепции)
  - [Store](#store)
  - [Middleware](#middleware)
  - [Validators](#validators)
- [Оптимизация](#оптимизация)
  - [Пакетные обновления](#пакетные-обновления)
  - [Ленивые вычисления](#ленивые-вычисления)
  - [Умные подписки](#умные-подписки)
- [Computed свойства](#computed-свойства)
  - [Базовое использование](#базовое-использование)
  - [Множественные зависимости](#множественные-зависимости)
  - [Обработка циклических зависимостей](#обработка-циклических-зависимостей)
- [Store Mixer](#store-mixer)
  - [Объединение хранилищ](#объединение-хранилищ)
  - [Двунаправленная синхронизация](#двунаправленная-синхронизация)
  - [Оптимизация обновлений](#оптимизация-обновлений)
- [Примеры использования](#примеры-использования)
  - [Базовый пример](#базовый-пример)
  - [Валидация данных](#валидация-данных)
  - [Сложные вычисления](#сложные-вычисления)

## Установка

```bash
npm install empress-store
```

## Основные концепции

### Store

Store - это основной класс для управления состоянием. Он предоставляет типобезопасный и реактивный способ хранения и обновления данных.

```typescript
interface GameState {
  score: number;
  level: number;
}

const store = new Store<GameState>({
  score: 0,
  level: 1
});

// Подписка на изменения
store.subscribe((state, prev) => {
  console.log('Предыдущее состояние:', prev);
  console.log('Новое состояние:', state);
});

// Обновление состояния
store.update(state => ({
  ...state,
  score: state.score + 10
}));
```

### Middleware

Middleware позволяет перехватывать и трансформировать обновления состояния:

```typescript
const loggerMiddleware: Middleware<GameState> = (state, update, next) => {
  console.log('До обновления:', state);
  const nextState = next(state, update);
  console.log('После обновления:', nextState);
  return nextState;
};

store.addMiddleware(loggerMiddleware);
```

### Validators

Валидаторы предотвращают недопустимые обновления состояния:

```typescript
const scoreValidator: Validator<GameState> = (update) => {
  if (update.score !== undefined && update.score < 0) {
    return 'Счет не может быть отрицательным';
  }
  return true;
};

store.addValidator(scoreValidator);
```

## Оптимизация

### Пакетные обновления

Empress Store автоматически группирует множественные обновления в одно с помощью микрозадач:

```typescript
// Эти обновления будут сгруппированы
store.update(s => ({ ...s, score: s.score + 1 }));
store.update(s => ({ ...s, level: s.level + 1 }));

// Подписчики получат только одно уведомление
```

### Ленивые вычисления

Вычисляемые свойства пересчитываются только при обращении к ним:

```typescript
const totalScore = computed(store, state => {
  // Сложные вычисления здесь
  return state.score * state.level;
});

// Вычисления происходят только при обращении к .value
console.log(totalScore.value);
```

### Умные подписки

Подписчики уведомляются только при фактическом изменении данных:

```typescript
store.update(s => ({ ...s, score: s.score })); // Не вызовет подписчиков
```

## Computed свойства

### Базовое использование

```typescript
const store = new Store({ count: 0, multiplier: 2 });

const total = computed(store, state => {
  return state.count * state.multiplier;
});

console.log(total.value); // Доступ к значению
total.dispose(); // Очистка подписок
```

### Множественные зависимости

```typescript
const store1 = new Store({ value: 1 });
const store2 = new Store({ multiplier: 2 });

const result = computed(
  [store1, store2],
  ([s1, s2]) => s1.value * s2.multiplier
);
```

### Обработка циклических зависимостей

Empress Store автоматически обнаруживает и предотвращает циклические зависимости:

```typescript
const a = computed(store, s => b.value); // Ошибка: циклическая зависимость
const b = computed(store, s => a.value);
```

## Store Mixer

### Объединение хранилищ

```typescript
const gameStore = new Store<GameState>({ score: 0 });
const uiStore = new Store<UiState>({ isMenuOpen: false });

const mixedStore = mixStores([gameStore, uiStore]);
```

### Двунаправленная синхронизация

Изменения синхронизируются в обоих направлениях:

```typescript
// Обновление через смешанное хранилище
mixedStore.update(s => ({ ...s, score: 100 }));
console.log(gameStore.state.score); // 100

// Обновление через оригинальное хранилище
gameStore.update(s => ({ ...s, score: 200 }));
console.log(mixedStore.state.score); // 200
```

### Оптимизация обновлений

Store Mixer обновляет только измененные поля и только в соответствующих хранилищах:

```typescript
mixedStore.update(s => ({
  ...s,
  score: s.score + 10,    // Обновится только в gameStore
  isMenuOpen: true       // Обновится только в uiStore
}));
```

## Примеры использования

### Базовый пример

```typescript
// Создание хранилища
interface UserState {
  name: string;
  age: number;
}

const userStore = new Store<UserState>({
  name: '',
  age: 0
});

// Подписка на изменения
userStore.subscribe(state => {
  console.log('Пользователь обновлен:', state);
});

// Обновление данных
userStore.update(state => ({
  ...state,
  name: 'Иван',
  age: 25
}));
```

### Валидация данных

```typescript
// Создание валидатора
const ageValidator: Validator<UserState> = (update) => {
  if (update.age !== undefined) {
    if (update.age < 0) return 'Возраст не может быть отрицательным';
    if (update.age > 150) return 'Некорректный возраст';
  }
  return true;
};

// Добавление валидатора
userStore.addValidator(ageValidator);

// Попытка обновления с невалидными данными
try {
  userStore.update(s => ({ ...s, age: -1 }));
} catch (error) {
  console.error(error); // "Возраст не может быть отрицательным"
}
```

### Сложные вычисления

```typescript
interface StatsState {
  visits: number[];
  purchases: number[];
}

const statsStore = new Store<StatsState>({
  visits: [],
  purchases: []
});

// Вычисление конверсии
const conversion = computed(statsStore, state => {
  if (state.visits.length === 0) return 0;
  const totalVisits = state.visits.reduce((a, b) => a + b, 0);
  const totalPurchases = state.purchases.reduce((a, b) => a + b, 0);
  return (totalPurchases / totalVisits) * 100;
});

// Использование
console.log(`Конверсия: ${conversion.value}%`);
```

## Лицензия

Empress Store распространяется под лицензией MIT.

```text
MIT License

Copyright (c) 2025 Empress Store Game Framework

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```