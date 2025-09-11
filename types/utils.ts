/**
 * Utility Types for Enhanced Type Safety
 * Common utility types used throughout the application
 */

/**
 * Make all properties required
 */
export type Complete<T> = {
  [P in keyof Required<T>]: Pick<T, P> extends Required<Pick<T, P>> ? T[P] : (T[P] | undefined)
}

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Make specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Extract function parameters
 */
export type Parameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never

/**
 * Extract function return type
 */
export type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : any

/**
 * Extract promise resolved type
 */
export type Awaited<T> = T extends PromiseLike<infer U> ? U : T

/**
 * Create a union type from object values
 */
export type ValueOf<T> = T[keyof T]

/**
 * Create a union type from array elements
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * Flatten nested object types
 */
export type Flatten<T> = T extends object ? { [K in keyof T]: Flatten<T[K]> } : T

/**
 * Non-nullable type
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * Strict record type
 */
export type StrictRecord<K extends string | number | symbol, V> = Record<K, V>

/**
 * Exact type - prevents excess properties
 */
export type Exact<T, U extends T = T> = U & Record<Exclude<keyof U, keyof T>, never>

/**
 * Pretty print type for better IntelliSense
 */
export type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

/**
 * Conditional types
 */
export type If<C extends boolean, T, F> = C extends true ? T : F

/**
 * String manipulation types
 */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S
export type Uncapitalize<S extends string> = S extends `${infer F}${infer R}` ? `${Lowercase<F>}${R}` : S

/**
 * Object key types
 */
export type StringKeys<T> = Extract<keyof T, string>
export type NumberKeys<T> = Extract<keyof T, number>
export type SymbolKeys<T> = Extract<keyof T, symbol>

/**
 * Filter object by value type
 */
export type PickByValue<T, V> = Pick<T, { [K in keyof T]: T[K] extends V ? K : never }[keyof T]>
export type OmitByValue<T, V> = Pick<T, { [K in keyof T]: T[K] extends V ? never : K }[keyof T]>

/**
 * Function overload types
 */
export type Overload<T> = T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
  (...args: infer A3): infer R3
  (...args: infer A4): infer R4
} ? [(...args: A1) => R1, (...args: A2) => R2, (...args: A3) => R3, (...args: A4) => R4]
  : T extends {
    (...args: infer A1): infer R1
    (...args: infer A2): infer R2
    (...args: infer A3): infer R3
  } ? [(...args: A1) => R1, (...args: A2) => R2, (...args: A3) => R3]
  : T extends {
    (...args: infer A1): infer R1
    (...args: infer A2): infer R2
  } ? [(...args: A1) => R1, (...args: A2) => R2]
  : T extends (...args: infer A) => infer R ? [(...args: A) => R]
  : never

/**
 * Tuple types
 */
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer R] ? R : []
export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never
export type Length<T extends readonly unknown[]> = T['length']

/**
 * Union manipulation
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
export type LastOfUnion<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R : never

/**
 * Class types
 */
export type Constructor<T = {}> = new (...args: any[]) => T
export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T

/**
 * Event handler types
 */
export type EventHandler<T = Event> = (event: T) => void
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>

/**
 * API related types
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 500

/**
 * Component prop types
 */
// export type ComponentProps<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> = 
//   T extends React.JSXElementConstructor<infer P> ? P : 
//   T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] : {}
// 
// /**
//  * Ref types
//  */
// export type ElementRef<T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>> = 
//   T extends keyof JSX.IntrinsicElements ? JSX.IntrinsicElements[T] extends React.DetailedHTMLProps<any, infer E> ? E : never :
//   T extends React.JSXElementConstructor<any> ? React.ComponentRef<T> : never

export type ComponentProps<T> = any;
export type ElementRef<T> = any;

/**
 * Style types
 */
export type CSSProperties = React.CSSProperties
export type ClassName = string | undefined | null | false
export type StyleProp = CSSProperties | undefined

/**
 * Form types
 */
export type FormValue = string | number | boolean | Date | null | undefined
export type FormData = Record<string, FormValue>
export type FormErrors = Record<string, string | undefined>

/**
 * Database types
 */
export type ID = string | number
export type Timestamp = Date | string
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray
export type JSONObject = { [key: string]: JSONValue }
export type JSONArray = JSONValue[]

/**
 * State management types
 */
export type StateSlice<T> = (set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => void, get: () => T) => T
export type AsyncState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

/**
 * Validation types
 */
export type ValidationResult<T> = {
  success: boolean
  data?: T
  error?: string
  errors?: Record<keyof T, string>
}

/**
 * Branded types for better type safety
 */
export type Brand<T, B> = T & { __brand: B }
export type UserId = Brand<string, 'UserId'>
export type TradeId = Brand<string, 'TradeId'>
export type AccountId = Brand<string, 'AccountId'>
export type Email = Brand<string, 'Email'>
export type Url = Brand<string, 'Url'>

/**
 * Type guards
 */
export type TypeGuard<T> = (value: unknown) => value is T
export type AsyncTypeGuard<T> = (value: unknown) => Promise<boolean>

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
