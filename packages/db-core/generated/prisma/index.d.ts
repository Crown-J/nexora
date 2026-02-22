
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Nx00User
 * 
 */
export type Nx00User = $Result.DefaultSelection<Prisma.$Nx00UserPayload>
/**
 * Model Nx00Role
 * 
 */
export type Nx00Role = $Result.DefaultSelection<Prisma.$Nx00RolePayload>
/**
 * Model Nx00UserRole
 * 
 */
export type Nx00UserRole = $Result.DefaultSelection<Prisma.$Nx00UserRolePayload>
/**
 * Model Nx00Brand
 * 
 */
export type Nx00Brand = $Result.DefaultSelection<Prisma.$Nx00BrandPayload>
/**
 * Model Nx00FunctionGroup
 * 
 */
export type Nx00FunctionGroup = $Result.DefaultSelection<Prisma.$Nx00FunctionGroupPayload>
/**
 * Model Nx00PartStatus
 * 
 */
export type Nx00PartStatus = $Result.DefaultSelection<Prisma.$Nx00PartStatusPayload>
/**
 * Model Nx00Part
 * 
 */
export type Nx00Part = $Result.DefaultSelection<Prisma.$Nx00PartPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Nx00Users
 * const nx00Users = await prisma.nx00User.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Nx00Users
   * const nx00Users = await prisma.nx00User.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.nx00User`: Exposes CRUD operations for the **Nx00User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00Users
    * const nx00Users = await prisma.nx00User.findMany()
    * ```
    */
  get nx00User(): Prisma.Nx00UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00Role`: Exposes CRUD operations for the **Nx00Role** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00Roles
    * const nx00Roles = await prisma.nx00Role.findMany()
    * ```
    */
  get nx00Role(): Prisma.Nx00RoleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00UserRole`: Exposes CRUD operations for the **Nx00UserRole** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00UserRoles
    * const nx00UserRoles = await prisma.nx00UserRole.findMany()
    * ```
    */
  get nx00UserRole(): Prisma.Nx00UserRoleDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00Brand`: Exposes CRUD operations for the **Nx00Brand** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00Brands
    * const nx00Brands = await prisma.nx00Brand.findMany()
    * ```
    */
  get nx00Brand(): Prisma.Nx00BrandDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00FunctionGroup`: Exposes CRUD operations for the **Nx00FunctionGroup** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00FunctionGroups
    * const nx00FunctionGroups = await prisma.nx00FunctionGroup.findMany()
    * ```
    */
  get nx00FunctionGroup(): Prisma.Nx00FunctionGroupDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00PartStatus`: Exposes CRUD operations for the **Nx00PartStatus** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00PartStatuses
    * const nx00PartStatuses = await prisma.nx00PartStatus.findMany()
    * ```
    */
  get nx00PartStatus(): Prisma.Nx00PartStatusDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.nx00Part`: Exposes CRUD operations for the **Nx00Part** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Nx00Parts
    * const nx00Parts = await prisma.nx00Part.findMany()
    * ```
    */
  get nx00Part(): Prisma.Nx00PartDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.4.0
   * Query Engine version: ab56fe763f921d033a6c195e7ddeb3e255bdbb57
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Nx00User: 'Nx00User',
    Nx00Role: 'Nx00Role',
    Nx00UserRole: 'Nx00UserRole',
    Nx00Brand: 'Nx00Brand',
    Nx00FunctionGroup: 'Nx00FunctionGroup',
    Nx00PartStatus: 'Nx00PartStatus',
    Nx00Part: 'Nx00Part'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "nx00User" | "nx00Role" | "nx00UserRole" | "nx00Brand" | "nx00FunctionGroup" | "nx00PartStatus" | "nx00Part"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      Nx00User: {
        payload: Prisma.$Nx00UserPayload<ExtArgs>
        fields: Prisma.Nx00UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          findFirst: {
            args: Prisma.Nx00UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          findMany: {
            args: Prisma.Nx00UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>[]
          }
          create: {
            args: Prisma.Nx00UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          createMany: {
            args: Prisma.Nx00UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>[]
          }
          delete: {
            args: Prisma.Nx00UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          update: {
            args: Prisma.Nx00UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          deleteMany: {
            args: Prisma.Nx00UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>[]
          }
          upsert: {
            args: Prisma.Nx00UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserPayload>
          }
          aggregate: {
            args: Prisma.Nx00UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00User>
          }
          groupBy: {
            args: Prisma.Nx00UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00UserCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00UserCountAggregateOutputType> | number
          }
        }
      }
      Nx00Role: {
        payload: Prisma.$Nx00RolePayload<ExtArgs>
        fields: Prisma.Nx00RoleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00RoleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00RoleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          findFirst: {
            args: Prisma.Nx00RoleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00RoleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          findMany: {
            args: Prisma.Nx00RoleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>[]
          }
          create: {
            args: Prisma.Nx00RoleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          createMany: {
            args: Prisma.Nx00RoleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00RoleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>[]
          }
          delete: {
            args: Prisma.Nx00RoleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          update: {
            args: Prisma.Nx00RoleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          deleteMany: {
            args: Prisma.Nx00RoleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00RoleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00RoleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>[]
          }
          upsert: {
            args: Prisma.Nx00RoleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00RolePayload>
          }
          aggregate: {
            args: Prisma.Nx00RoleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00Role>
          }
          groupBy: {
            args: Prisma.Nx00RoleGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00RoleGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00RoleCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00RoleCountAggregateOutputType> | number
          }
        }
      }
      Nx00UserRole: {
        payload: Prisma.$Nx00UserRolePayload<ExtArgs>
        fields: Prisma.Nx00UserRoleFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00UserRoleFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00UserRoleFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          findFirst: {
            args: Prisma.Nx00UserRoleFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00UserRoleFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          findMany: {
            args: Prisma.Nx00UserRoleFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>[]
          }
          create: {
            args: Prisma.Nx00UserRoleCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          createMany: {
            args: Prisma.Nx00UserRoleCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00UserRoleCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>[]
          }
          delete: {
            args: Prisma.Nx00UserRoleDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          update: {
            args: Prisma.Nx00UserRoleUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          deleteMany: {
            args: Prisma.Nx00UserRoleDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00UserRoleUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00UserRoleUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>[]
          }
          upsert: {
            args: Prisma.Nx00UserRoleUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00UserRolePayload>
          }
          aggregate: {
            args: Prisma.Nx00UserRoleAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00UserRole>
          }
          groupBy: {
            args: Prisma.Nx00UserRoleGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00UserRoleGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00UserRoleCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00UserRoleCountAggregateOutputType> | number
          }
        }
      }
      Nx00Brand: {
        payload: Prisma.$Nx00BrandPayload<ExtArgs>
        fields: Prisma.Nx00BrandFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00BrandFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00BrandFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          findFirst: {
            args: Prisma.Nx00BrandFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00BrandFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          findMany: {
            args: Prisma.Nx00BrandFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>[]
          }
          create: {
            args: Prisma.Nx00BrandCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          createMany: {
            args: Prisma.Nx00BrandCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00BrandCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>[]
          }
          delete: {
            args: Prisma.Nx00BrandDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          update: {
            args: Prisma.Nx00BrandUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          deleteMany: {
            args: Prisma.Nx00BrandDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00BrandUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00BrandUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>[]
          }
          upsert: {
            args: Prisma.Nx00BrandUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00BrandPayload>
          }
          aggregate: {
            args: Prisma.Nx00BrandAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00Brand>
          }
          groupBy: {
            args: Prisma.Nx00BrandGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00BrandGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00BrandCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00BrandCountAggregateOutputType> | number
          }
        }
      }
      Nx00FunctionGroup: {
        payload: Prisma.$Nx00FunctionGroupPayload<ExtArgs>
        fields: Prisma.Nx00FunctionGroupFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00FunctionGroupFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00FunctionGroupFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          findFirst: {
            args: Prisma.Nx00FunctionGroupFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00FunctionGroupFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          findMany: {
            args: Prisma.Nx00FunctionGroupFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>[]
          }
          create: {
            args: Prisma.Nx00FunctionGroupCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          createMany: {
            args: Prisma.Nx00FunctionGroupCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00FunctionGroupCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>[]
          }
          delete: {
            args: Prisma.Nx00FunctionGroupDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          update: {
            args: Prisma.Nx00FunctionGroupUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          deleteMany: {
            args: Prisma.Nx00FunctionGroupDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00FunctionGroupUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00FunctionGroupUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>[]
          }
          upsert: {
            args: Prisma.Nx00FunctionGroupUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00FunctionGroupPayload>
          }
          aggregate: {
            args: Prisma.Nx00FunctionGroupAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00FunctionGroup>
          }
          groupBy: {
            args: Prisma.Nx00FunctionGroupGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00FunctionGroupGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00FunctionGroupCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00FunctionGroupCountAggregateOutputType> | number
          }
        }
      }
      Nx00PartStatus: {
        payload: Prisma.$Nx00PartStatusPayload<ExtArgs>
        fields: Prisma.Nx00PartStatusFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00PartStatusFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00PartStatusFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          findFirst: {
            args: Prisma.Nx00PartStatusFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00PartStatusFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          findMany: {
            args: Prisma.Nx00PartStatusFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>[]
          }
          create: {
            args: Prisma.Nx00PartStatusCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          createMany: {
            args: Prisma.Nx00PartStatusCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00PartStatusCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>[]
          }
          delete: {
            args: Prisma.Nx00PartStatusDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          update: {
            args: Prisma.Nx00PartStatusUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          deleteMany: {
            args: Prisma.Nx00PartStatusDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00PartStatusUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00PartStatusUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>[]
          }
          upsert: {
            args: Prisma.Nx00PartStatusUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartStatusPayload>
          }
          aggregate: {
            args: Prisma.Nx00PartStatusAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00PartStatus>
          }
          groupBy: {
            args: Prisma.Nx00PartStatusGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00PartStatusGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00PartStatusCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00PartStatusCountAggregateOutputType> | number
          }
        }
      }
      Nx00Part: {
        payload: Prisma.$Nx00PartPayload<ExtArgs>
        fields: Prisma.Nx00PartFieldRefs
        operations: {
          findUnique: {
            args: Prisma.Nx00PartFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.Nx00PartFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          findFirst: {
            args: Prisma.Nx00PartFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.Nx00PartFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          findMany: {
            args: Prisma.Nx00PartFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>[]
          }
          create: {
            args: Prisma.Nx00PartCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          createMany: {
            args: Prisma.Nx00PartCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.Nx00PartCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>[]
          }
          delete: {
            args: Prisma.Nx00PartDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          update: {
            args: Prisma.Nx00PartUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          deleteMany: {
            args: Prisma.Nx00PartDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.Nx00PartUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.Nx00PartUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>[]
          }
          upsert: {
            args: Prisma.Nx00PartUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$Nx00PartPayload>
          }
          aggregate: {
            args: Prisma.Nx00PartAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateNx00Part>
          }
          groupBy: {
            args: Prisma.Nx00PartGroupByArgs<ExtArgs>
            result: $Utils.Optional<Nx00PartGroupByOutputType>[]
          }
          count: {
            args: Prisma.Nx00PartCountArgs<ExtArgs>
            result: $Utils.Optional<Nx00PartCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    nx00User?: Nx00UserOmit
    nx00Role?: Nx00RoleOmit
    nx00UserRole?: Nx00UserRoleOmit
    nx00Brand?: Nx00BrandOmit
    nx00FunctionGroup?: Nx00FunctionGroupOmit
    nx00PartStatus?: Nx00PartStatusOmit
    nx00Part?: Nx00PartOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type Nx00UserCountOutputType
   */

  export type Nx00UserCountOutputType = {
    createdUsers: number
    updatedUsers: number
    userRoles: number
    rolesCreated: number
    rolesUpdated: number
    userRolesCreated: number
    brandsCreated: number
    brandsUpdated: number
    functionGroupsCreated: number
    functionGroupsUpdated: number
    partStatusesCreated: number
    partStatusesUpdated: number
    partsCreated: number
    partsUpdated: number
  }

  export type Nx00UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdUsers?: boolean | Nx00UserCountOutputTypeCountCreatedUsersArgs
    updatedUsers?: boolean | Nx00UserCountOutputTypeCountUpdatedUsersArgs
    userRoles?: boolean | Nx00UserCountOutputTypeCountUserRolesArgs
    rolesCreated?: boolean | Nx00UserCountOutputTypeCountRolesCreatedArgs
    rolesUpdated?: boolean | Nx00UserCountOutputTypeCountRolesUpdatedArgs
    userRolesCreated?: boolean | Nx00UserCountOutputTypeCountUserRolesCreatedArgs
    brandsCreated?: boolean | Nx00UserCountOutputTypeCountBrandsCreatedArgs
    brandsUpdated?: boolean | Nx00UserCountOutputTypeCountBrandsUpdatedArgs
    functionGroupsCreated?: boolean | Nx00UserCountOutputTypeCountFunctionGroupsCreatedArgs
    functionGroupsUpdated?: boolean | Nx00UserCountOutputTypeCountFunctionGroupsUpdatedArgs
    partStatusesCreated?: boolean | Nx00UserCountOutputTypeCountPartStatusesCreatedArgs
    partStatusesUpdated?: boolean | Nx00UserCountOutputTypeCountPartStatusesUpdatedArgs
    partsCreated?: boolean | Nx00UserCountOutputTypeCountPartsCreatedArgs
    partsUpdated?: boolean | Nx00UserCountOutputTypeCountPartsUpdatedArgs
  }

  // Custom InputTypes
  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserCountOutputType
     */
    select?: Nx00UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountCreatedUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountUpdatedUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountUserRolesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserRoleWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountRolesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00RoleWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountRolesUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00RoleWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountUserRolesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserRoleWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountBrandsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00BrandWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountBrandsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00BrandWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountFunctionGroupsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00FunctionGroupWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountFunctionGroupsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00FunctionGroupWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountPartStatusesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartStatusWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountPartStatusesUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartStatusWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountPartsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
  }

  /**
   * Nx00UserCountOutputType without action
   */
  export type Nx00UserCountOutputTypeCountPartsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
  }


  /**
   * Count Type Nx00RoleCountOutputType
   */

  export type Nx00RoleCountOutputType = {
    userRoles: number
  }

  export type Nx00RoleCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    userRoles?: boolean | Nx00RoleCountOutputTypeCountUserRolesArgs
  }

  // Custom InputTypes
  /**
   * Nx00RoleCountOutputType without action
   */
  export type Nx00RoleCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00RoleCountOutputType
     */
    select?: Nx00RoleCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Nx00RoleCountOutputType without action
   */
  export type Nx00RoleCountOutputTypeCountUserRolesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserRoleWhereInput
  }


  /**
   * Count Type Nx00BrandCountOutputType
   */

  export type Nx00BrandCountOutputType = {
    parts: number
  }

  export type Nx00BrandCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    parts?: boolean | Nx00BrandCountOutputTypeCountPartsArgs
  }

  // Custom InputTypes
  /**
   * Nx00BrandCountOutputType without action
   */
  export type Nx00BrandCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00BrandCountOutputType
     */
    select?: Nx00BrandCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Nx00BrandCountOutputType without action
   */
  export type Nx00BrandCountOutputTypeCountPartsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
  }


  /**
   * Count Type Nx00FunctionGroupCountOutputType
   */

  export type Nx00FunctionGroupCountOutputType = {
    parts: number
  }

  export type Nx00FunctionGroupCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    parts?: boolean | Nx00FunctionGroupCountOutputTypeCountPartsArgs
  }

  // Custom InputTypes
  /**
   * Nx00FunctionGroupCountOutputType without action
   */
  export type Nx00FunctionGroupCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroupCountOutputType
     */
    select?: Nx00FunctionGroupCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Nx00FunctionGroupCountOutputType without action
   */
  export type Nx00FunctionGroupCountOutputTypeCountPartsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
  }


  /**
   * Count Type Nx00PartStatusCountOutputType
   */

  export type Nx00PartStatusCountOutputType = {
    parts: number
  }

  export type Nx00PartStatusCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    parts?: boolean | Nx00PartStatusCountOutputTypeCountPartsArgs
  }

  // Custom InputTypes
  /**
   * Nx00PartStatusCountOutputType without action
   */
  export type Nx00PartStatusCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatusCountOutputType
     */
    select?: Nx00PartStatusCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * Nx00PartStatusCountOutputType without action
   */
  export type Nx00PartStatusCountOutputTypeCountPartsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
  }


  /**
   * Models
   */

  /**
   * Model Nx00User
   */

  export type AggregateNx00User = {
    _count: Nx00UserCountAggregateOutputType | null
    _min: Nx00UserMinAggregateOutputType | null
    _max: Nx00UserMaxAggregateOutputType | null
  }

  export type Nx00UserMinAggregateOutputType = {
    id: string | null
    username: string | null
    passwordHash: string | null
    displayName: string | null
    email: string | null
    phone: string | null
    isActive: boolean | null
    lastLoginAt: Date | null
    statusCode: string | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00UserMaxAggregateOutputType = {
    id: string | null
    username: string | null
    passwordHash: string | null
    displayName: string | null
    email: string | null
    phone: string | null
    isActive: boolean | null
    lastLoginAt: Date | null
    statusCode: string | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00UserCountAggregateOutputType = {
    id: number
    username: number
    passwordHash: number
    displayName: number
    email: number
    phone: number
    isActive: number
    lastLoginAt: number
    statusCode: number
    remark: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00UserMinAggregateInputType = {
    id?: true
    username?: true
    passwordHash?: true
    displayName?: true
    email?: true
    phone?: true
    isActive?: true
    lastLoginAt?: true
    statusCode?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00UserMaxAggregateInputType = {
    id?: true
    username?: true
    passwordHash?: true
    displayName?: true
    email?: true
    phone?: true
    isActive?: true
    lastLoginAt?: true
    statusCode?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00UserCountAggregateInputType = {
    id?: true
    username?: true
    passwordHash?: true
    displayName?: true
    email?: true
    phone?: true
    isActive?: true
    lastLoginAt?: true
    statusCode?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00User to aggregate.
     */
    where?: Nx00UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Users to fetch.
     */
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00Users
    **/
    _count?: true | Nx00UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00UserMaxAggregateInputType
  }

  export type GetNx00UserAggregateType<T extends Nx00UserAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00User]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00User[P]>
      : GetScalarType<T[P], AggregateNx00User[P]>
  }




  export type Nx00UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserWhereInput
    orderBy?: Nx00UserOrderByWithAggregationInput | Nx00UserOrderByWithAggregationInput[]
    by: Nx00UserScalarFieldEnum[] | Nx00UserScalarFieldEnum
    having?: Nx00UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00UserCountAggregateInputType | true
    _min?: Nx00UserMinAggregateInputType
    _max?: Nx00UserMaxAggregateInputType
  }

  export type Nx00UserGroupByOutputType = {
    id: string
    username: string
    passwordHash: string
    displayName: string
    email: string | null
    phone: string | null
    isActive: boolean
    lastLoginAt: Date | null
    statusCode: string
    remark: string | null
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00UserCountAggregateOutputType | null
    _min: Nx00UserMinAggregateOutputType | null
    _max: Nx00UserMaxAggregateOutputType | null
  }

  type GetNx00UserGroupByPayload<T extends Nx00UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00UserGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00UserGroupByOutputType[P]>
        }
      >
    >


  export type Nx00UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    passwordHash?: boolean
    displayName?: boolean
    email?: boolean
    phone?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    statusCode?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
    createdUsers?: boolean | Nx00User$createdUsersArgs<ExtArgs>
    updatedUsers?: boolean | Nx00User$updatedUsersArgs<ExtArgs>
    userRoles?: boolean | Nx00User$userRolesArgs<ExtArgs>
    rolesCreated?: boolean | Nx00User$rolesCreatedArgs<ExtArgs>
    rolesUpdated?: boolean | Nx00User$rolesUpdatedArgs<ExtArgs>
    userRolesCreated?: boolean | Nx00User$userRolesCreatedArgs<ExtArgs>
    brandsCreated?: boolean | Nx00User$brandsCreatedArgs<ExtArgs>
    brandsUpdated?: boolean | Nx00User$brandsUpdatedArgs<ExtArgs>
    functionGroupsCreated?: boolean | Nx00User$functionGroupsCreatedArgs<ExtArgs>
    functionGroupsUpdated?: boolean | Nx00User$functionGroupsUpdatedArgs<ExtArgs>
    partStatusesCreated?: boolean | Nx00User$partStatusesCreatedArgs<ExtArgs>
    partStatusesUpdated?: boolean | Nx00User$partStatusesUpdatedArgs<ExtArgs>
    partsCreated?: boolean | Nx00User$partsCreatedArgs<ExtArgs>
    partsUpdated?: boolean | Nx00User$partsUpdatedArgs<ExtArgs>
    _count?: boolean | Nx00UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nx00User"]>

  export type Nx00UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    passwordHash?: boolean
    displayName?: boolean
    email?: boolean
    phone?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    statusCode?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00User"]>

  export type Nx00UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    passwordHash?: boolean
    displayName?: boolean
    email?: boolean
    phone?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    statusCode?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00User"]>

  export type Nx00UserSelectScalar = {
    id?: boolean
    username?: boolean
    passwordHash?: boolean
    displayName?: boolean
    email?: boolean
    phone?: boolean
    isActive?: boolean
    lastLoginAt?: boolean
    statusCode?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "username" | "passwordHash" | "displayName" | "email" | "phone" | "isActive" | "lastLoginAt" | "statusCode" | "remark" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00User"]>
  export type Nx00UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
    createdUsers?: boolean | Nx00User$createdUsersArgs<ExtArgs>
    updatedUsers?: boolean | Nx00User$updatedUsersArgs<ExtArgs>
    userRoles?: boolean | Nx00User$userRolesArgs<ExtArgs>
    rolesCreated?: boolean | Nx00User$rolesCreatedArgs<ExtArgs>
    rolesUpdated?: boolean | Nx00User$rolesUpdatedArgs<ExtArgs>
    userRolesCreated?: boolean | Nx00User$userRolesCreatedArgs<ExtArgs>
    brandsCreated?: boolean | Nx00User$brandsCreatedArgs<ExtArgs>
    brandsUpdated?: boolean | Nx00User$brandsUpdatedArgs<ExtArgs>
    functionGroupsCreated?: boolean | Nx00User$functionGroupsCreatedArgs<ExtArgs>
    functionGroupsUpdated?: boolean | Nx00User$functionGroupsUpdatedArgs<ExtArgs>
    partStatusesCreated?: boolean | Nx00User$partStatusesCreatedArgs<ExtArgs>
    partStatusesUpdated?: boolean | Nx00User$partStatusesUpdatedArgs<ExtArgs>
    partsCreated?: boolean | Nx00User$partsCreatedArgs<ExtArgs>
    partsUpdated?: boolean | Nx00User$partsUpdatedArgs<ExtArgs>
    _count?: boolean | Nx00UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type Nx00UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
  }
  export type Nx00UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00User$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00User$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00User"
    objects: {
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      createdUsers: Prisma.$Nx00UserPayload<ExtArgs>[]
      updatedUsers: Prisma.$Nx00UserPayload<ExtArgs>[]
      userRoles: Prisma.$Nx00UserRolePayload<ExtArgs>[]
      rolesCreated: Prisma.$Nx00RolePayload<ExtArgs>[]
      rolesUpdated: Prisma.$Nx00RolePayload<ExtArgs>[]
      userRolesCreated: Prisma.$Nx00UserRolePayload<ExtArgs>[]
      brandsCreated: Prisma.$Nx00BrandPayload<ExtArgs>[]
      brandsUpdated: Prisma.$Nx00BrandPayload<ExtArgs>[]
      functionGroupsCreated: Prisma.$Nx00FunctionGroupPayload<ExtArgs>[]
      functionGroupsUpdated: Prisma.$Nx00FunctionGroupPayload<ExtArgs>[]
      partStatusesCreated: Prisma.$Nx00PartStatusPayload<ExtArgs>[]
      partStatusesUpdated: Prisma.$Nx00PartStatusPayload<ExtArgs>[]
      partsCreated: Prisma.$Nx00PartPayload<ExtArgs>[]
      partsUpdated: Prisma.$Nx00PartPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      username: string
      passwordHash: string
      displayName: string
      email: string | null
      phone: string | null
      isActive: boolean
      lastLoginAt: Date | null
      statusCode: string
      remark: string | null
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00User"]>
    composites: {}
  }

  type Nx00UserGetPayload<S extends boolean | null | undefined | Nx00UserDefaultArgs> = $Result.GetResult<Prisma.$Nx00UserPayload, S>

  type Nx00UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00UserCountAggregateInputType | true
    }

  export interface Nx00UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00User'], meta: { name: 'Nx00User' } }
    /**
     * Find zero or one Nx00User that matches the filter.
     * @param {Nx00UserFindUniqueArgs} args - Arguments to find a Nx00User
     * @example
     * // Get one Nx00User
     * const nx00User = await prisma.nx00User.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00UserFindUniqueArgs>(args: SelectSubset<T, Nx00UserFindUniqueArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00UserFindUniqueOrThrowArgs} args - Arguments to find a Nx00User
     * @example
     * // Get one Nx00User
     * const nx00User = await prisma.nx00User.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00UserFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserFindFirstArgs} args - Arguments to find a Nx00User
     * @example
     * // Get one Nx00User
     * const nx00User = await prisma.nx00User.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00UserFindFirstArgs>(args?: SelectSubset<T, Nx00UserFindFirstArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserFindFirstOrThrowArgs} args - Arguments to find a Nx00User
     * @example
     * // Get one Nx00User
     * const nx00User = await prisma.nx00User.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00UserFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00Users
     * const nx00Users = await prisma.nx00User.findMany()
     * 
     * // Get first 10 Nx00Users
     * const nx00Users = await prisma.nx00User.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00UserWithIdOnly = await prisma.nx00User.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00UserFindManyArgs>(args?: SelectSubset<T, Nx00UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00User.
     * @param {Nx00UserCreateArgs} args - Arguments to create a Nx00User.
     * @example
     * // Create one Nx00User
     * const Nx00User = await prisma.nx00User.create({
     *   data: {
     *     // ... data to create a Nx00User
     *   }
     * })
     * 
     */
    create<T extends Nx00UserCreateArgs>(args: SelectSubset<T, Nx00UserCreateArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00Users.
     * @param {Nx00UserCreateManyArgs} args - Arguments to create many Nx00Users.
     * @example
     * // Create many Nx00Users
     * const nx00User = await prisma.nx00User.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00UserCreateManyArgs>(args?: SelectSubset<T, Nx00UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00Users and returns the data saved in the database.
     * @param {Nx00UserCreateManyAndReturnArgs} args - Arguments to create many Nx00Users.
     * @example
     * // Create many Nx00Users
     * const nx00User = await prisma.nx00User.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00Users and only return the `id`
     * const nx00UserWithIdOnly = await prisma.nx00User.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00UserCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00User.
     * @param {Nx00UserDeleteArgs} args - Arguments to delete one Nx00User.
     * @example
     * // Delete one Nx00User
     * const Nx00User = await prisma.nx00User.delete({
     *   where: {
     *     // ... filter to delete one Nx00User
     *   }
     * })
     * 
     */
    delete<T extends Nx00UserDeleteArgs>(args: SelectSubset<T, Nx00UserDeleteArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00User.
     * @param {Nx00UserUpdateArgs} args - Arguments to update one Nx00User.
     * @example
     * // Update one Nx00User
     * const nx00User = await prisma.nx00User.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00UserUpdateArgs>(args: SelectSubset<T, Nx00UserUpdateArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00Users.
     * @param {Nx00UserDeleteManyArgs} args - Arguments to filter Nx00Users to delete.
     * @example
     * // Delete a few Nx00Users
     * const { count } = await prisma.nx00User.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00UserDeleteManyArgs>(args?: SelectSubset<T, Nx00UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00Users
     * const nx00User = await prisma.nx00User.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00UserUpdateManyArgs>(args: SelectSubset<T, Nx00UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Users and returns the data updated in the database.
     * @param {Nx00UserUpdateManyAndReturnArgs} args - Arguments to update many Nx00Users.
     * @example
     * // Update many Nx00Users
     * const nx00User = await prisma.nx00User.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00Users and only return the `id`
     * const nx00UserWithIdOnly = await prisma.nx00User.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00UserUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00User.
     * @param {Nx00UserUpsertArgs} args - Arguments to update or create a Nx00User.
     * @example
     * // Update or create a Nx00User
     * const nx00User = await prisma.nx00User.upsert({
     *   create: {
     *     // ... data to create a Nx00User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00User we want to update
     *   }
     * })
     */
    upsert<T extends Nx00UserUpsertArgs>(args: SelectSubset<T, Nx00UserUpsertArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserCountArgs} args - Arguments to filter Nx00Users to count.
     * @example
     * // Count the number of Nx00Users
     * const count = await prisma.nx00User.count({
     *   where: {
     *     // ... the filter for the Nx00Users we want to count
     *   }
     * })
    **/
    count<T extends Nx00UserCountArgs>(
      args?: Subset<T, Nx00UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00UserAggregateArgs>(args: Subset<T, Nx00UserAggregateArgs>): Prisma.PrismaPromise<GetNx00UserAggregateType<T>>

    /**
     * Group by Nx00User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00UserGroupByArgs['orderBy'] }
        : { orderBy?: Nx00UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00UserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00User model
   */
  readonly fields: Nx00UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdByUser<T extends Nx00User$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00User$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    createdUsers<T extends Nx00User$createdUsersArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$createdUsersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    updatedUsers<T extends Nx00User$updatedUsersArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$updatedUsersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    userRoles<T extends Nx00User$userRolesArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$userRolesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    rolesCreated<T extends Nx00User$rolesCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$rolesCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    rolesUpdated<T extends Nx00User$rolesUpdatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$rolesUpdatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    userRolesCreated<T extends Nx00User$userRolesCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$userRolesCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    brandsCreated<T extends Nx00User$brandsCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$brandsCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    brandsUpdated<T extends Nx00User$brandsUpdatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$brandsUpdatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    functionGroupsCreated<T extends Nx00User$functionGroupsCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$functionGroupsCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    functionGroupsUpdated<T extends Nx00User$functionGroupsUpdatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$functionGroupsUpdatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    partStatusesCreated<T extends Nx00User$partStatusesCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$partStatusesCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    partStatusesUpdated<T extends Nx00User$partStatusesUpdatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$partStatusesUpdatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    partsCreated<T extends Nx00User$partsCreatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$partsCreatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    partsUpdated<T extends Nx00User$partsUpdatedArgs<ExtArgs> = {}>(args?: Subset<T, Nx00User$partsUpdatedArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00User model
   */
  interface Nx00UserFieldRefs {
    readonly id: FieldRef<"Nx00User", 'String'>
    readonly username: FieldRef<"Nx00User", 'String'>
    readonly passwordHash: FieldRef<"Nx00User", 'String'>
    readonly displayName: FieldRef<"Nx00User", 'String'>
    readonly email: FieldRef<"Nx00User", 'String'>
    readonly phone: FieldRef<"Nx00User", 'String'>
    readonly isActive: FieldRef<"Nx00User", 'Boolean'>
    readonly lastLoginAt: FieldRef<"Nx00User", 'DateTime'>
    readonly statusCode: FieldRef<"Nx00User", 'String'>
    readonly remark: FieldRef<"Nx00User", 'String'>
    readonly createdAt: FieldRef<"Nx00User", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00User", 'String'>
    readonly updatedAt: FieldRef<"Nx00User", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00User", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00User findUnique
   */
  export type Nx00UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter, which Nx00User to fetch.
     */
    where: Nx00UserWhereUniqueInput
  }

  /**
   * Nx00User findUniqueOrThrow
   */
  export type Nx00UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter, which Nx00User to fetch.
     */
    where: Nx00UserWhereUniqueInput
  }

  /**
   * Nx00User findFirst
   */
  export type Nx00UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter, which Nx00User to fetch.
     */
    where?: Nx00UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Users to fetch.
     */
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Users.
     */
    cursor?: Nx00UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Users.
     */
    distinct?: Nx00UserScalarFieldEnum | Nx00UserScalarFieldEnum[]
  }

  /**
   * Nx00User findFirstOrThrow
   */
  export type Nx00UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter, which Nx00User to fetch.
     */
    where?: Nx00UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Users to fetch.
     */
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Users.
     */
    cursor?: Nx00UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Users.
     */
    distinct?: Nx00UserScalarFieldEnum | Nx00UserScalarFieldEnum[]
  }

  /**
   * Nx00User findMany
   */
  export type Nx00UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Users to fetch.
     */
    where?: Nx00UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Users to fetch.
     */
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00Users.
     */
    cursor?: Nx00UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Users.
     */
    skip?: number
    distinct?: Nx00UserScalarFieldEnum | Nx00UserScalarFieldEnum[]
  }

  /**
   * Nx00User create
   */
  export type Nx00UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00User.
     */
    data: XOR<Nx00UserCreateInput, Nx00UserUncheckedCreateInput>
  }

  /**
   * Nx00User createMany
   */
  export type Nx00UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00Users.
     */
    data: Nx00UserCreateManyInput | Nx00UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00User createManyAndReturn
   */
  export type Nx00UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00Users.
     */
    data: Nx00UserCreateManyInput | Nx00UserCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00User update
   */
  export type Nx00UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00User.
     */
    data: XOR<Nx00UserUpdateInput, Nx00UserUncheckedUpdateInput>
    /**
     * Choose, which Nx00User to update.
     */
    where: Nx00UserWhereUniqueInput
  }

  /**
   * Nx00User updateMany
   */
  export type Nx00UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00Users.
     */
    data: XOR<Nx00UserUpdateManyMutationInput, Nx00UserUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Users to update
     */
    where?: Nx00UserWhereInput
    /**
     * Limit how many Nx00Users to update.
     */
    limit?: number
  }

  /**
   * Nx00User updateManyAndReturn
   */
  export type Nx00UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * The data used to update Nx00Users.
     */
    data: XOR<Nx00UserUpdateManyMutationInput, Nx00UserUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Users to update
     */
    where?: Nx00UserWhereInput
    /**
     * Limit how many Nx00Users to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00User upsert
   */
  export type Nx00UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00User to update in case it exists.
     */
    where: Nx00UserWhereUniqueInput
    /**
     * In case the Nx00User found by the `where` argument doesn't exist, create a new Nx00User with this data.
     */
    create: XOR<Nx00UserCreateInput, Nx00UserUncheckedCreateInput>
    /**
     * In case the Nx00User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00UserUpdateInput, Nx00UserUncheckedUpdateInput>
  }

  /**
   * Nx00User delete
   */
  export type Nx00UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    /**
     * Filter which Nx00User to delete.
     */
    where: Nx00UserWhereUniqueInput
  }

  /**
   * Nx00User deleteMany
   */
  export type Nx00UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Users to delete
     */
    where?: Nx00UserWhereInput
    /**
     * Limit how many Nx00Users to delete.
     */
    limit?: number
  }

  /**
   * Nx00User.createdByUser
   */
  export type Nx00User$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00User.updatedByUser
   */
  export type Nx00User$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00User.createdUsers
   */
  export type Nx00User$createdUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    cursor?: Nx00UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00UserScalarFieldEnum | Nx00UserScalarFieldEnum[]
  }

  /**
   * Nx00User.updatedUsers
   */
  export type Nx00User$updatedUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
    orderBy?: Nx00UserOrderByWithRelationInput | Nx00UserOrderByWithRelationInput[]
    cursor?: Nx00UserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00UserScalarFieldEnum | Nx00UserScalarFieldEnum[]
  }

  /**
   * Nx00User.userRoles
   */
  export type Nx00User$userRolesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    where?: Nx00UserRoleWhereInput
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    cursor?: Nx00UserRoleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00User.rolesCreated
   */
  export type Nx00User$rolesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    where?: Nx00RoleWhereInput
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    cursor?: Nx00RoleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00RoleScalarFieldEnum | Nx00RoleScalarFieldEnum[]
  }

  /**
   * Nx00User.rolesUpdated
   */
  export type Nx00User$rolesUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    where?: Nx00RoleWhereInput
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    cursor?: Nx00RoleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00RoleScalarFieldEnum | Nx00RoleScalarFieldEnum[]
  }

  /**
   * Nx00User.userRolesCreated
   */
  export type Nx00User$userRolesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    where?: Nx00UserRoleWhereInput
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    cursor?: Nx00UserRoleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00User.brandsCreated
   */
  export type Nx00User$brandsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    where?: Nx00BrandWhereInput
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    cursor?: Nx00BrandWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00BrandScalarFieldEnum | Nx00BrandScalarFieldEnum[]
  }

  /**
   * Nx00User.brandsUpdated
   */
  export type Nx00User$brandsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    where?: Nx00BrandWhereInput
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    cursor?: Nx00BrandWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00BrandScalarFieldEnum | Nx00BrandScalarFieldEnum[]
  }

  /**
   * Nx00User.functionGroupsCreated
   */
  export type Nx00User$functionGroupsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    where?: Nx00FunctionGroupWhereInput
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    cursor?: Nx00FunctionGroupWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00FunctionGroupScalarFieldEnum | Nx00FunctionGroupScalarFieldEnum[]
  }

  /**
   * Nx00User.functionGroupsUpdated
   */
  export type Nx00User$functionGroupsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    where?: Nx00FunctionGroupWhereInput
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    cursor?: Nx00FunctionGroupWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00FunctionGroupScalarFieldEnum | Nx00FunctionGroupScalarFieldEnum[]
  }

  /**
   * Nx00User.partStatusesCreated
   */
  export type Nx00User$partStatusesCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    where?: Nx00PartStatusWhereInput
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    cursor?: Nx00PartStatusWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartStatusScalarFieldEnum | Nx00PartStatusScalarFieldEnum[]
  }

  /**
   * Nx00User.partStatusesUpdated
   */
  export type Nx00User$partStatusesUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    where?: Nx00PartStatusWhereInput
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    cursor?: Nx00PartStatusWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartStatusScalarFieldEnum | Nx00PartStatusScalarFieldEnum[]
  }

  /**
   * Nx00User.partsCreated
   */
  export type Nx00User$partsCreatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    cursor?: Nx00PartWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00User.partsUpdated
   */
  export type Nx00User$partsUpdatedArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    cursor?: Nx00PartWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00User without action
   */
  export type Nx00UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
  }


  /**
   * Model Nx00Role
   */

  export type AggregateNx00Role = {
    _count: Nx00RoleCountAggregateOutputType | null
    _min: Nx00RoleMinAggregateOutputType | null
    _max: Nx00RoleMaxAggregateOutputType | null
  }

  export type Nx00RoleMinAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    description: string | null
    isActive: boolean | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00RoleMaxAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    description: string | null
    isActive: boolean | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00RoleCountAggregateOutputType = {
    id: number
    code: number
    name: number
    description: number
    isActive: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00RoleMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00RoleMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00RoleCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00RoleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Role to aggregate.
     */
    where?: Nx00RoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Roles to fetch.
     */
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00RoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Roles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Roles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00Roles
    **/
    _count?: true | Nx00RoleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00RoleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00RoleMaxAggregateInputType
  }

  export type GetNx00RoleAggregateType<T extends Nx00RoleAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00Role]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00Role[P]>
      : GetScalarType<T[P], AggregateNx00Role[P]>
  }




  export type Nx00RoleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00RoleWhereInput
    orderBy?: Nx00RoleOrderByWithAggregationInput | Nx00RoleOrderByWithAggregationInput[]
    by: Nx00RoleScalarFieldEnum[] | Nx00RoleScalarFieldEnum
    having?: Nx00RoleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00RoleCountAggregateInputType | true
    _min?: Nx00RoleMinAggregateInputType
    _max?: Nx00RoleMaxAggregateInputType
  }

  export type Nx00RoleGroupByOutputType = {
    id: string
    code: string
    name: string
    description: string | null
    isActive: boolean
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00RoleCountAggregateOutputType | null
    _min: Nx00RoleMinAggregateOutputType | null
    _max: Nx00RoleMaxAggregateOutputType | null
  }

  type GetNx00RoleGroupByPayload<T extends Nx00RoleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00RoleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00RoleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00RoleGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00RoleGroupByOutputType[P]>
        }
      >
    >


  export type Nx00RoleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
    userRoles?: boolean | Nx00Role$userRolesArgs<ExtArgs>
    _count?: boolean | Nx00RoleCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Role"]>

  export type Nx00RoleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Role"]>

  export type Nx00RoleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Role"]>

  export type Nx00RoleSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00RoleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "name" | "description" | "isActive" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00Role"]>
  export type Nx00RoleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
    userRoles?: boolean | Nx00Role$userRolesArgs<ExtArgs>
    _count?: boolean | Nx00RoleCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type Nx00RoleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
  }
  export type Nx00RoleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Role$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Role$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00RolePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00Role"
    objects: {
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      userRoles: Prisma.$Nx00UserRolePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      name: string
      description: string | null
      isActive: boolean
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00Role"]>
    composites: {}
  }

  type Nx00RoleGetPayload<S extends boolean | null | undefined | Nx00RoleDefaultArgs> = $Result.GetResult<Prisma.$Nx00RolePayload, S>

  type Nx00RoleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00RoleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00RoleCountAggregateInputType | true
    }

  export interface Nx00RoleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00Role'], meta: { name: 'Nx00Role' } }
    /**
     * Find zero or one Nx00Role that matches the filter.
     * @param {Nx00RoleFindUniqueArgs} args - Arguments to find a Nx00Role
     * @example
     * // Get one Nx00Role
     * const nx00Role = await prisma.nx00Role.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00RoleFindUniqueArgs>(args: SelectSubset<T, Nx00RoleFindUniqueArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00Role that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00RoleFindUniqueOrThrowArgs} args - Arguments to find a Nx00Role
     * @example
     * // Get one Nx00Role
     * const nx00Role = await prisma.nx00Role.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00RoleFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00RoleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Role that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleFindFirstArgs} args - Arguments to find a Nx00Role
     * @example
     * // Get one Nx00Role
     * const nx00Role = await prisma.nx00Role.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00RoleFindFirstArgs>(args?: SelectSubset<T, Nx00RoleFindFirstArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Role that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleFindFirstOrThrowArgs} args - Arguments to find a Nx00Role
     * @example
     * // Get one Nx00Role
     * const nx00Role = await prisma.nx00Role.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00RoleFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00RoleFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00Roles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00Roles
     * const nx00Roles = await prisma.nx00Role.findMany()
     * 
     * // Get first 10 Nx00Roles
     * const nx00Roles = await prisma.nx00Role.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00RoleWithIdOnly = await prisma.nx00Role.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00RoleFindManyArgs>(args?: SelectSubset<T, Nx00RoleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00Role.
     * @param {Nx00RoleCreateArgs} args - Arguments to create a Nx00Role.
     * @example
     * // Create one Nx00Role
     * const Nx00Role = await prisma.nx00Role.create({
     *   data: {
     *     // ... data to create a Nx00Role
     *   }
     * })
     * 
     */
    create<T extends Nx00RoleCreateArgs>(args: SelectSubset<T, Nx00RoleCreateArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00Roles.
     * @param {Nx00RoleCreateManyArgs} args - Arguments to create many Nx00Roles.
     * @example
     * // Create many Nx00Roles
     * const nx00Role = await prisma.nx00Role.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00RoleCreateManyArgs>(args?: SelectSubset<T, Nx00RoleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00Roles and returns the data saved in the database.
     * @param {Nx00RoleCreateManyAndReturnArgs} args - Arguments to create many Nx00Roles.
     * @example
     * // Create many Nx00Roles
     * const nx00Role = await prisma.nx00Role.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00Roles and only return the `id`
     * const nx00RoleWithIdOnly = await prisma.nx00Role.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00RoleCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00RoleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00Role.
     * @param {Nx00RoleDeleteArgs} args - Arguments to delete one Nx00Role.
     * @example
     * // Delete one Nx00Role
     * const Nx00Role = await prisma.nx00Role.delete({
     *   where: {
     *     // ... filter to delete one Nx00Role
     *   }
     * })
     * 
     */
    delete<T extends Nx00RoleDeleteArgs>(args: SelectSubset<T, Nx00RoleDeleteArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00Role.
     * @param {Nx00RoleUpdateArgs} args - Arguments to update one Nx00Role.
     * @example
     * // Update one Nx00Role
     * const nx00Role = await prisma.nx00Role.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00RoleUpdateArgs>(args: SelectSubset<T, Nx00RoleUpdateArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00Roles.
     * @param {Nx00RoleDeleteManyArgs} args - Arguments to filter Nx00Roles to delete.
     * @example
     * // Delete a few Nx00Roles
     * const { count } = await prisma.nx00Role.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00RoleDeleteManyArgs>(args?: SelectSubset<T, Nx00RoleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Roles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00Roles
     * const nx00Role = await prisma.nx00Role.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00RoleUpdateManyArgs>(args: SelectSubset<T, Nx00RoleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Roles and returns the data updated in the database.
     * @param {Nx00RoleUpdateManyAndReturnArgs} args - Arguments to update many Nx00Roles.
     * @example
     * // Update many Nx00Roles
     * const nx00Role = await prisma.nx00Role.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00Roles and only return the `id`
     * const nx00RoleWithIdOnly = await prisma.nx00Role.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00RoleUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00RoleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00Role.
     * @param {Nx00RoleUpsertArgs} args - Arguments to update or create a Nx00Role.
     * @example
     * // Update or create a Nx00Role
     * const nx00Role = await prisma.nx00Role.upsert({
     *   create: {
     *     // ... data to create a Nx00Role
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00Role we want to update
     *   }
     * })
     */
    upsert<T extends Nx00RoleUpsertArgs>(args: SelectSubset<T, Nx00RoleUpsertArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00Roles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleCountArgs} args - Arguments to filter Nx00Roles to count.
     * @example
     * // Count the number of Nx00Roles
     * const count = await prisma.nx00Role.count({
     *   where: {
     *     // ... the filter for the Nx00Roles we want to count
     *   }
     * })
    **/
    count<T extends Nx00RoleCountArgs>(
      args?: Subset<T, Nx00RoleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00RoleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00Role.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00RoleAggregateArgs>(args: Subset<T, Nx00RoleAggregateArgs>): Prisma.PrismaPromise<GetNx00RoleAggregateType<T>>

    /**
     * Group by Nx00Role.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00RoleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00RoleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00RoleGroupByArgs['orderBy'] }
        : { orderBy?: Nx00RoleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00RoleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00RoleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00Role model
   */
  readonly fields: Nx00RoleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00Role.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00RoleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdByUser<T extends Nx00Role$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Role$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00Role$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Role$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    userRoles<T extends Nx00Role$userRolesArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Role$userRolesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00Role model
   */
  interface Nx00RoleFieldRefs {
    readonly id: FieldRef<"Nx00Role", 'String'>
    readonly code: FieldRef<"Nx00Role", 'String'>
    readonly name: FieldRef<"Nx00Role", 'String'>
    readonly description: FieldRef<"Nx00Role", 'String'>
    readonly isActive: FieldRef<"Nx00Role", 'Boolean'>
    readonly createdAt: FieldRef<"Nx00Role", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00Role", 'String'>
    readonly updatedAt: FieldRef<"Nx00Role", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00Role", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00Role findUnique
   */
  export type Nx00RoleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Role to fetch.
     */
    where: Nx00RoleWhereUniqueInput
  }

  /**
   * Nx00Role findUniqueOrThrow
   */
  export type Nx00RoleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Role to fetch.
     */
    where: Nx00RoleWhereUniqueInput
  }

  /**
   * Nx00Role findFirst
   */
  export type Nx00RoleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Role to fetch.
     */
    where?: Nx00RoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Roles to fetch.
     */
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Roles.
     */
    cursor?: Nx00RoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Roles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Roles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Roles.
     */
    distinct?: Nx00RoleScalarFieldEnum | Nx00RoleScalarFieldEnum[]
  }

  /**
   * Nx00Role findFirstOrThrow
   */
  export type Nx00RoleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Role to fetch.
     */
    where?: Nx00RoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Roles to fetch.
     */
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Roles.
     */
    cursor?: Nx00RoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Roles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Roles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Roles.
     */
    distinct?: Nx00RoleScalarFieldEnum | Nx00RoleScalarFieldEnum[]
  }

  /**
   * Nx00Role findMany
   */
  export type Nx00RoleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Roles to fetch.
     */
    where?: Nx00RoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Roles to fetch.
     */
    orderBy?: Nx00RoleOrderByWithRelationInput | Nx00RoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00Roles.
     */
    cursor?: Nx00RoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Roles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Roles.
     */
    skip?: number
    distinct?: Nx00RoleScalarFieldEnum | Nx00RoleScalarFieldEnum[]
  }

  /**
   * Nx00Role create
   */
  export type Nx00RoleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00Role.
     */
    data: XOR<Nx00RoleCreateInput, Nx00RoleUncheckedCreateInput>
  }

  /**
   * Nx00Role createMany
   */
  export type Nx00RoleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00Roles.
     */
    data: Nx00RoleCreateManyInput | Nx00RoleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00Role createManyAndReturn
   */
  export type Nx00RoleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00Roles.
     */
    data: Nx00RoleCreateManyInput | Nx00RoleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Role update
   */
  export type Nx00RoleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00Role.
     */
    data: XOR<Nx00RoleUpdateInput, Nx00RoleUncheckedUpdateInput>
    /**
     * Choose, which Nx00Role to update.
     */
    where: Nx00RoleWhereUniqueInput
  }

  /**
   * Nx00Role updateMany
   */
  export type Nx00RoleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00Roles.
     */
    data: XOR<Nx00RoleUpdateManyMutationInput, Nx00RoleUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Roles to update
     */
    where?: Nx00RoleWhereInput
    /**
     * Limit how many Nx00Roles to update.
     */
    limit?: number
  }

  /**
   * Nx00Role updateManyAndReturn
   */
  export type Nx00RoleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * The data used to update Nx00Roles.
     */
    data: XOR<Nx00RoleUpdateManyMutationInput, Nx00RoleUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Roles to update
     */
    where?: Nx00RoleWhereInput
    /**
     * Limit how many Nx00Roles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Role upsert
   */
  export type Nx00RoleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00Role to update in case it exists.
     */
    where: Nx00RoleWhereUniqueInput
    /**
     * In case the Nx00Role found by the `where` argument doesn't exist, create a new Nx00Role with this data.
     */
    create: XOR<Nx00RoleCreateInput, Nx00RoleUncheckedCreateInput>
    /**
     * In case the Nx00Role was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00RoleUpdateInput, Nx00RoleUncheckedUpdateInput>
  }

  /**
   * Nx00Role delete
   */
  export type Nx00RoleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
    /**
     * Filter which Nx00Role to delete.
     */
    where: Nx00RoleWhereUniqueInput
  }

  /**
   * Nx00Role deleteMany
   */
  export type Nx00RoleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Roles to delete
     */
    where?: Nx00RoleWhereInput
    /**
     * Limit how many Nx00Roles to delete.
     */
    limit?: number
  }

  /**
   * Nx00Role.createdByUser
   */
  export type Nx00Role$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Role.updatedByUser
   */
  export type Nx00Role$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Role.userRoles
   */
  export type Nx00Role$userRolesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    where?: Nx00UserRoleWhereInput
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    cursor?: Nx00UserRoleWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00Role without action
   */
  export type Nx00RoleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Role
     */
    select?: Nx00RoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Role
     */
    omit?: Nx00RoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00RoleInclude<ExtArgs> | null
  }


  /**
   * Model Nx00UserRole
   */

  export type AggregateNx00UserRole = {
    _count: Nx00UserRoleCountAggregateOutputType | null
    _min: Nx00UserRoleMinAggregateOutputType | null
    _max: Nx00UserRoleMaxAggregateOutputType | null
  }

  export type Nx00UserRoleMinAggregateOutputType = {
    id: string | null
    userId: string | null
    roleId: string | null
    createdAt: Date | null
    createdBy: string | null
  }

  export type Nx00UserRoleMaxAggregateOutputType = {
    id: string | null
    userId: string | null
    roleId: string | null
    createdAt: Date | null
    createdBy: string | null
  }

  export type Nx00UserRoleCountAggregateOutputType = {
    id: number
    userId: number
    roleId: number
    createdAt: number
    createdBy: number
    _all: number
  }


  export type Nx00UserRoleMinAggregateInputType = {
    id?: true
    userId?: true
    roleId?: true
    createdAt?: true
    createdBy?: true
  }

  export type Nx00UserRoleMaxAggregateInputType = {
    id?: true
    userId?: true
    roleId?: true
    createdAt?: true
    createdBy?: true
  }

  export type Nx00UserRoleCountAggregateInputType = {
    id?: true
    userId?: true
    roleId?: true
    createdAt?: true
    createdBy?: true
    _all?: true
  }

  export type Nx00UserRoleAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00UserRole to aggregate.
     */
    where?: Nx00UserRoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00UserRoles to fetch.
     */
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00UserRoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00UserRoles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00UserRoles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00UserRoles
    **/
    _count?: true | Nx00UserRoleCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00UserRoleMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00UserRoleMaxAggregateInputType
  }

  export type GetNx00UserRoleAggregateType<T extends Nx00UserRoleAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00UserRole]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00UserRole[P]>
      : GetScalarType<T[P], AggregateNx00UserRole[P]>
  }




  export type Nx00UserRoleGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00UserRoleWhereInput
    orderBy?: Nx00UserRoleOrderByWithAggregationInput | Nx00UserRoleOrderByWithAggregationInput[]
    by: Nx00UserRoleScalarFieldEnum[] | Nx00UserRoleScalarFieldEnum
    having?: Nx00UserRoleScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00UserRoleCountAggregateInputType | true
    _min?: Nx00UserRoleMinAggregateInputType
    _max?: Nx00UserRoleMaxAggregateInputType
  }

  export type Nx00UserRoleGroupByOutputType = {
    id: string
    userId: string
    roleId: string
    createdAt: Date
    createdBy: string | null
    _count: Nx00UserRoleCountAggregateOutputType | null
    _min: Nx00UserRoleMinAggregateOutputType | null
    _max: Nx00UserRoleMaxAggregateOutputType | null
  }

  type GetNx00UserRoleGroupByPayload<T extends Nx00UserRoleGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00UserRoleGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00UserRoleGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00UserRoleGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00UserRoleGroupByOutputType[P]>
        }
      >
    >


  export type Nx00UserRoleSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    roleId?: boolean
    createdAt?: boolean
    createdBy?: boolean
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00UserRole"]>

  export type Nx00UserRoleSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    roleId?: boolean
    createdAt?: boolean
    createdBy?: boolean
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00UserRole"]>

  export type Nx00UserRoleSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    roleId?: boolean
    createdAt?: boolean
    createdBy?: boolean
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00UserRole"]>

  export type Nx00UserRoleSelectScalar = {
    id?: boolean
    userId?: boolean
    roleId?: boolean
    createdAt?: boolean
    createdBy?: boolean
  }

  export type Nx00UserRoleOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "roleId" | "createdAt" | "createdBy", ExtArgs["result"]["nx00UserRole"]>
  export type Nx00UserRoleInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }
  export type Nx00UserRoleIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }
  export type Nx00UserRoleIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | Nx00UserDefaultArgs<ExtArgs>
    role?: boolean | Nx00RoleDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00UserRole$createdByUserArgs<ExtArgs>
  }

  export type $Nx00UserRolePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00UserRole"
    objects: {
      user: Prisma.$Nx00UserPayload<ExtArgs>
      role: Prisma.$Nx00RolePayload<ExtArgs>
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: string
      roleId: string
      createdAt: Date
      createdBy: string | null
    }, ExtArgs["result"]["nx00UserRole"]>
    composites: {}
  }

  type Nx00UserRoleGetPayload<S extends boolean | null | undefined | Nx00UserRoleDefaultArgs> = $Result.GetResult<Prisma.$Nx00UserRolePayload, S>

  type Nx00UserRoleCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00UserRoleFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00UserRoleCountAggregateInputType | true
    }

  export interface Nx00UserRoleDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00UserRole'], meta: { name: 'Nx00UserRole' } }
    /**
     * Find zero or one Nx00UserRole that matches the filter.
     * @param {Nx00UserRoleFindUniqueArgs} args - Arguments to find a Nx00UserRole
     * @example
     * // Get one Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00UserRoleFindUniqueArgs>(args: SelectSubset<T, Nx00UserRoleFindUniqueArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00UserRole that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00UserRoleFindUniqueOrThrowArgs} args - Arguments to find a Nx00UserRole
     * @example
     * // Get one Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00UserRoleFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00UserRoleFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00UserRole that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleFindFirstArgs} args - Arguments to find a Nx00UserRole
     * @example
     * // Get one Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00UserRoleFindFirstArgs>(args?: SelectSubset<T, Nx00UserRoleFindFirstArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00UserRole that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleFindFirstOrThrowArgs} args - Arguments to find a Nx00UserRole
     * @example
     * // Get one Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00UserRoleFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00UserRoleFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00UserRoles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00UserRoles
     * const nx00UserRoles = await prisma.nx00UserRole.findMany()
     * 
     * // Get first 10 Nx00UserRoles
     * const nx00UserRoles = await prisma.nx00UserRole.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00UserRoleWithIdOnly = await prisma.nx00UserRole.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00UserRoleFindManyArgs>(args?: SelectSubset<T, Nx00UserRoleFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00UserRole.
     * @param {Nx00UserRoleCreateArgs} args - Arguments to create a Nx00UserRole.
     * @example
     * // Create one Nx00UserRole
     * const Nx00UserRole = await prisma.nx00UserRole.create({
     *   data: {
     *     // ... data to create a Nx00UserRole
     *   }
     * })
     * 
     */
    create<T extends Nx00UserRoleCreateArgs>(args: SelectSubset<T, Nx00UserRoleCreateArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00UserRoles.
     * @param {Nx00UserRoleCreateManyArgs} args - Arguments to create many Nx00UserRoles.
     * @example
     * // Create many Nx00UserRoles
     * const nx00UserRole = await prisma.nx00UserRole.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00UserRoleCreateManyArgs>(args?: SelectSubset<T, Nx00UserRoleCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00UserRoles and returns the data saved in the database.
     * @param {Nx00UserRoleCreateManyAndReturnArgs} args - Arguments to create many Nx00UserRoles.
     * @example
     * // Create many Nx00UserRoles
     * const nx00UserRole = await prisma.nx00UserRole.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00UserRoles and only return the `id`
     * const nx00UserRoleWithIdOnly = await prisma.nx00UserRole.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00UserRoleCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00UserRoleCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00UserRole.
     * @param {Nx00UserRoleDeleteArgs} args - Arguments to delete one Nx00UserRole.
     * @example
     * // Delete one Nx00UserRole
     * const Nx00UserRole = await prisma.nx00UserRole.delete({
     *   where: {
     *     // ... filter to delete one Nx00UserRole
     *   }
     * })
     * 
     */
    delete<T extends Nx00UserRoleDeleteArgs>(args: SelectSubset<T, Nx00UserRoleDeleteArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00UserRole.
     * @param {Nx00UserRoleUpdateArgs} args - Arguments to update one Nx00UserRole.
     * @example
     * // Update one Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00UserRoleUpdateArgs>(args: SelectSubset<T, Nx00UserRoleUpdateArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00UserRoles.
     * @param {Nx00UserRoleDeleteManyArgs} args - Arguments to filter Nx00UserRoles to delete.
     * @example
     * // Delete a few Nx00UserRoles
     * const { count } = await prisma.nx00UserRole.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00UserRoleDeleteManyArgs>(args?: SelectSubset<T, Nx00UserRoleDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00UserRoles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00UserRoles
     * const nx00UserRole = await prisma.nx00UserRole.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00UserRoleUpdateManyArgs>(args: SelectSubset<T, Nx00UserRoleUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00UserRoles and returns the data updated in the database.
     * @param {Nx00UserRoleUpdateManyAndReturnArgs} args - Arguments to update many Nx00UserRoles.
     * @example
     * // Update many Nx00UserRoles
     * const nx00UserRole = await prisma.nx00UserRole.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00UserRoles and only return the `id`
     * const nx00UserRoleWithIdOnly = await prisma.nx00UserRole.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00UserRoleUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00UserRoleUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00UserRole.
     * @param {Nx00UserRoleUpsertArgs} args - Arguments to update or create a Nx00UserRole.
     * @example
     * // Update or create a Nx00UserRole
     * const nx00UserRole = await prisma.nx00UserRole.upsert({
     *   create: {
     *     // ... data to create a Nx00UserRole
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00UserRole we want to update
     *   }
     * })
     */
    upsert<T extends Nx00UserRoleUpsertArgs>(args: SelectSubset<T, Nx00UserRoleUpsertArgs<ExtArgs>>): Prisma__Nx00UserRoleClient<$Result.GetResult<Prisma.$Nx00UserRolePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00UserRoles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleCountArgs} args - Arguments to filter Nx00UserRoles to count.
     * @example
     * // Count the number of Nx00UserRoles
     * const count = await prisma.nx00UserRole.count({
     *   where: {
     *     // ... the filter for the Nx00UserRoles we want to count
     *   }
     * })
    **/
    count<T extends Nx00UserRoleCountArgs>(
      args?: Subset<T, Nx00UserRoleCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00UserRoleCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00UserRole.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00UserRoleAggregateArgs>(args: Subset<T, Nx00UserRoleAggregateArgs>): Prisma.PrismaPromise<GetNx00UserRoleAggregateType<T>>

    /**
     * Group by Nx00UserRole.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00UserRoleGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00UserRoleGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00UserRoleGroupByArgs['orderBy'] }
        : { orderBy?: Nx00UserRoleGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00UserRoleGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00UserRoleGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00UserRole model
   */
  readonly fields: Nx00UserRoleFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00UserRole.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00UserRoleClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends Nx00UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, Nx00UserDefaultArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    role<T extends Nx00RoleDefaultArgs<ExtArgs> = {}>(args?: Subset<T, Nx00RoleDefaultArgs<ExtArgs>>): Prisma__Nx00RoleClient<$Result.GetResult<Prisma.$Nx00RolePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    createdByUser<T extends Nx00UserRole$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00UserRole$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00UserRole model
   */
  interface Nx00UserRoleFieldRefs {
    readonly id: FieldRef<"Nx00UserRole", 'String'>
    readonly userId: FieldRef<"Nx00UserRole", 'String'>
    readonly roleId: FieldRef<"Nx00UserRole", 'String'>
    readonly createdAt: FieldRef<"Nx00UserRole", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00UserRole", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00UserRole findUnique
   */
  export type Nx00UserRoleFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00UserRole to fetch.
     */
    where: Nx00UserRoleWhereUniqueInput
  }

  /**
   * Nx00UserRole findUniqueOrThrow
   */
  export type Nx00UserRoleFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00UserRole to fetch.
     */
    where: Nx00UserRoleWhereUniqueInput
  }

  /**
   * Nx00UserRole findFirst
   */
  export type Nx00UserRoleFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00UserRole to fetch.
     */
    where?: Nx00UserRoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00UserRoles to fetch.
     */
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00UserRoles.
     */
    cursor?: Nx00UserRoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00UserRoles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00UserRoles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00UserRoles.
     */
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00UserRole findFirstOrThrow
   */
  export type Nx00UserRoleFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00UserRole to fetch.
     */
    where?: Nx00UserRoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00UserRoles to fetch.
     */
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00UserRoles.
     */
    cursor?: Nx00UserRoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00UserRoles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00UserRoles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00UserRoles.
     */
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00UserRole findMany
   */
  export type Nx00UserRoleFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter, which Nx00UserRoles to fetch.
     */
    where?: Nx00UserRoleWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00UserRoles to fetch.
     */
    orderBy?: Nx00UserRoleOrderByWithRelationInput | Nx00UserRoleOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00UserRoles.
     */
    cursor?: Nx00UserRoleWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00UserRoles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00UserRoles.
     */
    skip?: number
    distinct?: Nx00UserRoleScalarFieldEnum | Nx00UserRoleScalarFieldEnum[]
  }

  /**
   * Nx00UserRole create
   */
  export type Nx00UserRoleCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00UserRole.
     */
    data: XOR<Nx00UserRoleCreateInput, Nx00UserRoleUncheckedCreateInput>
  }

  /**
   * Nx00UserRole createMany
   */
  export type Nx00UserRoleCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00UserRoles.
     */
    data: Nx00UserRoleCreateManyInput | Nx00UserRoleCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00UserRole createManyAndReturn
   */
  export type Nx00UserRoleCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00UserRoles.
     */
    data: Nx00UserRoleCreateManyInput | Nx00UserRoleCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00UserRole update
   */
  export type Nx00UserRoleUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00UserRole.
     */
    data: XOR<Nx00UserRoleUpdateInput, Nx00UserRoleUncheckedUpdateInput>
    /**
     * Choose, which Nx00UserRole to update.
     */
    where: Nx00UserRoleWhereUniqueInput
  }

  /**
   * Nx00UserRole updateMany
   */
  export type Nx00UserRoleUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00UserRoles.
     */
    data: XOR<Nx00UserRoleUpdateManyMutationInput, Nx00UserRoleUncheckedUpdateManyInput>
    /**
     * Filter which Nx00UserRoles to update
     */
    where?: Nx00UserRoleWhereInput
    /**
     * Limit how many Nx00UserRoles to update.
     */
    limit?: number
  }

  /**
   * Nx00UserRole updateManyAndReturn
   */
  export type Nx00UserRoleUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * The data used to update Nx00UserRoles.
     */
    data: XOR<Nx00UserRoleUpdateManyMutationInput, Nx00UserRoleUncheckedUpdateManyInput>
    /**
     * Filter which Nx00UserRoles to update
     */
    where?: Nx00UserRoleWhereInput
    /**
     * Limit how many Nx00UserRoles to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00UserRole upsert
   */
  export type Nx00UserRoleUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00UserRole to update in case it exists.
     */
    where: Nx00UserRoleWhereUniqueInput
    /**
     * In case the Nx00UserRole found by the `where` argument doesn't exist, create a new Nx00UserRole with this data.
     */
    create: XOR<Nx00UserRoleCreateInput, Nx00UserRoleUncheckedCreateInput>
    /**
     * In case the Nx00UserRole was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00UserRoleUpdateInput, Nx00UserRoleUncheckedUpdateInput>
  }

  /**
   * Nx00UserRole delete
   */
  export type Nx00UserRoleDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
    /**
     * Filter which Nx00UserRole to delete.
     */
    where: Nx00UserRoleWhereUniqueInput
  }

  /**
   * Nx00UserRole deleteMany
   */
  export type Nx00UserRoleDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00UserRoles to delete
     */
    where?: Nx00UserRoleWhereInput
    /**
     * Limit how many Nx00UserRoles to delete.
     */
    limit?: number
  }

  /**
   * Nx00UserRole.createdByUser
   */
  export type Nx00UserRole$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00UserRole without action
   */
  export type Nx00UserRoleDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00UserRole
     */
    select?: Nx00UserRoleSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00UserRole
     */
    omit?: Nx00UserRoleOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserRoleInclude<ExtArgs> | null
  }


  /**
   * Model Nx00Brand
   */

  export type AggregateNx00Brand = {
    _count: Nx00BrandCountAggregateOutputType | null
    _min: Nx00BrandMinAggregateOutputType | null
    _max: Nx00BrandMaxAggregateOutputType | null
  }

  export type Nx00BrandMinAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    nameEn: string | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00BrandMaxAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    nameEn: string | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00BrandCountAggregateOutputType = {
    id: number
    code: number
    name: number
    nameEn: number
    isActive: number
    remark: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00BrandMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    nameEn?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00BrandMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    nameEn?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00BrandCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    nameEn?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00BrandAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Brand to aggregate.
     */
    where?: Nx00BrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Brands to fetch.
     */
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00BrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Brands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Brands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00Brands
    **/
    _count?: true | Nx00BrandCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00BrandMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00BrandMaxAggregateInputType
  }

  export type GetNx00BrandAggregateType<T extends Nx00BrandAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00Brand]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00Brand[P]>
      : GetScalarType<T[P], AggregateNx00Brand[P]>
  }




  export type Nx00BrandGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00BrandWhereInput
    orderBy?: Nx00BrandOrderByWithAggregationInput | Nx00BrandOrderByWithAggregationInput[]
    by: Nx00BrandScalarFieldEnum[] | Nx00BrandScalarFieldEnum
    having?: Nx00BrandScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00BrandCountAggregateInputType | true
    _min?: Nx00BrandMinAggregateInputType
    _max?: Nx00BrandMaxAggregateInputType
  }

  export type Nx00BrandGroupByOutputType = {
    id: string
    code: string
    name: string
    nameEn: string | null
    isActive: boolean
    remark: string | null
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00BrandCountAggregateOutputType | null
    _min: Nx00BrandMinAggregateOutputType | null
    _max: Nx00BrandMaxAggregateOutputType | null
  }

  type GetNx00BrandGroupByPayload<T extends Nx00BrandGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00BrandGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00BrandGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00BrandGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00BrandGroupByOutputType[P]>
        }
      >
    >


  export type Nx00BrandSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    nameEn?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00Brand$partsArgs<ExtArgs>
    _count?: boolean | Nx00BrandCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Brand"]>

  export type Nx00BrandSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    nameEn?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Brand"]>

  export type Nx00BrandSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    nameEn?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Brand"]>

  export type Nx00BrandSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    nameEn?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00BrandOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "name" | "nameEn" | "isActive" | "remark" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00Brand"]>
  export type Nx00BrandInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00Brand$partsArgs<ExtArgs>
    _count?: boolean | Nx00BrandCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type Nx00BrandIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
  }
  export type Nx00BrandIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00Brand$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Brand$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00BrandPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00Brand"
    objects: {
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      parts: Prisma.$Nx00PartPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      name: string
      nameEn: string | null
      isActive: boolean
      remark: string | null
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00Brand"]>
    composites: {}
  }

  type Nx00BrandGetPayload<S extends boolean | null | undefined | Nx00BrandDefaultArgs> = $Result.GetResult<Prisma.$Nx00BrandPayload, S>

  type Nx00BrandCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00BrandFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00BrandCountAggregateInputType | true
    }

  export interface Nx00BrandDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00Brand'], meta: { name: 'Nx00Brand' } }
    /**
     * Find zero or one Nx00Brand that matches the filter.
     * @param {Nx00BrandFindUniqueArgs} args - Arguments to find a Nx00Brand
     * @example
     * // Get one Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00BrandFindUniqueArgs>(args: SelectSubset<T, Nx00BrandFindUniqueArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00Brand that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00BrandFindUniqueOrThrowArgs} args - Arguments to find a Nx00Brand
     * @example
     * // Get one Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00BrandFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00BrandFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Brand that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandFindFirstArgs} args - Arguments to find a Nx00Brand
     * @example
     * // Get one Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00BrandFindFirstArgs>(args?: SelectSubset<T, Nx00BrandFindFirstArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Brand that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandFindFirstOrThrowArgs} args - Arguments to find a Nx00Brand
     * @example
     * // Get one Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00BrandFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00BrandFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00Brands that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00Brands
     * const nx00Brands = await prisma.nx00Brand.findMany()
     * 
     * // Get first 10 Nx00Brands
     * const nx00Brands = await prisma.nx00Brand.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00BrandWithIdOnly = await prisma.nx00Brand.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00BrandFindManyArgs>(args?: SelectSubset<T, Nx00BrandFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00Brand.
     * @param {Nx00BrandCreateArgs} args - Arguments to create a Nx00Brand.
     * @example
     * // Create one Nx00Brand
     * const Nx00Brand = await prisma.nx00Brand.create({
     *   data: {
     *     // ... data to create a Nx00Brand
     *   }
     * })
     * 
     */
    create<T extends Nx00BrandCreateArgs>(args: SelectSubset<T, Nx00BrandCreateArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00Brands.
     * @param {Nx00BrandCreateManyArgs} args - Arguments to create many Nx00Brands.
     * @example
     * // Create many Nx00Brands
     * const nx00Brand = await prisma.nx00Brand.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00BrandCreateManyArgs>(args?: SelectSubset<T, Nx00BrandCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00Brands and returns the data saved in the database.
     * @param {Nx00BrandCreateManyAndReturnArgs} args - Arguments to create many Nx00Brands.
     * @example
     * // Create many Nx00Brands
     * const nx00Brand = await prisma.nx00Brand.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00Brands and only return the `id`
     * const nx00BrandWithIdOnly = await prisma.nx00Brand.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00BrandCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00BrandCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00Brand.
     * @param {Nx00BrandDeleteArgs} args - Arguments to delete one Nx00Brand.
     * @example
     * // Delete one Nx00Brand
     * const Nx00Brand = await prisma.nx00Brand.delete({
     *   where: {
     *     // ... filter to delete one Nx00Brand
     *   }
     * })
     * 
     */
    delete<T extends Nx00BrandDeleteArgs>(args: SelectSubset<T, Nx00BrandDeleteArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00Brand.
     * @param {Nx00BrandUpdateArgs} args - Arguments to update one Nx00Brand.
     * @example
     * // Update one Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00BrandUpdateArgs>(args: SelectSubset<T, Nx00BrandUpdateArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00Brands.
     * @param {Nx00BrandDeleteManyArgs} args - Arguments to filter Nx00Brands to delete.
     * @example
     * // Delete a few Nx00Brands
     * const { count } = await prisma.nx00Brand.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00BrandDeleteManyArgs>(args?: SelectSubset<T, Nx00BrandDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Brands.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00Brands
     * const nx00Brand = await prisma.nx00Brand.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00BrandUpdateManyArgs>(args: SelectSubset<T, Nx00BrandUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Brands and returns the data updated in the database.
     * @param {Nx00BrandUpdateManyAndReturnArgs} args - Arguments to update many Nx00Brands.
     * @example
     * // Update many Nx00Brands
     * const nx00Brand = await prisma.nx00Brand.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00Brands and only return the `id`
     * const nx00BrandWithIdOnly = await prisma.nx00Brand.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00BrandUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00BrandUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00Brand.
     * @param {Nx00BrandUpsertArgs} args - Arguments to update or create a Nx00Brand.
     * @example
     * // Update or create a Nx00Brand
     * const nx00Brand = await prisma.nx00Brand.upsert({
     *   create: {
     *     // ... data to create a Nx00Brand
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00Brand we want to update
     *   }
     * })
     */
    upsert<T extends Nx00BrandUpsertArgs>(args: SelectSubset<T, Nx00BrandUpsertArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00Brands.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandCountArgs} args - Arguments to filter Nx00Brands to count.
     * @example
     * // Count the number of Nx00Brands
     * const count = await prisma.nx00Brand.count({
     *   where: {
     *     // ... the filter for the Nx00Brands we want to count
     *   }
     * })
    **/
    count<T extends Nx00BrandCountArgs>(
      args?: Subset<T, Nx00BrandCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00BrandCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00Brand.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00BrandAggregateArgs>(args: Subset<T, Nx00BrandAggregateArgs>): Prisma.PrismaPromise<GetNx00BrandAggregateType<T>>

    /**
     * Group by Nx00Brand.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00BrandGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00BrandGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00BrandGroupByArgs['orderBy'] }
        : { orderBy?: Nx00BrandGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00BrandGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00BrandGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00Brand model
   */
  readonly fields: Nx00BrandFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00Brand.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00BrandClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdByUser<T extends Nx00Brand$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Brand$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00Brand$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Brand$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    parts<T extends Nx00Brand$partsArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Brand$partsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00Brand model
   */
  interface Nx00BrandFieldRefs {
    readonly id: FieldRef<"Nx00Brand", 'String'>
    readonly code: FieldRef<"Nx00Brand", 'String'>
    readonly name: FieldRef<"Nx00Brand", 'String'>
    readonly nameEn: FieldRef<"Nx00Brand", 'String'>
    readonly isActive: FieldRef<"Nx00Brand", 'Boolean'>
    readonly remark: FieldRef<"Nx00Brand", 'String'>
    readonly createdAt: FieldRef<"Nx00Brand", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00Brand", 'String'>
    readonly updatedAt: FieldRef<"Nx00Brand", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00Brand", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00Brand findUnique
   */
  export type Nx00BrandFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Brand to fetch.
     */
    where: Nx00BrandWhereUniqueInput
  }

  /**
   * Nx00Brand findUniqueOrThrow
   */
  export type Nx00BrandFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Brand to fetch.
     */
    where: Nx00BrandWhereUniqueInput
  }

  /**
   * Nx00Brand findFirst
   */
  export type Nx00BrandFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Brand to fetch.
     */
    where?: Nx00BrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Brands to fetch.
     */
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Brands.
     */
    cursor?: Nx00BrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Brands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Brands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Brands.
     */
    distinct?: Nx00BrandScalarFieldEnum | Nx00BrandScalarFieldEnum[]
  }

  /**
   * Nx00Brand findFirstOrThrow
   */
  export type Nx00BrandFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Brand to fetch.
     */
    where?: Nx00BrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Brands to fetch.
     */
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Brands.
     */
    cursor?: Nx00BrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Brands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Brands.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Brands.
     */
    distinct?: Nx00BrandScalarFieldEnum | Nx00BrandScalarFieldEnum[]
  }

  /**
   * Nx00Brand findMany
   */
  export type Nx00BrandFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Brands to fetch.
     */
    where?: Nx00BrandWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Brands to fetch.
     */
    orderBy?: Nx00BrandOrderByWithRelationInput | Nx00BrandOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00Brands.
     */
    cursor?: Nx00BrandWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Brands from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Brands.
     */
    skip?: number
    distinct?: Nx00BrandScalarFieldEnum | Nx00BrandScalarFieldEnum[]
  }

  /**
   * Nx00Brand create
   */
  export type Nx00BrandCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00Brand.
     */
    data: XOR<Nx00BrandCreateInput, Nx00BrandUncheckedCreateInput>
  }

  /**
   * Nx00Brand createMany
   */
  export type Nx00BrandCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00Brands.
     */
    data: Nx00BrandCreateManyInput | Nx00BrandCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00Brand createManyAndReturn
   */
  export type Nx00BrandCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00Brands.
     */
    data: Nx00BrandCreateManyInput | Nx00BrandCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Brand update
   */
  export type Nx00BrandUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00Brand.
     */
    data: XOR<Nx00BrandUpdateInput, Nx00BrandUncheckedUpdateInput>
    /**
     * Choose, which Nx00Brand to update.
     */
    where: Nx00BrandWhereUniqueInput
  }

  /**
   * Nx00Brand updateMany
   */
  export type Nx00BrandUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00Brands.
     */
    data: XOR<Nx00BrandUpdateManyMutationInput, Nx00BrandUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Brands to update
     */
    where?: Nx00BrandWhereInput
    /**
     * Limit how many Nx00Brands to update.
     */
    limit?: number
  }

  /**
   * Nx00Brand updateManyAndReturn
   */
  export type Nx00BrandUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * The data used to update Nx00Brands.
     */
    data: XOR<Nx00BrandUpdateManyMutationInput, Nx00BrandUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Brands to update
     */
    where?: Nx00BrandWhereInput
    /**
     * Limit how many Nx00Brands to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Brand upsert
   */
  export type Nx00BrandUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00Brand to update in case it exists.
     */
    where: Nx00BrandWhereUniqueInput
    /**
     * In case the Nx00Brand found by the `where` argument doesn't exist, create a new Nx00Brand with this data.
     */
    create: XOR<Nx00BrandCreateInput, Nx00BrandUncheckedCreateInput>
    /**
     * In case the Nx00Brand was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00BrandUpdateInput, Nx00BrandUncheckedUpdateInput>
  }

  /**
   * Nx00Brand delete
   */
  export type Nx00BrandDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
    /**
     * Filter which Nx00Brand to delete.
     */
    where: Nx00BrandWhereUniqueInput
  }

  /**
   * Nx00Brand deleteMany
   */
  export type Nx00BrandDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Brands to delete
     */
    where?: Nx00BrandWhereInput
    /**
     * Limit how many Nx00Brands to delete.
     */
    limit?: number
  }

  /**
   * Nx00Brand.createdByUser
   */
  export type Nx00Brand$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Brand.updatedByUser
   */
  export type Nx00Brand$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Brand.parts
   */
  export type Nx00Brand$partsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    cursor?: Nx00PartWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00Brand without action
   */
  export type Nx00BrandDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Brand
     */
    select?: Nx00BrandSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Brand
     */
    omit?: Nx00BrandOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00BrandInclude<ExtArgs> | null
  }


  /**
   * Model Nx00FunctionGroup
   */

  export type AggregateNx00FunctionGroup = {
    _count: Nx00FunctionGroupCountAggregateOutputType | null
    _avg: Nx00FunctionGroupAvgAggregateOutputType | null
    _sum: Nx00FunctionGroupSumAggregateOutputType | null
    _min: Nx00FunctionGroupMinAggregateOutputType | null
    _max: Nx00FunctionGroupMaxAggregateOutputType | null
  }

  export type Nx00FunctionGroupAvgAggregateOutputType = {
    sortNo: number | null
  }

  export type Nx00FunctionGroupSumAggregateOutputType = {
    sortNo: number | null
  }

  export type Nx00FunctionGroupMinAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    description: string | null
    isActive: boolean | null
    sortNo: number | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00FunctionGroupMaxAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    description: string | null
    isActive: boolean | null
    sortNo: number | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00FunctionGroupCountAggregateOutputType = {
    id: number
    code: number
    name: number
    description: number
    isActive: number
    sortNo: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00FunctionGroupAvgAggregateInputType = {
    sortNo?: true
  }

  export type Nx00FunctionGroupSumAggregateInputType = {
    sortNo?: true
  }

  export type Nx00FunctionGroupMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    sortNo?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00FunctionGroupMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    sortNo?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00FunctionGroupCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    description?: true
    isActive?: true
    sortNo?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00FunctionGroupAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00FunctionGroup to aggregate.
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00FunctionGroups to fetch.
     */
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00FunctionGroupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00FunctionGroups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00FunctionGroups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00FunctionGroups
    **/
    _count?: true | Nx00FunctionGroupCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Nx00FunctionGroupAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Nx00FunctionGroupSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00FunctionGroupMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00FunctionGroupMaxAggregateInputType
  }

  export type GetNx00FunctionGroupAggregateType<T extends Nx00FunctionGroupAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00FunctionGroup]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00FunctionGroup[P]>
      : GetScalarType<T[P], AggregateNx00FunctionGroup[P]>
  }




  export type Nx00FunctionGroupGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00FunctionGroupWhereInput
    orderBy?: Nx00FunctionGroupOrderByWithAggregationInput | Nx00FunctionGroupOrderByWithAggregationInput[]
    by: Nx00FunctionGroupScalarFieldEnum[] | Nx00FunctionGroupScalarFieldEnum
    having?: Nx00FunctionGroupScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00FunctionGroupCountAggregateInputType | true
    _avg?: Nx00FunctionGroupAvgAggregateInputType
    _sum?: Nx00FunctionGroupSumAggregateInputType
    _min?: Nx00FunctionGroupMinAggregateInputType
    _max?: Nx00FunctionGroupMaxAggregateInputType
  }

  export type Nx00FunctionGroupGroupByOutputType = {
    id: string
    code: string
    name: string
    description: string | null
    isActive: boolean
    sortNo: number | null
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00FunctionGroupCountAggregateOutputType | null
    _avg: Nx00FunctionGroupAvgAggregateOutputType | null
    _sum: Nx00FunctionGroupSumAggregateOutputType | null
    _min: Nx00FunctionGroupMinAggregateOutputType | null
    _max: Nx00FunctionGroupMaxAggregateOutputType | null
  }

  type GetNx00FunctionGroupGroupByPayload<T extends Nx00FunctionGroupGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00FunctionGroupGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00FunctionGroupGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00FunctionGroupGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00FunctionGroupGroupByOutputType[P]>
        }
      >
    >


  export type Nx00FunctionGroupSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    sortNo?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00FunctionGroup$partsArgs<ExtArgs>
    _count?: boolean | Nx00FunctionGroupCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nx00FunctionGroup"]>

  export type Nx00FunctionGroupSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    sortNo?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00FunctionGroup"]>

  export type Nx00FunctionGroupSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    sortNo?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00FunctionGroup"]>

  export type Nx00FunctionGroupSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    description?: boolean
    isActive?: boolean
    sortNo?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00FunctionGroupOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "name" | "description" | "isActive" | "sortNo" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00FunctionGroup"]>
  export type Nx00FunctionGroupInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00FunctionGroup$partsArgs<ExtArgs>
    _count?: boolean | Nx00FunctionGroupCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type Nx00FunctionGroupIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
  }
  export type Nx00FunctionGroupIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00FunctionGroup$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00FunctionGroup$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00FunctionGroupPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00FunctionGroup"
    objects: {
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      parts: Prisma.$Nx00PartPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      name: string
      description: string | null
      isActive: boolean
      sortNo: number | null
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00FunctionGroup"]>
    composites: {}
  }

  type Nx00FunctionGroupGetPayload<S extends boolean | null | undefined | Nx00FunctionGroupDefaultArgs> = $Result.GetResult<Prisma.$Nx00FunctionGroupPayload, S>

  type Nx00FunctionGroupCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00FunctionGroupFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00FunctionGroupCountAggregateInputType | true
    }

  export interface Nx00FunctionGroupDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00FunctionGroup'], meta: { name: 'Nx00FunctionGroup' } }
    /**
     * Find zero or one Nx00FunctionGroup that matches the filter.
     * @param {Nx00FunctionGroupFindUniqueArgs} args - Arguments to find a Nx00FunctionGroup
     * @example
     * // Get one Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00FunctionGroupFindUniqueArgs>(args: SelectSubset<T, Nx00FunctionGroupFindUniqueArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00FunctionGroup that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00FunctionGroupFindUniqueOrThrowArgs} args - Arguments to find a Nx00FunctionGroup
     * @example
     * // Get one Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00FunctionGroupFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00FunctionGroupFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00FunctionGroup that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupFindFirstArgs} args - Arguments to find a Nx00FunctionGroup
     * @example
     * // Get one Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00FunctionGroupFindFirstArgs>(args?: SelectSubset<T, Nx00FunctionGroupFindFirstArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00FunctionGroup that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupFindFirstOrThrowArgs} args - Arguments to find a Nx00FunctionGroup
     * @example
     * // Get one Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00FunctionGroupFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00FunctionGroupFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00FunctionGroups that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00FunctionGroups
     * const nx00FunctionGroups = await prisma.nx00FunctionGroup.findMany()
     * 
     * // Get first 10 Nx00FunctionGroups
     * const nx00FunctionGroups = await prisma.nx00FunctionGroup.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00FunctionGroupWithIdOnly = await prisma.nx00FunctionGroup.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00FunctionGroupFindManyArgs>(args?: SelectSubset<T, Nx00FunctionGroupFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00FunctionGroup.
     * @param {Nx00FunctionGroupCreateArgs} args - Arguments to create a Nx00FunctionGroup.
     * @example
     * // Create one Nx00FunctionGroup
     * const Nx00FunctionGroup = await prisma.nx00FunctionGroup.create({
     *   data: {
     *     // ... data to create a Nx00FunctionGroup
     *   }
     * })
     * 
     */
    create<T extends Nx00FunctionGroupCreateArgs>(args: SelectSubset<T, Nx00FunctionGroupCreateArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00FunctionGroups.
     * @param {Nx00FunctionGroupCreateManyArgs} args - Arguments to create many Nx00FunctionGroups.
     * @example
     * // Create many Nx00FunctionGroups
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00FunctionGroupCreateManyArgs>(args?: SelectSubset<T, Nx00FunctionGroupCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00FunctionGroups and returns the data saved in the database.
     * @param {Nx00FunctionGroupCreateManyAndReturnArgs} args - Arguments to create many Nx00FunctionGroups.
     * @example
     * // Create many Nx00FunctionGroups
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00FunctionGroups and only return the `id`
     * const nx00FunctionGroupWithIdOnly = await prisma.nx00FunctionGroup.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00FunctionGroupCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00FunctionGroupCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00FunctionGroup.
     * @param {Nx00FunctionGroupDeleteArgs} args - Arguments to delete one Nx00FunctionGroup.
     * @example
     * // Delete one Nx00FunctionGroup
     * const Nx00FunctionGroup = await prisma.nx00FunctionGroup.delete({
     *   where: {
     *     // ... filter to delete one Nx00FunctionGroup
     *   }
     * })
     * 
     */
    delete<T extends Nx00FunctionGroupDeleteArgs>(args: SelectSubset<T, Nx00FunctionGroupDeleteArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00FunctionGroup.
     * @param {Nx00FunctionGroupUpdateArgs} args - Arguments to update one Nx00FunctionGroup.
     * @example
     * // Update one Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00FunctionGroupUpdateArgs>(args: SelectSubset<T, Nx00FunctionGroupUpdateArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00FunctionGroups.
     * @param {Nx00FunctionGroupDeleteManyArgs} args - Arguments to filter Nx00FunctionGroups to delete.
     * @example
     * // Delete a few Nx00FunctionGroups
     * const { count } = await prisma.nx00FunctionGroup.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00FunctionGroupDeleteManyArgs>(args?: SelectSubset<T, Nx00FunctionGroupDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00FunctionGroups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00FunctionGroups
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00FunctionGroupUpdateManyArgs>(args: SelectSubset<T, Nx00FunctionGroupUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00FunctionGroups and returns the data updated in the database.
     * @param {Nx00FunctionGroupUpdateManyAndReturnArgs} args - Arguments to update many Nx00FunctionGroups.
     * @example
     * // Update many Nx00FunctionGroups
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00FunctionGroups and only return the `id`
     * const nx00FunctionGroupWithIdOnly = await prisma.nx00FunctionGroup.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00FunctionGroupUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00FunctionGroupUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00FunctionGroup.
     * @param {Nx00FunctionGroupUpsertArgs} args - Arguments to update or create a Nx00FunctionGroup.
     * @example
     * // Update or create a Nx00FunctionGroup
     * const nx00FunctionGroup = await prisma.nx00FunctionGroup.upsert({
     *   create: {
     *     // ... data to create a Nx00FunctionGroup
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00FunctionGroup we want to update
     *   }
     * })
     */
    upsert<T extends Nx00FunctionGroupUpsertArgs>(args: SelectSubset<T, Nx00FunctionGroupUpsertArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00FunctionGroups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupCountArgs} args - Arguments to filter Nx00FunctionGroups to count.
     * @example
     * // Count the number of Nx00FunctionGroups
     * const count = await prisma.nx00FunctionGroup.count({
     *   where: {
     *     // ... the filter for the Nx00FunctionGroups we want to count
     *   }
     * })
    **/
    count<T extends Nx00FunctionGroupCountArgs>(
      args?: Subset<T, Nx00FunctionGroupCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00FunctionGroupCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00FunctionGroup.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00FunctionGroupAggregateArgs>(args: Subset<T, Nx00FunctionGroupAggregateArgs>): Prisma.PrismaPromise<GetNx00FunctionGroupAggregateType<T>>

    /**
     * Group by Nx00FunctionGroup.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00FunctionGroupGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00FunctionGroupGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00FunctionGroupGroupByArgs['orderBy'] }
        : { orderBy?: Nx00FunctionGroupGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00FunctionGroupGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00FunctionGroupGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00FunctionGroup model
   */
  readonly fields: Nx00FunctionGroupFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00FunctionGroup.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00FunctionGroupClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdByUser<T extends Nx00FunctionGroup$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00FunctionGroup$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00FunctionGroup$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00FunctionGroup$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    parts<T extends Nx00FunctionGroup$partsArgs<ExtArgs> = {}>(args?: Subset<T, Nx00FunctionGroup$partsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00FunctionGroup model
   */
  interface Nx00FunctionGroupFieldRefs {
    readonly id: FieldRef<"Nx00FunctionGroup", 'String'>
    readonly code: FieldRef<"Nx00FunctionGroup", 'String'>
    readonly name: FieldRef<"Nx00FunctionGroup", 'String'>
    readonly description: FieldRef<"Nx00FunctionGroup", 'String'>
    readonly isActive: FieldRef<"Nx00FunctionGroup", 'Boolean'>
    readonly sortNo: FieldRef<"Nx00FunctionGroup", 'Int'>
    readonly createdAt: FieldRef<"Nx00FunctionGroup", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00FunctionGroup", 'String'>
    readonly updatedAt: FieldRef<"Nx00FunctionGroup", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00FunctionGroup", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00FunctionGroup findUnique
   */
  export type Nx00FunctionGroupFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter, which Nx00FunctionGroup to fetch.
     */
    where: Nx00FunctionGroupWhereUniqueInput
  }

  /**
   * Nx00FunctionGroup findUniqueOrThrow
   */
  export type Nx00FunctionGroupFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter, which Nx00FunctionGroup to fetch.
     */
    where: Nx00FunctionGroupWhereUniqueInput
  }

  /**
   * Nx00FunctionGroup findFirst
   */
  export type Nx00FunctionGroupFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter, which Nx00FunctionGroup to fetch.
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00FunctionGroups to fetch.
     */
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00FunctionGroups.
     */
    cursor?: Nx00FunctionGroupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00FunctionGroups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00FunctionGroups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00FunctionGroups.
     */
    distinct?: Nx00FunctionGroupScalarFieldEnum | Nx00FunctionGroupScalarFieldEnum[]
  }

  /**
   * Nx00FunctionGroup findFirstOrThrow
   */
  export type Nx00FunctionGroupFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter, which Nx00FunctionGroup to fetch.
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00FunctionGroups to fetch.
     */
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00FunctionGroups.
     */
    cursor?: Nx00FunctionGroupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00FunctionGroups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00FunctionGroups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00FunctionGroups.
     */
    distinct?: Nx00FunctionGroupScalarFieldEnum | Nx00FunctionGroupScalarFieldEnum[]
  }

  /**
   * Nx00FunctionGroup findMany
   */
  export type Nx00FunctionGroupFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter, which Nx00FunctionGroups to fetch.
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00FunctionGroups to fetch.
     */
    orderBy?: Nx00FunctionGroupOrderByWithRelationInput | Nx00FunctionGroupOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00FunctionGroups.
     */
    cursor?: Nx00FunctionGroupWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00FunctionGroups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00FunctionGroups.
     */
    skip?: number
    distinct?: Nx00FunctionGroupScalarFieldEnum | Nx00FunctionGroupScalarFieldEnum[]
  }

  /**
   * Nx00FunctionGroup create
   */
  export type Nx00FunctionGroupCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00FunctionGroup.
     */
    data: XOR<Nx00FunctionGroupCreateInput, Nx00FunctionGroupUncheckedCreateInput>
  }

  /**
   * Nx00FunctionGroup createMany
   */
  export type Nx00FunctionGroupCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00FunctionGroups.
     */
    data: Nx00FunctionGroupCreateManyInput | Nx00FunctionGroupCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00FunctionGroup createManyAndReturn
   */
  export type Nx00FunctionGroupCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00FunctionGroups.
     */
    data: Nx00FunctionGroupCreateManyInput | Nx00FunctionGroupCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00FunctionGroup update
   */
  export type Nx00FunctionGroupUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00FunctionGroup.
     */
    data: XOR<Nx00FunctionGroupUpdateInput, Nx00FunctionGroupUncheckedUpdateInput>
    /**
     * Choose, which Nx00FunctionGroup to update.
     */
    where: Nx00FunctionGroupWhereUniqueInput
  }

  /**
   * Nx00FunctionGroup updateMany
   */
  export type Nx00FunctionGroupUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00FunctionGroups.
     */
    data: XOR<Nx00FunctionGroupUpdateManyMutationInput, Nx00FunctionGroupUncheckedUpdateManyInput>
    /**
     * Filter which Nx00FunctionGroups to update
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * Limit how many Nx00FunctionGroups to update.
     */
    limit?: number
  }

  /**
   * Nx00FunctionGroup updateManyAndReturn
   */
  export type Nx00FunctionGroupUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * The data used to update Nx00FunctionGroups.
     */
    data: XOR<Nx00FunctionGroupUpdateManyMutationInput, Nx00FunctionGroupUncheckedUpdateManyInput>
    /**
     * Filter which Nx00FunctionGroups to update
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * Limit how many Nx00FunctionGroups to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00FunctionGroup upsert
   */
  export type Nx00FunctionGroupUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00FunctionGroup to update in case it exists.
     */
    where: Nx00FunctionGroupWhereUniqueInput
    /**
     * In case the Nx00FunctionGroup found by the `where` argument doesn't exist, create a new Nx00FunctionGroup with this data.
     */
    create: XOR<Nx00FunctionGroupCreateInput, Nx00FunctionGroupUncheckedCreateInput>
    /**
     * In case the Nx00FunctionGroup was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00FunctionGroupUpdateInput, Nx00FunctionGroupUncheckedUpdateInput>
  }

  /**
   * Nx00FunctionGroup delete
   */
  export type Nx00FunctionGroupDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    /**
     * Filter which Nx00FunctionGroup to delete.
     */
    where: Nx00FunctionGroupWhereUniqueInput
  }

  /**
   * Nx00FunctionGroup deleteMany
   */
  export type Nx00FunctionGroupDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00FunctionGroups to delete
     */
    where?: Nx00FunctionGroupWhereInput
    /**
     * Limit how many Nx00FunctionGroups to delete.
     */
    limit?: number
  }

  /**
   * Nx00FunctionGroup.createdByUser
   */
  export type Nx00FunctionGroup$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00FunctionGroup.updatedByUser
   */
  export type Nx00FunctionGroup$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00FunctionGroup.parts
   */
  export type Nx00FunctionGroup$partsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    cursor?: Nx00PartWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00FunctionGroup without action
   */
  export type Nx00FunctionGroupDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
  }


  /**
   * Model Nx00PartStatus
   */

  export type AggregateNx00PartStatus = {
    _count: Nx00PartStatusCountAggregateOutputType | null
    _min: Nx00PartStatusMinAggregateOutputType | null
    _max: Nx00PartStatusMaxAggregateOutputType | null
  }

  export type Nx00PartStatusMinAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    canSell: boolean | null
    canPurchase: boolean | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00PartStatusMaxAggregateOutputType = {
    id: string | null
    code: string | null
    name: string | null
    canSell: boolean | null
    canPurchase: boolean | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00PartStatusCountAggregateOutputType = {
    id: number
    code: number
    name: number
    canSell: number
    canPurchase: number
    isActive: number
    remark: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00PartStatusMinAggregateInputType = {
    id?: true
    code?: true
    name?: true
    canSell?: true
    canPurchase?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00PartStatusMaxAggregateInputType = {
    id?: true
    code?: true
    name?: true
    canSell?: true
    canPurchase?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00PartStatusCountAggregateInputType = {
    id?: true
    code?: true
    name?: true
    canSell?: true
    canPurchase?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00PartStatusAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00PartStatus to aggregate.
     */
    where?: Nx00PartStatusWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00PartStatuses to fetch.
     */
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00PartStatusWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00PartStatuses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00PartStatuses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00PartStatuses
    **/
    _count?: true | Nx00PartStatusCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00PartStatusMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00PartStatusMaxAggregateInputType
  }

  export type GetNx00PartStatusAggregateType<T extends Nx00PartStatusAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00PartStatus]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00PartStatus[P]>
      : GetScalarType<T[P], AggregateNx00PartStatus[P]>
  }




  export type Nx00PartStatusGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartStatusWhereInput
    orderBy?: Nx00PartStatusOrderByWithAggregationInput | Nx00PartStatusOrderByWithAggregationInput[]
    by: Nx00PartStatusScalarFieldEnum[] | Nx00PartStatusScalarFieldEnum
    having?: Nx00PartStatusScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00PartStatusCountAggregateInputType | true
    _min?: Nx00PartStatusMinAggregateInputType
    _max?: Nx00PartStatusMaxAggregateInputType
  }

  export type Nx00PartStatusGroupByOutputType = {
    id: string
    code: string
    name: string
    canSell: boolean
    canPurchase: boolean
    isActive: boolean
    remark: string | null
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00PartStatusCountAggregateOutputType | null
    _min: Nx00PartStatusMinAggregateOutputType | null
    _max: Nx00PartStatusMaxAggregateOutputType | null
  }

  type GetNx00PartStatusGroupByPayload<T extends Nx00PartStatusGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00PartStatusGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00PartStatusGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00PartStatusGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00PartStatusGroupByOutputType[P]>
        }
      >
    >


  export type Nx00PartStatusSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00PartStatus$partsArgs<ExtArgs>
    _count?: boolean | Nx00PartStatusCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["nx00PartStatus"]>

  export type Nx00PartStatusSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00PartStatus"]>

  export type Nx00PartStatusSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    code?: boolean
    name?: boolean
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00PartStatus"]>

  export type Nx00PartStatusSelectScalar = {
    id?: boolean
    code?: boolean
    name?: boolean
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00PartStatusOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "code" | "name" | "canSell" | "canPurchase" | "isActive" | "remark" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00PartStatus"]>
  export type Nx00PartStatusInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
    parts?: boolean | Nx00PartStatus$partsArgs<ExtArgs>
    _count?: boolean | Nx00PartStatusCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type Nx00PartStatusIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
  }
  export type Nx00PartStatusIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    createdByUser?: boolean | Nx00PartStatus$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00PartStatus$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00PartStatusPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00PartStatus"
    objects: {
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      parts: Prisma.$Nx00PartPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      code: string
      name: string
      canSell: boolean
      canPurchase: boolean
      isActive: boolean
      remark: string | null
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00PartStatus"]>
    composites: {}
  }

  type Nx00PartStatusGetPayload<S extends boolean | null | undefined | Nx00PartStatusDefaultArgs> = $Result.GetResult<Prisma.$Nx00PartStatusPayload, S>

  type Nx00PartStatusCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00PartStatusFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00PartStatusCountAggregateInputType | true
    }

  export interface Nx00PartStatusDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00PartStatus'], meta: { name: 'Nx00PartStatus' } }
    /**
     * Find zero or one Nx00PartStatus that matches the filter.
     * @param {Nx00PartStatusFindUniqueArgs} args - Arguments to find a Nx00PartStatus
     * @example
     * // Get one Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00PartStatusFindUniqueArgs>(args: SelectSubset<T, Nx00PartStatusFindUniqueArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00PartStatus that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00PartStatusFindUniqueOrThrowArgs} args - Arguments to find a Nx00PartStatus
     * @example
     * // Get one Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00PartStatusFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00PartStatusFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00PartStatus that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusFindFirstArgs} args - Arguments to find a Nx00PartStatus
     * @example
     * // Get one Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00PartStatusFindFirstArgs>(args?: SelectSubset<T, Nx00PartStatusFindFirstArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00PartStatus that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusFindFirstOrThrowArgs} args - Arguments to find a Nx00PartStatus
     * @example
     * // Get one Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00PartStatusFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00PartStatusFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00PartStatuses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00PartStatuses
     * const nx00PartStatuses = await prisma.nx00PartStatus.findMany()
     * 
     * // Get first 10 Nx00PartStatuses
     * const nx00PartStatuses = await prisma.nx00PartStatus.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00PartStatusWithIdOnly = await prisma.nx00PartStatus.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00PartStatusFindManyArgs>(args?: SelectSubset<T, Nx00PartStatusFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00PartStatus.
     * @param {Nx00PartStatusCreateArgs} args - Arguments to create a Nx00PartStatus.
     * @example
     * // Create one Nx00PartStatus
     * const Nx00PartStatus = await prisma.nx00PartStatus.create({
     *   data: {
     *     // ... data to create a Nx00PartStatus
     *   }
     * })
     * 
     */
    create<T extends Nx00PartStatusCreateArgs>(args: SelectSubset<T, Nx00PartStatusCreateArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00PartStatuses.
     * @param {Nx00PartStatusCreateManyArgs} args - Arguments to create many Nx00PartStatuses.
     * @example
     * // Create many Nx00PartStatuses
     * const nx00PartStatus = await prisma.nx00PartStatus.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00PartStatusCreateManyArgs>(args?: SelectSubset<T, Nx00PartStatusCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00PartStatuses and returns the data saved in the database.
     * @param {Nx00PartStatusCreateManyAndReturnArgs} args - Arguments to create many Nx00PartStatuses.
     * @example
     * // Create many Nx00PartStatuses
     * const nx00PartStatus = await prisma.nx00PartStatus.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00PartStatuses and only return the `id`
     * const nx00PartStatusWithIdOnly = await prisma.nx00PartStatus.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00PartStatusCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00PartStatusCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00PartStatus.
     * @param {Nx00PartStatusDeleteArgs} args - Arguments to delete one Nx00PartStatus.
     * @example
     * // Delete one Nx00PartStatus
     * const Nx00PartStatus = await prisma.nx00PartStatus.delete({
     *   where: {
     *     // ... filter to delete one Nx00PartStatus
     *   }
     * })
     * 
     */
    delete<T extends Nx00PartStatusDeleteArgs>(args: SelectSubset<T, Nx00PartStatusDeleteArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00PartStatus.
     * @param {Nx00PartStatusUpdateArgs} args - Arguments to update one Nx00PartStatus.
     * @example
     * // Update one Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00PartStatusUpdateArgs>(args: SelectSubset<T, Nx00PartStatusUpdateArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00PartStatuses.
     * @param {Nx00PartStatusDeleteManyArgs} args - Arguments to filter Nx00PartStatuses to delete.
     * @example
     * // Delete a few Nx00PartStatuses
     * const { count } = await prisma.nx00PartStatus.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00PartStatusDeleteManyArgs>(args?: SelectSubset<T, Nx00PartStatusDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00PartStatuses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00PartStatuses
     * const nx00PartStatus = await prisma.nx00PartStatus.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00PartStatusUpdateManyArgs>(args: SelectSubset<T, Nx00PartStatusUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00PartStatuses and returns the data updated in the database.
     * @param {Nx00PartStatusUpdateManyAndReturnArgs} args - Arguments to update many Nx00PartStatuses.
     * @example
     * // Update many Nx00PartStatuses
     * const nx00PartStatus = await prisma.nx00PartStatus.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00PartStatuses and only return the `id`
     * const nx00PartStatusWithIdOnly = await prisma.nx00PartStatus.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00PartStatusUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00PartStatusUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00PartStatus.
     * @param {Nx00PartStatusUpsertArgs} args - Arguments to update or create a Nx00PartStatus.
     * @example
     * // Update or create a Nx00PartStatus
     * const nx00PartStatus = await prisma.nx00PartStatus.upsert({
     *   create: {
     *     // ... data to create a Nx00PartStatus
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00PartStatus we want to update
     *   }
     * })
     */
    upsert<T extends Nx00PartStatusUpsertArgs>(args: SelectSubset<T, Nx00PartStatusUpsertArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00PartStatuses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusCountArgs} args - Arguments to filter Nx00PartStatuses to count.
     * @example
     * // Count the number of Nx00PartStatuses
     * const count = await prisma.nx00PartStatus.count({
     *   where: {
     *     // ... the filter for the Nx00PartStatuses we want to count
     *   }
     * })
    **/
    count<T extends Nx00PartStatusCountArgs>(
      args?: Subset<T, Nx00PartStatusCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00PartStatusCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00PartStatus.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00PartStatusAggregateArgs>(args: Subset<T, Nx00PartStatusAggregateArgs>): Prisma.PrismaPromise<GetNx00PartStatusAggregateType<T>>

    /**
     * Group by Nx00PartStatus.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartStatusGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00PartStatusGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00PartStatusGroupByArgs['orderBy'] }
        : { orderBy?: Nx00PartStatusGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00PartStatusGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00PartStatusGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00PartStatus model
   */
  readonly fields: Nx00PartStatusFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00PartStatus.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00PartStatusClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    createdByUser<T extends Nx00PartStatus$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00PartStatus$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00PartStatus$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00PartStatus$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    parts<T extends Nx00PartStatus$partsArgs<ExtArgs> = {}>(args?: Subset<T, Nx00PartStatus$partsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00PartStatus model
   */
  interface Nx00PartStatusFieldRefs {
    readonly id: FieldRef<"Nx00PartStatus", 'String'>
    readonly code: FieldRef<"Nx00PartStatus", 'String'>
    readonly name: FieldRef<"Nx00PartStatus", 'String'>
    readonly canSell: FieldRef<"Nx00PartStatus", 'Boolean'>
    readonly canPurchase: FieldRef<"Nx00PartStatus", 'Boolean'>
    readonly isActive: FieldRef<"Nx00PartStatus", 'Boolean'>
    readonly remark: FieldRef<"Nx00PartStatus", 'String'>
    readonly createdAt: FieldRef<"Nx00PartStatus", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00PartStatus", 'String'>
    readonly updatedAt: FieldRef<"Nx00PartStatus", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00PartStatus", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00PartStatus findUnique
   */
  export type Nx00PartStatusFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter, which Nx00PartStatus to fetch.
     */
    where: Nx00PartStatusWhereUniqueInput
  }

  /**
   * Nx00PartStatus findUniqueOrThrow
   */
  export type Nx00PartStatusFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter, which Nx00PartStatus to fetch.
     */
    where: Nx00PartStatusWhereUniqueInput
  }

  /**
   * Nx00PartStatus findFirst
   */
  export type Nx00PartStatusFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter, which Nx00PartStatus to fetch.
     */
    where?: Nx00PartStatusWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00PartStatuses to fetch.
     */
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00PartStatuses.
     */
    cursor?: Nx00PartStatusWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00PartStatuses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00PartStatuses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00PartStatuses.
     */
    distinct?: Nx00PartStatusScalarFieldEnum | Nx00PartStatusScalarFieldEnum[]
  }

  /**
   * Nx00PartStatus findFirstOrThrow
   */
  export type Nx00PartStatusFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter, which Nx00PartStatus to fetch.
     */
    where?: Nx00PartStatusWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00PartStatuses to fetch.
     */
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00PartStatuses.
     */
    cursor?: Nx00PartStatusWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00PartStatuses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00PartStatuses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00PartStatuses.
     */
    distinct?: Nx00PartStatusScalarFieldEnum | Nx00PartStatusScalarFieldEnum[]
  }

  /**
   * Nx00PartStatus findMany
   */
  export type Nx00PartStatusFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter, which Nx00PartStatuses to fetch.
     */
    where?: Nx00PartStatusWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00PartStatuses to fetch.
     */
    orderBy?: Nx00PartStatusOrderByWithRelationInput | Nx00PartStatusOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00PartStatuses.
     */
    cursor?: Nx00PartStatusWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00PartStatuses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00PartStatuses.
     */
    skip?: number
    distinct?: Nx00PartStatusScalarFieldEnum | Nx00PartStatusScalarFieldEnum[]
  }

  /**
   * Nx00PartStatus create
   */
  export type Nx00PartStatusCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00PartStatus.
     */
    data: XOR<Nx00PartStatusCreateInput, Nx00PartStatusUncheckedCreateInput>
  }

  /**
   * Nx00PartStatus createMany
   */
  export type Nx00PartStatusCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00PartStatuses.
     */
    data: Nx00PartStatusCreateManyInput | Nx00PartStatusCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00PartStatus createManyAndReturn
   */
  export type Nx00PartStatusCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00PartStatuses.
     */
    data: Nx00PartStatusCreateManyInput | Nx00PartStatusCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00PartStatus update
   */
  export type Nx00PartStatusUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00PartStatus.
     */
    data: XOR<Nx00PartStatusUpdateInput, Nx00PartStatusUncheckedUpdateInput>
    /**
     * Choose, which Nx00PartStatus to update.
     */
    where: Nx00PartStatusWhereUniqueInput
  }

  /**
   * Nx00PartStatus updateMany
   */
  export type Nx00PartStatusUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00PartStatuses.
     */
    data: XOR<Nx00PartStatusUpdateManyMutationInput, Nx00PartStatusUncheckedUpdateManyInput>
    /**
     * Filter which Nx00PartStatuses to update
     */
    where?: Nx00PartStatusWhereInput
    /**
     * Limit how many Nx00PartStatuses to update.
     */
    limit?: number
  }

  /**
   * Nx00PartStatus updateManyAndReturn
   */
  export type Nx00PartStatusUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * The data used to update Nx00PartStatuses.
     */
    data: XOR<Nx00PartStatusUpdateManyMutationInput, Nx00PartStatusUncheckedUpdateManyInput>
    /**
     * Filter which Nx00PartStatuses to update
     */
    where?: Nx00PartStatusWhereInput
    /**
     * Limit how many Nx00PartStatuses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00PartStatus upsert
   */
  export type Nx00PartStatusUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00PartStatus to update in case it exists.
     */
    where: Nx00PartStatusWhereUniqueInput
    /**
     * In case the Nx00PartStatus found by the `where` argument doesn't exist, create a new Nx00PartStatus with this data.
     */
    create: XOR<Nx00PartStatusCreateInput, Nx00PartStatusUncheckedCreateInput>
    /**
     * In case the Nx00PartStatus was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00PartStatusUpdateInput, Nx00PartStatusUncheckedUpdateInput>
  }

  /**
   * Nx00PartStatus delete
   */
  export type Nx00PartStatusDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
    /**
     * Filter which Nx00PartStatus to delete.
     */
    where: Nx00PartStatusWhereUniqueInput
  }

  /**
   * Nx00PartStatus deleteMany
   */
  export type Nx00PartStatusDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00PartStatuses to delete
     */
    where?: Nx00PartStatusWhereInput
    /**
     * Limit how many Nx00PartStatuses to delete.
     */
    limit?: number
  }

  /**
   * Nx00PartStatus.createdByUser
   */
  export type Nx00PartStatus$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00PartStatus.updatedByUser
   */
  export type Nx00PartStatus$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00PartStatus.parts
   */
  export type Nx00PartStatus$partsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    cursor?: Nx00PartWhereUniqueInput
    take?: number
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00PartStatus without action
   */
  export type Nx00PartStatusDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00PartStatus
     */
    select?: Nx00PartStatusSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00PartStatus
     */
    omit?: Nx00PartStatusOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartStatusInclude<ExtArgs> | null
  }


  /**
   * Model Nx00Part
   */

  export type AggregateNx00Part = {
    _count: Nx00PartCountAggregateOutputType | null
    _min: Nx00PartMinAggregateOutputType | null
    _max: Nx00PartMaxAggregateOutputType | null
  }

  export type Nx00PartMinAggregateOutputType = {
    id: string | null
    partNo: string | null
    oldPartNo: string | null
    displayNo: string | null
    nameZh: string | null
    nameEn: string | null
    brandId: string | null
    functionGroupId: string | null
    statusId: string | null
    barcode: string | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00PartMaxAggregateOutputType = {
    id: string | null
    partNo: string | null
    oldPartNo: string | null
    displayNo: string | null
    nameZh: string | null
    nameEn: string | null
    brandId: string | null
    functionGroupId: string | null
    statusId: string | null
    barcode: string | null
    isActive: boolean | null
    remark: string | null
    createdAt: Date | null
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
  }

  export type Nx00PartCountAggregateOutputType = {
    id: number
    partNo: number
    oldPartNo: number
    displayNo: number
    nameZh: number
    nameEn: number
    brandId: number
    functionGroupId: number
    statusId: number
    barcode: number
    isActive: number
    remark: number
    createdAt: number
    createdBy: number
    updatedAt: number
    updatedBy: number
    _all: number
  }


  export type Nx00PartMinAggregateInputType = {
    id?: true
    partNo?: true
    oldPartNo?: true
    displayNo?: true
    nameZh?: true
    nameEn?: true
    brandId?: true
    functionGroupId?: true
    statusId?: true
    barcode?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00PartMaxAggregateInputType = {
    id?: true
    partNo?: true
    oldPartNo?: true
    displayNo?: true
    nameZh?: true
    nameEn?: true
    brandId?: true
    functionGroupId?: true
    statusId?: true
    barcode?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
  }

  export type Nx00PartCountAggregateInputType = {
    id?: true
    partNo?: true
    oldPartNo?: true
    displayNo?: true
    nameZh?: true
    nameEn?: true
    brandId?: true
    functionGroupId?: true
    statusId?: true
    barcode?: true
    isActive?: true
    remark?: true
    createdAt?: true
    createdBy?: true
    updatedAt?: true
    updatedBy?: true
    _all?: true
  }

  export type Nx00PartAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Part to aggregate.
     */
    where?: Nx00PartWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Parts to fetch.
     */
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: Nx00PartWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Parts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Parts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Nx00Parts
    **/
    _count?: true | Nx00PartCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Nx00PartMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Nx00PartMaxAggregateInputType
  }

  export type GetNx00PartAggregateType<T extends Nx00PartAggregateArgs> = {
        [P in keyof T & keyof AggregateNx00Part]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateNx00Part[P]>
      : GetScalarType<T[P], AggregateNx00Part[P]>
  }




  export type Nx00PartGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: Nx00PartWhereInput
    orderBy?: Nx00PartOrderByWithAggregationInput | Nx00PartOrderByWithAggregationInput[]
    by: Nx00PartScalarFieldEnum[] | Nx00PartScalarFieldEnum
    having?: Nx00PartScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Nx00PartCountAggregateInputType | true
    _min?: Nx00PartMinAggregateInputType
    _max?: Nx00PartMaxAggregateInputType
  }

  export type Nx00PartGroupByOutputType = {
    id: string
    partNo: string
    oldPartNo: string | null
    displayNo: string | null
    nameZh: string
    nameEn: string | null
    brandId: string
    functionGroupId: string | null
    statusId: string
    barcode: string | null
    isActive: boolean
    remark: string | null
    createdAt: Date
    createdBy: string | null
    updatedAt: Date | null
    updatedBy: string | null
    _count: Nx00PartCountAggregateOutputType | null
    _min: Nx00PartMinAggregateOutputType | null
    _max: Nx00PartMaxAggregateOutputType | null
  }

  type GetNx00PartGroupByPayload<T extends Nx00PartGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Nx00PartGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Nx00PartGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Nx00PartGroupByOutputType[P]>
            : GetScalarType<T[P], Nx00PartGroupByOutputType[P]>
        }
      >
    >


  export type Nx00PartSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    partNo?: boolean
    oldPartNo?: boolean
    displayNo?: boolean
    nameZh?: boolean
    nameEn?: boolean
    brandId?: boolean
    functionGroupId?: boolean
    statusId?: boolean
    barcode?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Part"]>

  export type Nx00PartSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    partNo?: boolean
    oldPartNo?: boolean
    displayNo?: boolean
    nameZh?: boolean
    nameEn?: boolean
    brandId?: boolean
    functionGroupId?: boolean
    statusId?: boolean
    barcode?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Part"]>

  export type Nx00PartSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    partNo?: boolean
    oldPartNo?: boolean
    displayNo?: boolean
    nameZh?: boolean
    nameEn?: boolean
    brandId?: boolean
    functionGroupId?: boolean
    statusId?: boolean
    barcode?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }, ExtArgs["result"]["nx00Part"]>

  export type Nx00PartSelectScalar = {
    id?: boolean
    partNo?: boolean
    oldPartNo?: boolean
    displayNo?: boolean
    nameZh?: boolean
    nameEn?: boolean
    brandId?: boolean
    functionGroupId?: boolean
    statusId?: boolean
    barcode?: boolean
    isActive?: boolean
    remark?: boolean
    createdAt?: boolean
    createdBy?: boolean
    updatedAt?: boolean
    updatedBy?: boolean
  }

  export type Nx00PartOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "partNo" | "oldPartNo" | "displayNo" | "nameZh" | "nameEn" | "brandId" | "functionGroupId" | "statusId" | "barcode" | "isActive" | "remark" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy", ExtArgs["result"]["nx00Part"]>
  export type Nx00PartInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }
  export type Nx00PartIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }
  export type Nx00PartIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    brand?: boolean | Nx00BrandDefaultArgs<ExtArgs>
    functionGroup?: boolean | Nx00Part$functionGroupArgs<ExtArgs>
    status?: boolean | Nx00PartStatusDefaultArgs<ExtArgs>
    createdByUser?: boolean | Nx00Part$createdByUserArgs<ExtArgs>
    updatedByUser?: boolean | Nx00Part$updatedByUserArgs<ExtArgs>
  }

  export type $Nx00PartPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Nx00Part"
    objects: {
      brand: Prisma.$Nx00BrandPayload<ExtArgs>
      functionGroup: Prisma.$Nx00FunctionGroupPayload<ExtArgs> | null
      status: Prisma.$Nx00PartStatusPayload<ExtArgs>
      createdByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
      updatedByUser: Prisma.$Nx00UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      partNo: string
      oldPartNo: string | null
      displayNo: string | null
      nameZh: string
      nameEn: string | null
      brandId: string
      functionGroupId: string | null
      statusId: string
      barcode: string | null
      isActive: boolean
      remark: string | null
      createdAt: Date
      createdBy: string | null
      updatedAt: Date | null
      updatedBy: string | null
    }, ExtArgs["result"]["nx00Part"]>
    composites: {}
  }

  type Nx00PartGetPayload<S extends boolean | null | undefined | Nx00PartDefaultArgs> = $Result.GetResult<Prisma.$Nx00PartPayload, S>

  type Nx00PartCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<Nx00PartFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Nx00PartCountAggregateInputType | true
    }

  export interface Nx00PartDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Nx00Part'], meta: { name: 'Nx00Part' } }
    /**
     * Find zero or one Nx00Part that matches the filter.
     * @param {Nx00PartFindUniqueArgs} args - Arguments to find a Nx00Part
     * @example
     * // Get one Nx00Part
     * const nx00Part = await prisma.nx00Part.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends Nx00PartFindUniqueArgs>(args: SelectSubset<T, Nx00PartFindUniqueArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Nx00Part that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {Nx00PartFindUniqueOrThrowArgs} args - Arguments to find a Nx00Part
     * @example
     * // Get one Nx00Part
     * const nx00Part = await prisma.nx00Part.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends Nx00PartFindUniqueOrThrowArgs>(args: SelectSubset<T, Nx00PartFindUniqueOrThrowArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Part that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartFindFirstArgs} args - Arguments to find a Nx00Part
     * @example
     * // Get one Nx00Part
     * const nx00Part = await prisma.nx00Part.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends Nx00PartFindFirstArgs>(args?: SelectSubset<T, Nx00PartFindFirstArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Nx00Part that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartFindFirstOrThrowArgs} args - Arguments to find a Nx00Part
     * @example
     * // Get one Nx00Part
     * const nx00Part = await prisma.nx00Part.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends Nx00PartFindFirstOrThrowArgs>(args?: SelectSubset<T, Nx00PartFindFirstOrThrowArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Nx00Parts that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Nx00Parts
     * const nx00Parts = await prisma.nx00Part.findMany()
     * 
     * // Get first 10 Nx00Parts
     * const nx00Parts = await prisma.nx00Part.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const nx00PartWithIdOnly = await prisma.nx00Part.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends Nx00PartFindManyArgs>(args?: SelectSubset<T, Nx00PartFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Nx00Part.
     * @param {Nx00PartCreateArgs} args - Arguments to create a Nx00Part.
     * @example
     * // Create one Nx00Part
     * const Nx00Part = await prisma.nx00Part.create({
     *   data: {
     *     // ... data to create a Nx00Part
     *   }
     * })
     * 
     */
    create<T extends Nx00PartCreateArgs>(args: SelectSubset<T, Nx00PartCreateArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Nx00Parts.
     * @param {Nx00PartCreateManyArgs} args - Arguments to create many Nx00Parts.
     * @example
     * // Create many Nx00Parts
     * const nx00Part = await prisma.nx00Part.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends Nx00PartCreateManyArgs>(args?: SelectSubset<T, Nx00PartCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Nx00Parts and returns the data saved in the database.
     * @param {Nx00PartCreateManyAndReturnArgs} args - Arguments to create many Nx00Parts.
     * @example
     * // Create many Nx00Parts
     * const nx00Part = await prisma.nx00Part.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Nx00Parts and only return the `id`
     * const nx00PartWithIdOnly = await prisma.nx00Part.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends Nx00PartCreateManyAndReturnArgs>(args?: SelectSubset<T, Nx00PartCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Nx00Part.
     * @param {Nx00PartDeleteArgs} args - Arguments to delete one Nx00Part.
     * @example
     * // Delete one Nx00Part
     * const Nx00Part = await prisma.nx00Part.delete({
     *   where: {
     *     // ... filter to delete one Nx00Part
     *   }
     * })
     * 
     */
    delete<T extends Nx00PartDeleteArgs>(args: SelectSubset<T, Nx00PartDeleteArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Nx00Part.
     * @param {Nx00PartUpdateArgs} args - Arguments to update one Nx00Part.
     * @example
     * // Update one Nx00Part
     * const nx00Part = await prisma.nx00Part.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends Nx00PartUpdateArgs>(args: SelectSubset<T, Nx00PartUpdateArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Nx00Parts.
     * @param {Nx00PartDeleteManyArgs} args - Arguments to filter Nx00Parts to delete.
     * @example
     * // Delete a few Nx00Parts
     * const { count } = await prisma.nx00Part.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends Nx00PartDeleteManyArgs>(args?: SelectSubset<T, Nx00PartDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Parts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Nx00Parts
     * const nx00Part = await prisma.nx00Part.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends Nx00PartUpdateManyArgs>(args: SelectSubset<T, Nx00PartUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Nx00Parts and returns the data updated in the database.
     * @param {Nx00PartUpdateManyAndReturnArgs} args - Arguments to update many Nx00Parts.
     * @example
     * // Update many Nx00Parts
     * const nx00Part = await prisma.nx00Part.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Nx00Parts and only return the `id`
     * const nx00PartWithIdOnly = await prisma.nx00Part.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends Nx00PartUpdateManyAndReturnArgs>(args: SelectSubset<T, Nx00PartUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Nx00Part.
     * @param {Nx00PartUpsertArgs} args - Arguments to update or create a Nx00Part.
     * @example
     * // Update or create a Nx00Part
     * const nx00Part = await prisma.nx00Part.upsert({
     *   create: {
     *     // ... data to create a Nx00Part
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Nx00Part we want to update
     *   }
     * })
     */
    upsert<T extends Nx00PartUpsertArgs>(args: SelectSubset<T, Nx00PartUpsertArgs<ExtArgs>>): Prisma__Nx00PartClient<$Result.GetResult<Prisma.$Nx00PartPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Nx00Parts.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartCountArgs} args - Arguments to filter Nx00Parts to count.
     * @example
     * // Count the number of Nx00Parts
     * const count = await prisma.nx00Part.count({
     *   where: {
     *     // ... the filter for the Nx00Parts we want to count
     *   }
     * })
    **/
    count<T extends Nx00PartCountArgs>(
      args?: Subset<T, Nx00PartCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Nx00PartCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Nx00Part.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Nx00PartAggregateArgs>(args: Subset<T, Nx00PartAggregateArgs>): Prisma.PrismaPromise<GetNx00PartAggregateType<T>>

    /**
     * Group by Nx00Part.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Nx00PartGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends Nx00PartGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: Nx00PartGroupByArgs['orderBy'] }
        : { orderBy?: Nx00PartGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, Nx00PartGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetNx00PartGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Nx00Part model
   */
  readonly fields: Nx00PartFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Nx00Part.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__Nx00PartClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    brand<T extends Nx00BrandDefaultArgs<ExtArgs> = {}>(args?: Subset<T, Nx00BrandDefaultArgs<ExtArgs>>): Prisma__Nx00BrandClient<$Result.GetResult<Prisma.$Nx00BrandPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    functionGroup<T extends Nx00Part$functionGroupArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Part$functionGroupArgs<ExtArgs>>): Prisma__Nx00FunctionGroupClient<$Result.GetResult<Prisma.$Nx00FunctionGroupPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    status<T extends Nx00PartStatusDefaultArgs<ExtArgs> = {}>(args?: Subset<T, Nx00PartStatusDefaultArgs<ExtArgs>>): Prisma__Nx00PartStatusClient<$Result.GetResult<Prisma.$Nx00PartStatusPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    createdByUser<T extends Nx00Part$createdByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Part$createdByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    updatedByUser<T extends Nx00Part$updatedByUserArgs<ExtArgs> = {}>(args?: Subset<T, Nx00Part$updatedByUserArgs<ExtArgs>>): Prisma__Nx00UserClient<$Result.GetResult<Prisma.$Nx00UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Nx00Part model
   */
  interface Nx00PartFieldRefs {
    readonly id: FieldRef<"Nx00Part", 'String'>
    readonly partNo: FieldRef<"Nx00Part", 'String'>
    readonly oldPartNo: FieldRef<"Nx00Part", 'String'>
    readonly displayNo: FieldRef<"Nx00Part", 'String'>
    readonly nameZh: FieldRef<"Nx00Part", 'String'>
    readonly nameEn: FieldRef<"Nx00Part", 'String'>
    readonly brandId: FieldRef<"Nx00Part", 'String'>
    readonly functionGroupId: FieldRef<"Nx00Part", 'String'>
    readonly statusId: FieldRef<"Nx00Part", 'String'>
    readonly barcode: FieldRef<"Nx00Part", 'String'>
    readonly isActive: FieldRef<"Nx00Part", 'Boolean'>
    readonly remark: FieldRef<"Nx00Part", 'String'>
    readonly createdAt: FieldRef<"Nx00Part", 'DateTime'>
    readonly createdBy: FieldRef<"Nx00Part", 'String'>
    readonly updatedAt: FieldRef<"Nx00Part", 'DateTime'>
    readonly updatedBy: FieldRef<"Nx00Part", 'String'>
  }
    

  // Custom InputTypes
  /**
   * Nx00Part findUnique
   */
  export type Nx00PartFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Part to fetch.
     */
    where: Nx00PartWhereUniqueInput
  }

  /**
   * Nx00Part findUniqueOrThrow
   */
  export type Nx00PartFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Part to fetch.
     */
    where: Nx00PartWhereUniqueInput
  }

  /**
   * Nx00Part findFirst
   */
  export type Nx00PartFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Part to fetch.
     */
    where?: Nx00PartWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Parts to fetch.
     */
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Parts.
     */
    cursor?: Nx00PartWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Parts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Parts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Parts.
     */
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00Part findFirstOrThrow
   */
  export type Nx00PartFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Part to fetch.
     */
    where?: Nx00PartWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Parts to fetch.
     */
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Nx00Parts.
     */
    cursor?: Nx00PartWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Parts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Parts.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Nx00Parts.
     */
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00Part findMany
   */
  export type Nx00PartFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter, which Nx00Parts to fetch.
     */
    where?: Nx00PartWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Nx00Parts to fetch.
     */
    orderBy?: Nx00PartOrderByWithRelationInput | Nx00PartOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Nx00Parts.
     */
    cursor?: Nx00PartWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Nx00Parts from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Nx00Parts.
     */
    skip?: number
    distinct?: Nx00PartScalarFieldEnum | Nx00PartScalarFieldEnum[]
  }

  /**
   * Nx00Part create
   */
  export type Nx00PartCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * The data needed to create a Nx00Part.
     */
    data: XOR<Nx00PartCreateInput, Nx00PartUncheckedCreateInput>
  }

  /**
   * Nx00Part createMany
   */
  export type Nx00PartCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Nx00Parts.
     */
    data: Nx00PartCreateManyInput | Nx00PartCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Nx00Part createManyAndReturn
   */
  export type Nx00PartCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * The data used to create many Nx00Parts.
     */
    data: Nx00PartCreateManyInput | Nx00PartCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Part update
   */
  export type Nx00PartUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * The data needed to update a Nx00Part.
     */
    data: XOR<Nx00PartUpdateInput, Nx00PartUncheckedUpdateInput>
    /**
     * Choose, which Nx00Part to update.
     */
    where: Nx00PartWhereUniqueInput
  }

  /**
   * Nx00Part updateMany
   */
  export type Nx00PartUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Nx00Parts.
     */
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Parts to update
     */
    where?: Nx00PartWhereInput
    /**
     * Limit how many Nx00Parts to update.
     */
    limit?: number
  }

  /**
   * Nx00Part updateManyAndReturn
   */
  export type Nx00PartUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * The data used to update Nx00Parts.
     */
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyInput>
    /**
     * Filter which Nx00Parts to update
     */
    where?: Nx00PartWhereInput
    /**
     * Limit how many Nx00Parts to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Nx00Part upsert
   */
  export type Nx00PartUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * The filter to search for the Nx00Part to update in case it exists.
     */
    where: Nx00PartWhereUniqueInput
    /**
     * In case the Nx00Part found by the `where` argument doesn't exist, create a new Nx00Part with this data.
     */
    create: XOR<Nx00PartCreateInput, Nx00PartUncheckedCreateInput>
    /**
     * In case the Nx00Part was found with the provided `where` argument, update it with this data.
     */
    update: XOR<Nx00PartUpdateInput, Nx00PartUncheckedUpdateInput>
  }

  /**
   * Nx00Part delete
   */
  export type Nx00PartDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
    /**
     * Filter which Nx00Part to delete.
     */
    where: Nx00PartWhereUniqueInput
  }

  /**
   * Nx00Part deleteMany
   */
  export type Nx00PartDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Nx00Parts to delete
     */
    where?: Nx00PartWhereInput
    /**
     * Limit how many Nx00Parts to delete.
     */
    limit?: number
  }

  /**
   * Nx00Part.functionGroup
   */
  export type Nx00Part$functionGroupArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00FunctionGroup
     */
    select?: Nx00FunctionGroupSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00FunctionGroup
     */
    omit?: Nx00FunctionGroupOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00FunctionGroupInclude<ExtArgs> | null
    where?: Nx00FunctionGroupWhereInput
  }

  /**
   * Nx00Part.createdByUser
   */
  export type Nx00Part$createdByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Part.updatedByUser
   */
  export type Nx00Part$updatedByUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00User
     */
    select?: Nx00UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00User
     */
    omit?: Nx00UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00UserInclude<ExtArgs> | null
    where?: Nx00UserWhereInput
  }

  /**
   * Nx00Part without action
   */
  export type Nx00PartDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Nx00Part
     */
    select?: Nx00PartSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Nx00Part
     */
    omit?: Nx00PartOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: Nx00PartInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const Nx00UserScalarFieldEnum: {
    id: 'id',
    username: 'username',
    passwordHash: 'passwordHash',
    displayName: 'displayName',
    email: 'email',
    phone: 'phone',
    isActive: 'isActive',
    lastLoginAt: 'lastLoginAt',
    statusCode: 'statusCode',
    remark: 'remark',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00UserScalarFieldEnum = (typeof Nx00UserScalarFieldEnum)[keyof typeof Nx00UserScalarFieldEnum]


  export const Nx00RoleScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    description: 'description',
    isActive: 'isActive',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00RoleScalarFieldEnum = (typeof Nx00RoleScalarFieldEnum)[keyof typeof Nx00RoleScalarFieldEnum]


  export const Nx00UserRoleScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    roleId: 'roleId',
    createdAt: 'createdAt',
    createdBy: 'createdBy'
  };

  export type Nx00UserRoleScalarFieldEnum = (typeof Nx00UserRoleScalarFieldEnum)[keyof typeof Nx00UserRoleScalarFieldEnum]


  export const Nx00BrandScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    nameEn: 'nameEn',
    isActive: 'isActive',
    remark: 'remark',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00BrandScalarFieldEnum = (typeof Nx00BrandScalarFieldEnum)[keyof typeof Nx00BrandScalarFieldEnum]


  export const Nx00FunctionGroupScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    description: 'description',
    isActive: 'isActive',
    sortNo: 'sortNo',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00FunctionGroupScalarFieldEnum = (typeof Nx00FunctionGroupScalarFieldEnum)[keyof typeof Nx00FunctionGroupScalarFieldEnum]


  export const Nx00PartStatusScalarFieldEnum: {
    id: 'id',
    code: 'code',
    name: 'name',
    canSell: 'canSell',
    canPurchase: 'canPurchase',
    isActive: 'isActive',
    remark: 'remark',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00PartStatusScalarFieldEnum = (typeof Nx00PartStatusScalarFieldEnum)[keyof typeof Nx00PartStatusScalarFieldEnum]


  export const Nx00PartScalarFieldEnum: {
    id: 'id',
    partNo: 'partNo',
    oldPartNo: 'oldPartNo',
    displayNo: 'displayNo',
    nameZh: 'nameZh',
    nameEn: 'nameEn',
    brandId: 'brandId',
    functionGroupId: 'functionGroupId',
    statusId: 'statusId',
    barcode: 'barcode',
    isActive: 'isActive',
    remark: 'remark',
    createdAt: 'createdAt',
    createdBy: 'createdBy',
    updatedAt: 'updatedAt',
    updatedBy: 'updatedBy'
  };

  export type Nx00PartScalarFieldEnum = (typeof Nx00PartScalarFieldEnum)[keyof typeof Nx00PartScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type Nx00UserWhereInput = {
    AND?: Nx00UserWhereInput | Nx00UserWhereInput[]
    OR?: Nx00UserWhereInput[]
    NOT?: Nx00UserWhereInput | Nx00UserWhereInput[]
    id?: StringFilter<"Nx00User"> | string
    username?: StringFilter<"Nx00User"> | string
    passwordHash?: StringFilter<"Nx00User"> | string
    displayName?: StringFilter<"Nx00User"> | string
    email?: StringNullableFilter<"Nx00User"> | string | null
    phone?: StringNullableFilter<"Nx00User"> | string | null
    isActive?: BoolFilter<"Nx00User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    statusCode?: StringFilter<"Nx00User"> | string
    remark?: StringNullableFilter<"Nx00User"> | string | null
    createdAt?: DateTimeFilter<"Nx00User"> | Date | string
    createdBy?: StringNullableFilter<"Nx00User"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00User"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    createdUsers?: Nx00UserListRelationFilter
    updatedUsers?: Nx00UserListRelationFilter
    userRoles?: Nx00UserRoleListRelationFilter
    rolesCreated?: Nx00RoleListRelationFilter
    rolesUpdated?: Nx00RoleListRelationFilter
    userRolesCreated?: Nx00UserRoleListRelationFilter
    brandsCreated?: Nx00BrandListRelationFilter
    brandsUpdated?: Nx00BrandListRelationFilter
    functionGroupsCreated?: Nx00FunctionGroupListRelationFilter
    functionGroupsUpdated?: Nx00FunctionGroupListRelationFilter
    partStatusesCreated?: Nx00PartStatusListRelationFilter
    partStatusesUpdated?: Nx00PartStatusListRelationFilter
    partsCreated?: Nx00PartListRelationFilter
    partsUpdated?: Nx00PartListRelationFilter
  }

  export type Nx00UserOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    passwordHash?: SortOrder
    displayName?: SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    statusCode?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
    createdUsers?: Nx00UserOrderByRelationAggregateInput
    updatedUsers?: Nx00UserOrderByRelationAggregateInput
    userRoles?: Nx00UserRoleOrderByRelationAggregateInput
    rolesCreated?: Nx00RoleOrderByRelationAggregateInput
    rolesUpdated?: Nx00RoleOrderByRelationAggregateInput
    userRolesCreated?: Nx00UserRoleOrderByRelationAggregateInput
    brandsCreated?: Nx00BrandOrderByRelationAggregateInput
    brandsUpdated?: Nx00BrandOrderByRelationAggregateInput
    functionGroupsCreated?: Nx00FunctionGroupOrderByRelationAggregateInput
    functionGroupsUpdated?: Nx00FunctionGroupOrderByRelationAggregateInput
    partStatusesCreated?: Nx00PartStatusOrderByRelationAggregateInput
    partStatusesUpdated?: Nx00PartStatusOrderByRelationAggregateInput
    partsCreated?: Nx00PartOrderByRelationAggregateInput
    partsUpdated?: Nx00PartOrderByRelationAggregateInput
  }

  export type Nx00UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    username?: string
    AND?: Nx00UserWhereInput | Nx00UserWhereInput[]
    OR?: Nx00UserWhereInput[]
    NOT?: Nx00UserWhereInput | Nx00UserWhereInput[]
    passwordHash?: StringFilter<"Nx00User"> | string
    displayName?: StringFilter<"Nx00User"> | string
    email?: StringNullableFilter<"Nx00User"> | string | null
    phone?: StringNullableFilter<"Nx00User"> | string | null
    isActive?: BoolFilter<"Nx00User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    statusCode?: StringFilter<"Nx00User"> | string
    remark?: StringNullableFilter<"Nx00User"> | string | null
    createdAt?: DateTimeFilter<"Nx00User"> | Date | string
    createdBy?: StringNullableFilter<"Nx00User"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00User"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    createdUsers?: Nx00UserListRelationFilter
    updatedUsers?: Nx00UserListRelationFilter
    userRoles?: Nx00UserRoleListRelationFilter
    rolesCreated?: Nx00RoleListRelationFilter
    rolesUpdated?: Nx00RoleListRelationFilter
    userRolesCreated?: Nx00UserRoleListRelationFilter
    brandsCreated?: Nx00BrandListRelationFilter
    brandsUpdated?: Nx00BrandListRelationFilter
    functionGroupsCreated?: Nx00FunctionGroupListRelationFilter
    functionGroupsUpdated?: Nx00FunctionGroupListRelationFilter
    partStatusesCreated?: Nx00PartStatusListRelationFilter
    partStatusesUpdated?: Nx00PartStatusListRelationFilter
    partsCreated?: Nx00PartListRelationFilter
    partsUpdated?: Nx00PartListRelationFilter
  }, "id" | "username">

  export type Nx00UserOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    passwordHash?: SortOrder
    displayName?: SortOrder
    email?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    statusCode?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00UserCountOrderByAggregateInput
    _max?: Nx00UserMaxOrderByAggregateInput
    _min?: Nx00UserMinOrderByAggregateInput
  }

  export type Nx00UserScalarWhereWithAggregatesInput = {
    AND?: Nx00UserScalarWhereWithAggregatesInput | Nx00UserScalarWhereWithAggregatesInput[]
    OR?: Nx00UserScalarWhereWithAggregatesInput[]
    NOT?: Nx00UserScalarWhereWithAggregatesInput | Nx00UserScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00User"> | string
    username?: StringWithAggregatesFilter<"Nx00User"> | string
    passwordHash?: StringWithAggregatesFilter<"Nx00User"> | string
    displayName?: StringWithAggregatesFilter<"Nx00User"> | string
    email?: StringNullableWithAggregatesFilter<"Nx00User"> | string | null
    phone?: StringNullableWithAggregatesFilter<"Nx00User"> | string | null
    isActive?: BoolWithAggregatesFilter<"Nx00User"> | boolean
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"Nx00User"> | Date | string | null
    statusCode?: StringWithAggregatesFilter<"Nx00User"> | string
    remark?: StringNullableWithAggregatesFilter<"Nx00User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Nx00User"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00User"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00User"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00User"> | string | null
  }

  export type Nx00RoleWhereInput = {
    AND?: Nx00RoleWhereInput | Nx00RoleWhereInput[]
    OR?: Nx00RoleWhereInput[]
    NOT?: Nx00RoleWhereInput | Nx00RoleWhereInput[]
    id?: StringFilter<"Nx00Role"> | string
    code?: StringFilter<"Nx00Role"> | string
    name?: StringFilter<"Nx00Role"> | string
    description?: StringNullableFilter<"Nx00Role"> | string | null
    isActive?: BoolFilter<"Nx00Role"> | boolean
    createdAt?: DateTimeFilter<"Nx00Role"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Role"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Role"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Role"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    userRoles?: Nx00UserRoleListRelationFilter
  }

  export type Nx00RoleOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
    userRoles?: Nx00UserRoleOrderByRelationAggregateInput
  }

  export type Nx00RoleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: Nx00RoleWhereInput | Nx00RoleWhereInput[]
    OR?: Nx00RoleWhereInput[]
    NOT?: Nx00RoleWhereInput | Nx00RoleWhereInput[]
    name?: StringFilter<"Nx00Role"> | string
    description?: StringNullableFilter<"Nx00Role"> | string | null
    isActive?: BoolFilter<"Nx00Role"> | boolean
    createdAt?: DateTimeFilter<"Nx00Role"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Role"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Role"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Role"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    userRoles?: Nx00UserRoleListRelationFilter
  }, "id" | "code">

  export type Nx00RoleOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00RoleCountOrderByAggregateInput
    _max?: Nx00RoleMaxOrderByAggregateInput
    _min?: Nx00RoleMinOrderByAggregateInput
  }

  export type Nx00RoleScalarWhereWithAggregatesInput = {
    AND?: Nx00RoleScalarWhereWithAggregatesInput | Nx00RoleScalarWhereWithAggregatesInput[]
    OR?: Nx00RoleScalarWhereWithAggregatesInput[]
    NOT?: Nx00RoleScalarWhereWithAggregatesInput | Nx00RoleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00Role"> | string
    code?: StringWithAggregatesFilter<"Nx00Role"> | string
    name?: StringWithAggregatesFilter<"Nx00Role"> | string
    description?: StringNullableWithAggregatesFilter<"Nx00Role"> | string | null
    isActive?: BoolWithAggregatesFilter<"Nx00Role"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"Nx00Role"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00Role"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00Role"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00Role"> | string | null
  }

  export type Nx00UserRoleWhereInput = {
    AND?: Nx00UserRoleWhereInput | Nx00UserRoleWhereInput[]
    OR?: Nx00UserRoleWhereInput[]
    NOT?: Nx00UserRoleWhereInput | Nx00UserRoleWhereInput[]
    id?: StringFilter<"Nx00UserRole"> | string
    userId?: StringFilter<"Nx00UserRole"> | string
    roleId?: StringFilter<"Nx00UserRole"> | string
    createdAt?: DateTimeFilter<"Nx00UserRole"> | Date | string
    createdBy?: StringNullableFilter<"Nx00UserRole"> | string | null
    user?: XOR<Nx00UserScalarRelationFilter, Nx00UserWhereInput>
    role?: XOR<Nx00RoleScalarRelationFilter, Nx00RoleWhereInput>
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
  }

  export type Nx00UserRoleOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    roleId?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    user?: Nx00UserOrderByWithRelationInput
    role?: Nx00RoleOrderByWithRelationInput
    createdByUser?: Nx00UserOrderByWithRelationInput
  }

  export type Nx00UserRoleWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    userId_roleId?: Nx00UserRoleUserIdRoleIdCompoundUniqueInput
    AND?: Nx00UserRoleWhereInput | Nx00UserRoleWhereInput[]
    OR?: Nx00UserRoleWhereInput[]
    NOT?: Nx00UserRoleWhereInput | Nx00UserRoleWhereInput[]
    userId?: StringFilter<"Nx00UserRole"> | string
    roleId?: StringFilter<"Nx00UserRole"> | string
    createdAt?: DateTimeFilter<"Nx00UserRole"> | Date | string
    createdBy?: StringNullableFilter<"Nx00UserRole"> | string | null
    user?: XOR<Nx00UserScalarRelationFilter, Nx00UserWhereInput>
    role?: XOR<Nx00RoleScalarRelationFilter, Nx00RoleWhereInput>
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
  }, "id" | "userId_roleId">

  export type Nx00UserRoleOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    roleId?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    _count?: Nx00UserRoleCountOrderByAggregateInput
    _max?: Nx00UserRoleMaxOrderByAggregateInput
    _min?: Nx00UserRoleMinOrderByAggregateInput
  }

  export type Nx00UserRoleScalarWhereWithAggregatesInput = {
    AND?: Nx00UserRoleScalarWhereWithAggregatesInput | Nx00UserRoleScalarWhereWithAggregatesInput[]
    OR?: Nx00UserRoleScalarWhereWithAggregatesInput[]
    NOT?: Nx00UserRoleScalarWhereWithAggregatesInput | Nx00UserRoleScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00UserRole"> | string
    userId?: StringWithAggregatesFilter<"Nx00UserRole"> | string
    roleId?: StringWithAggregatesFilter<"Nx00UserRole"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Nx00UserRole"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00UserRole"> | string | null
  }

  export type Nx00BrandWhereInput = {
    AND?: Nx00BrandWhereInput | Nx00BrandWhereInput[]
    OR?: Nx00BrandWhereInput[]
    NOT?: Nx00BrandWhereInput | Nx00BrandWhereInput[]
    id?: StringFilter<"Nx00Brand"> | string
    code?: StringFilter<"Nx00Brand"> | string
    name?: StringFilter<"Nx00Brand"> | string
    nameEn?: StringNullableFilter<"Nx00Brand"> | string | null
    isActive?: BoolFilter<"Nx00Brand"> | boolean
    remark?: StringNullableFilter<"Nx00Brand"> | string | null
    createdAt?: DateTimeFilter<"Nx00Brand"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Brand"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Brand"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Brand"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }

  export type Nx00BrandOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
    parts?: Nx00PartOrderByRelationAggregateInput
  }

  export type Nx00BrandWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: Nx00BrandWhereInput | Nx00BrandWhereInput[]
    OR?: Nx00BrandWhereInput[]
    NOT?: Nx00BrandWhereInput | Nx00BrandWhereInput[]
    name?: StringFilter<"Nx00Brand"> | string
    nameEn?: StringNullableFilter<"Nx00Brand"> | string | null
    isActive?: BoolFilter<"Nx00Brand"> | boolean
    remark?: StringNullableFilter<"Nx00Brand"> | string | null
    createdAt?: DateTimeFilter<"Nx00Brand"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Brand"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Brand"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Brand"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }, "id" | "code">

  export type Nx00BrandOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00BrandCountOrderByAggregateInput
    _max?: Nx00BrandMaxOrderByAggregateInput
    _min?: Nx00BrandMinOrderByAggregateInput
  }

  export type Nx00BrandScalarWhereWithAggregatesInput = {
    AND?: Nx00BrandScalarWhereWithAggregatesInput | Nx00BrandScalarWhereWithAggregatesInput[]
    OR?: Nx00BrandScalarWhereWithAggregatesInput[]
    NOT?: Nx00BrandScalarWhereWithAggregatesInput | Nx00BrandScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00Brand"> | string
    code?: StringWithAggregatesFilter<"Nx00Brand"> | string
    name?: StringWithAggregatesFilter<"Nx00Brand"> | string
    nameEn?: StringNullableWithAggregatesFilter<"Nx00Brand"> | string | null
    isActive?: BoolWithAggregatesFilter<"Nx00Brand"> | boolean
    remark?: StringNullableWithAggregatesFilter<"Nx00Brand"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Nx00Brand"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00Brand"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00Brand"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00Brand"> | string | null
  }

  export type Nx00FunctionGroupWhereInput = {
    AND?: Nx00FunctionGroupWhereInput | Nx00FunctionGroupWhereInput[]
    OR?: Nx00FunctionGroupWhereInput[]
    NOT?: Nx00FunctionGroupWhereInput | Nx00FunctionGroupWhereInput[]
    id?: StringFilter<"Nx00FunctionGroup"> | string
    code?: StringFilter<"Nx00FunctionGroup"> | string
    name?: StringFilter<"Nx00FunctionGroup"> | string
    description?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    isActive?: BoolFilter<"Nx00FunctionGroup"> | boolean
    sortNo?: IntNullableFilter<"Nx00FunctionGroup"> | number | null
    createdAt?: DateTimeFilter<"Nx00FunctionGroup"> | Date | string
    createdBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00FunctionGroup"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }

  export type Nx00FunctionGroupOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    isActive?: SortOrder
    sortNo?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
    parts?: Nx00PartOrderByRelationAggregateInput
  }

  export type Nx00FunctionGroupWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: Nx00FunctionGroupWhereInput | Nx00FunctionGroupWhereInput[]
    OR?: Nx00FunctionGroupWhereInput[]
    NOT?: Nx00FunctionGroupWhereInput | Nx00FunctionGroupWhereInput[]
    name?: StringFilter<"Nx00FunctionGroup"> | string
    description?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    isActive?: BoolFilter<"Nx00FunctionGroup"> | boolean
    sortNo?: IntNullableFilter<"Nx00FunctionGroup"> | number | null
    createdAt?: DateTimeFilter<"Nx00FunctionGroup"> | Date | string
    createdBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00FunctionGroup"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }, "id" | "code">

  export type Nx00FunctionGroupOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    isActive?: SortOrder
    sortNo?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00FunctionGroupCountOrderByAggregateInput
    _avg?: Nx00FunctionGroupAvgOrderByAggregateInput
    _max?: Nx00FunctionGroupMaxOrderByAggregateInput
    _min?: Nx00FunctionGroupMinOrderByAggregateInput
    _sum?: Nx00FunctionGroupSumOrderByAggregateInput
  }

  export type Nx00FunctionGroupScalarWhereWithAggregatesInput = {
    AND?: Nx00FunctionGroupScalarWhereWithAggregatesInput | Nx00FunctionGroupScalarWhereWithAggregatesInput[]
    OR?: Nx00FunctionGroupScalarWhereWithAggregatesInput[]
    NOT?: Nx00FunctionGroupScalarWhereWithAggregatesInput | Nx00FunctionGroupScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00FunctionGroup"> | string
    code?: StringWithAggregatesFilter<"Nx00FunctionGroup"> | string
    name?: StringWithAggregatesFilter<"Nx00FunctionGroup"> | string
    description?: StringNullableWithAggregatesFilter<"Nx00FunctionGroup"> | string | null
    isActive?: BoolWithAggregatesFilter<"Nx00FunctionGroup"> | boolean
    sortNo?: IntNullableWithAggregatesFilter<"Nx00FunctionGroup"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"Nx00FunctionGroup"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00FunctionGroup"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00FunctionGroup"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00FunctionGroup"> | string | null
  }

  export type Nx00PartStatusWhereInput = {
    AND?: Nx00PartStatusWhereInput | Nx00PartStatusWhereInput[]
    OR?: Nx00PartStatusWhereInput[]
    NOT?: Nx00PartStatusWhereInput | Nx00PartStatusWhereInput[]
    id?: StringFilter<"Nx00PartStatus"> | string
    code?: StringFilter<"Nx00PartStatus"> | string
    name?: StringFilter<"Nx00PartStatus"> | string
    canSell?: BoolFilter<"Nx00PartStatus"> | boolean
    canPurchase?: BoolFilter<"Nx00PartStatus"> | boolean
    isActive?: BoolFilter<"Nx00PartStatus"> | boolean
    remark?: StringNullableFilter<"Nx00PartStatus"> | string | null
    createdAt?: DateTimeFilter<"Nx00PartStatus"> | Date | string
    createdBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00PartStatus"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }

  export type Nx00PartStatusOrderByWithRelationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    canSell?: SortOrder
    canPurchase?: SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
    parts?: Nx00PartOrderByRelationAggregateInput
  }

  export type Nx00PartStatusWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    code?: string
    AND?: Nx00PartStatusWhereInput | Nx00PartStatusWhereInput[]
    OR?: Nx00PartStatusWhereInput[]
    NOT?: Nx00PartStatusWhereInput | Nx00PartStatusWhereInput[]
    name?: StringFilter<"Nx00PartStatus"> | string
    canSell?: BoolFilter<"Nx00PartStatus"> | boolean
    canPurchase?: BoolFilter<"Nx00PartStatus"> | boolean
    isActive?: BoolFilter<"Nx00PartStatus"> | boolean
    remark?: StringNullableFilter<"Nx00PartStatus"> | string | null
    createdAt?: DateTimeFilter<"Nx00PartStatus"> | Date | string
    createdBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00PartStatus"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    parts?: Nx00PartListRelationFilter
  }, "id" | "code">

  export type Nx00PartStatusOrderByWithAggregationInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    canSell?: SortOrder
    canPurchase?: SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00PartStatusCountOrderByAggregateInput
    _max?: Nx00PartStatusMaxOrderByAggregateInput
    _min?: Nx00PartStatusMinOrderByAggregateInput
  }

  export type Nx00PartStatusScalarWhereWithAggregatesInput = {
    AND?: Nx00PartStatusScalarWhereWithAggregatesInput | Nx00PartStatusScalarWhereWithAggregatesInput[]
    OR?: Nx00PartStatusScalarWhereWithAggregatesInput[]
    NOT?: Nx00PartStatusScalarWhereWithAggregatesInput | Nx00PartStatusScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00PartStatus"> | string
    code?: StringWithAggregatesFilter<"Nx00PartStatus"> | string
    name?: StringWithAggregatesFilter<"Nx00PartStatus"> | string
    canSell?: BoolWithAggregatesFilter<"Nx00PartStatus"> | boolean
    canPurchase?: BoolWithAggregatesFilter<"Nx00PartStatus"> | boolean
    isActive?: BoolWithAggregatesFilter<"Nx00PartStatus"> | boolean
    remark?: StringNullableWithAggregatesFilter<"Nx00PartStatus"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Nx00PartStatus"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00PartStatus"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00PartStatus"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00PartStatus"> | string | null
  }

  export type Nx00PartWhereInput = {
    AND?: Nx00PartWhereInput | Nx00PartWhereInput[]
    OR?: Nx00PartWhereInput[]
    NOT?: Nx00PartWhereInput | Nx00PartWhereInput[]
    id?: StringFilter<"Nx00Part"> | string
    partNo?: StringFilter<"Nx00Part"> | string
    oldPartNo?: StringNullableFilter<"Nx00Part"> | string | null
    displayNo?: StringNullableFilter<"Nx00Part"> | string | null
    nameZh?: StringFilter<"Nx00Part"> | string
    nameEn?: StringNullableFilter<"Nx00Part"> | string | null
    brandId?: StringFilter<"Nx00Part"> | string
    functionGroupId?: StringNullableFilter<"Nx00Part"> | string | null
    statusId?: StringFilter<"Nx00Part"> | string
    barcode?: StringNullableFilter<"Nx00Part"> | string | null
    isActive?: BoolFilter<"Nx00Part"> | boolean
    remark?: StringNullableFilter<"Nx00Part"> | string | null
    createdAt?: DateTimeFilter<"Nx00Part"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Part"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Part"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Part"> | string | null
    brand?: XOR<Nx00BrandScalarRelationFilter, Nx00BrandWhereInput>
    functionGroup?: XOR<Nx00FunctionGroupNullableScalarRelationFilter, Nx00FunctionGroupWhereInput> | null
    status?: XOR<Nx00PartStatusScalarRelationFilter, Nx00PartStatusWhereInput>
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
  }

  export type Nx00PartOrderByWithRelationInput = {
    id?: SortOrder
    partNo?: SortOrder
    oldPartNo?: SortOrderInput | SortOrder
    displayNo?: SortOrderInput | SortOrder
    nameZh?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    brandId?: SortOrder
    functionGroupId?: SortOrderInput | SortOrder
    statusId?: SortOrder
    barcode?: SortOrderInput | SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    brand?: Nx00BrandOrderByWithRelationInput
    functionGroup?: Nx00FunctionGroupOrderByWithRelationInput
    status?: Nx00PartStatusOrderByWithRelationInput
    createdByUser?: Nx00UserOrderByWithRelationInput
    updatedByUser?: Nx00UserOrderByWithRelationInput
  }

  export type Nx00PartWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    partNo?: string
    AND?: Nx00PartWhereInput | Nx00PartWhereInput[]
    OR?: Nx00PartWhereInput[]
    NOT?: Nx00PartWhereInput | Nx00PartWhereInput[]
    oldPartNo?: StringNullableFilter<"Nx00Part"> | string | null
    displayNo?: StringNullableFilter<"Nx00Part"> | string | null
    nameZh?: StringFilter<"Nx00Part"> | string
    nameEn?: StringNullableFilter<"Nx00Part"> | string | null
    brandId?: StringFilter<"Nx00Part"> | string
    functionGroupId?: StringNullableFilter<"Nx00Part"> | string | null
    statusId?: StringFilter<"Nx00Part"> | string
    barcode?: StringNullableFilter<"Nx00Part"> | string | null
    isActive?: BoolFilter<"Nx00Part"> | boolean
    remark?: StringNullableFilter<"Nx00Part"> | string | null
    createdAt?: DateTimeFilter<"Nx00Part"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Part"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Part"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Part"> | string | null
    brand?: XOR<Nx00BrandScalarRelationFilter, Nx00BrandWhereInput>
    functionGroup?: XOR<Nx00FunctionGroupNullableScalarRelationFilter, Nx00FunctionGroupWhereInput> | null
    status?: XOR<Nx00PartStatusScalarRelationFilter, Nx00PartStatusWhereInput>
    createdByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
    updatedByUser?: XOR<Nx00UserNullableScalarRelationFilter, Nx00UserWhereInput> | null
  }, "id" | "partNo">

  export type Nx00PartOrderByWithAggregationInput = {
    id?: SortOrder
    partNo?: SortOrder
    oldPartNo?: SortOrderInput | SortOrder
    displayNo?: SortOrderInput | SortOrder
    nameZh?: SortOrder
    nameEn?: SortOrderInput | SortOrder
    brandId?: SortOrder
    functionGroupId?: SortOrderInput | SortOrder
    statusId?: SortOrder
    barcode?: SortOrderInput | SortOrder
    isActive?: SortOrder
    remark?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrderInput | SortOrder
    updatedAt?: SortOrderInput | SortOrder
    updatedBy?: SortOrderInput | SortOrder
    _count?: Nx00PartCountOrderByAggregateInput
    _max?: Nx00PartMaxOrderByAggregateInput
    _min?: Nx00PartMinOrderByAggregateInput
  }

  export type Nx00PartScalarWhereWithAggregatesInput = {
    AND?: Nx00PartScalarWhereWithAggregatesInput | Nx00PartScalarWhereWithAggregatesInput[]
    OR?: Nx00PartScalarWhereWithAggregatesInput[]
    NOT?: Nx00PartScalarWhereWithAggregatesInput | Nx00PartScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Nx00Part"> | string
    partNo?: StringWithAggregatesFilter<"Nx00Part"> | string
    oldPartNo?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    displayNo?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    nameZh?: StringWithAggregatesFilter<"Nx00Part"> | string
    nameEn?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    brandId?: StringWithAggregatesFilter<"Nx00Part"> | string
    functionGroupId?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    statusId?: StringWithAggregatesFilter<"Nx00Part"> | string
    barcode?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    isActive?: BoolWithAggregatesFilter<"Nx00Part"> | boolean
    remark?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Nx00Part"> | Date | string
    createdBy?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
    updatedAt?: DateTimeNullableWithAggregatesFilter<"Nx00Part"> | Date | string | null
    updatedBy?: StringNullableWithAggregatesFilter<"Nx00Part"> | string | null
  }

  export type Nx00UserCreateInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserCreateManyInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00RoleCreateInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutRolesCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutRolesUpdatedInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleUncheckedCreateInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutRolesCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutRolesUpdatedNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleCreateManyInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00RoleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00RoleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserRoleCreateInput = {
    id?: string
    createdAt?: Date | string
    user: Nx00UserCreateNestedOneWithoutUserRolesInput
    role: Nx00RoleCreateNestedOneWithoutUserRolesInput
    createdByUser?: Nx00UserCreateNestedOneWithoutUserRolesCreatedInput
  }

  export type Nx00UserRoleUncheckedCreateInput = {
    id?: string
    userId: string
    roleId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00UserRoleUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: Nx00UserUpdateOneRequiredWithoutUserRolesNestedInput
    role?: Nx00RoleUpdateOneRequiredWithoutUserRolesNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutUserRolesCreatedNestedInput
  }

  export type Nx00UserRoleUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserRoleCreateManyInput = {
    id?: string
    userId: string
    roleId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00UserRoleUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type Nx00UserRoleUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00BrandCreateInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutBrandsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutBrandsUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandUncheckedCreateInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutBrandsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutBrandsUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandCreateManyInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00BrandUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00BrandUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00FunctionGroupCreateInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupUncheckedCreateInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutFunctionGroupsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutFunctionGroupsUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupCreateManyInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00FunctionGroupUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00FunctionGroupUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartStatusCreateInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutPartStatusesCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartStatusesUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusUncheckedCreateInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutPartStatusesCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartStatusesUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusCreateManyInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartStatusUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00PartStatusUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartCreateInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    brand: Nx00BrandCreateNestedOneWithoutPartsInput
    functionGroup?: Nx00FunctionGroupCreateNestedOneWithoutPartsInput
    status: Nx00PartStatusCreateNestedOneWithoutPartsInput
    createdByUser?: Nx00UserCreateNestedOneWithoutPartsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartsUpdatedInput
  }

  export type Nx00PartUncheckedCreateInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    brand?: Nx00BrandUpdateOneRequiredWithoutPartsNestedInput
    functionGroup?: Nx00FunctionGroupUpdateOneWithoutPartsNestedInput
    status?: Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutPartsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartsUpdatedNestedInput
  }

  export type Nx00PartUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartCreateManyInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00PartUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type Nx00UserNullableScalarRelationFilter = {
    is?: Nx00UserWhereInput | null
    isNot?: Nx00UserWhereInput | null
  }

  export type Nx00UserListRelationFilter = {
    every?: Nx00UserWhereInput
    some?: Nx00UserWhereInput
    none?: Nx00UserWhereInput
  }

  export type Nx00UserRoleListRelationFilter = {
    every?: Nx00UserRoleWhereInput
    some?: Nx00UserRoleWhereInput
    none?: Nx00UserRoleWhereInput
  }

  export type Nx00RoleListRelationFilter = {
    every?: Nx00RoleWhereInput
    some?: Nx00RoleWhereInput
    none?: Nx00RoleWhereInput
  }

  export type Nx00BrandListRelationFilter = {
    every?: Nx00BrandWhereInput
    some?: Nx00BrandWhereInput
    none?: Nx00BrandWhereInput
  }

  export type Nx00FunctionGroupListRelationFilter = {
    every?: Nx00FunctionGroupWhereInput
    some?: Nx00FunctionGroupWhereInput
    none?: Nx00FunctionGroupWhereInput
  }

  export type Nx00PartStatusListRelationFilter = {
    every?: Nx00PartStatusWhereInput
    some?: Nx00PartStatusWhereInput
    none?: Nx00PartStatusWhereInput
  }

  export type Nx00PartListRelationFilter = {
    every?: Nx00PartWhereInput
    some?: Nx00PartWhereInput
    none?: Nx00PartWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type Nx00UserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00UserRoleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00RoleOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00BrandOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00FunctionGroupOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00PartStatusOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00PartOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type Nx00UserCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    passwordHash?: SortOrder
    displayName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    statusCode?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00UserMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    passwordHash?: SortOrder
    displayName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    statusCode?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00UserMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    passwordHash?: SortOrder
    displayName?: SortOrder
    email?: SortOrder
    phone?: SortOrder
    isActive?: SortOrder
    lastLoginAt?: SortOrder
    statusCode?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type Nx00RoleCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00RoleMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00RoleMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00UserScalarRelationFilter = {
    is?: Nx00UserWhereInput
    isNot?: Nx00UserWhereInput
  }

  export type Nx00RoleScalarRelationFilter = {
    is?: Nx00RoleWhereInput
    isNot?: Nx00RoleWhereInput
  }

  export type Nx00UserRoleUserIdRoleIdCompoundUniqueInput = {
    userId: string
    roleId: string
  }

  export type Nx00UserRoleCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    roleId?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
  }

  export type Nx00UserRoleMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    roleId?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
  }

  export type Nx00UserRoleMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    roleId?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
  }

  export type Nx00BrandCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00BrandMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00BrandMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    nameEn?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type Nx00FunctionGroupCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    sortNo?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00FunctionGroupAvgOrderByAggregateInput = {
    sortNo?: SortOrder
  }

  export type Nx00FunctionGroupMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    sortNo?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00FunctionGroupMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    description?: SortOrder
    isActive?: SortOrder
    sortNo?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00FunctionGroupSumOrderByAggregateInput = {
    sortNo?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type Nx00PartStatusCountOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    canSell?: SortOrder
    canPurchase?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00PartStatusMaxOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    canSell?: SortOrder
    canPurchase?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00PartStatusMinOrderByAggregateInput = {
    id?: SortOrder
    code?: SortOrder
    name?: SortOrder
    canSell?: SortOrder
    canPurchase?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00BrandScalarRelationFilter = {
    is?: Nx00BrandWhereInput
    isNot?: Nx00BrandWhereInput
  }

  export type Nx00FunctionGroupNullableScalarRelationFilter = {
    is?: Nx00FunctionGroupWhereInput | null
    isNot?: Nx00FunctionGroupWhereInput | null
  }

  export type Nx00PartStatusScalarRelationFilter = {
    is?: Nx00PartStatusWhereInput
    isNot?: Nx00PartStatusWhereInput
  }

  export type Nx00PartCountOrderByAggregateInput = {
    id?: SortOrder
    partNo?: SortOrder
    oldPartNo?: SortOrder
    displayNo?: SortOrder
    nameZh?: SortOrder
    nameEn?: SortOrder
    brandId?: SortOrder
    functionGroupId?: SortOrder
    statusId?: SortOrder
    barcode?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00PartMaxOrderByAggregateInput = {
    id?: SortOrder
    partNo?: SortOrder
    oldPartNo?: SortOrder
    displayNo?: SortOrder
    nameZh?: SortOrder
    nameEn?: SortOrder
    brandId?: SortOrder
    functionGroupId?: SortOrder
    statusId?: SortOrder
    barcode?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00PartMinOrderByAggregateInput = {
    id?: SortOrder
    partNo?: SortOrder
    oldPartNo?: SortOrder
    displayNo?: SortOrder
    nameZh?: SortOrder
    nameEn?: SortOrder
    brandId?: SortOrder
    functionGroupId?: SortOrder
    statusId?: SortOrder
    barcode?: SortOrder
    isActive?: SortOrder
    remark?: SortOrder
    createdAt?: SortOrder
    createdBy?: SortOrder
    updatedAt?: SortOrder
    updatedBy?: SortOrder
  }

  export type Nx00UserCreateNestedOneWithoutCreatedUsersInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedUsersInput, Nx00UserUncheckedCreateWithoutCreatedUsersInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedUsersInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutUpdatedUsersInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedUsersInput, Nx00UserUncheckedCreateWithoutUpdatedUsersInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedUsersInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput> | Nx00UserCreateWithoutCreatedByUserInput[] | Nx00UserUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedByUserInput | Nx00UserCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00UserCreateManyCreatedByUserInputEnvelope
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
  }

  export type Nx00UserCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput> | Nx00UserCreateWithoutUpdatedByUserInput[] | Nx00UserUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedByUserInput | Nx00UserCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00UserCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
  }

  export type Nx00UserRoleCreateNestedManyWithoutUserInput = {
    create?: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput> | Nx00UserRoleCreateWithoutUserInput[] | Nx00UserRoleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutUserInput | Nx00UserRoleCreateOrConnectWithoutUserInput[]
    createMany?: Nx00UserRoleCreateManyUserInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00RoleCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput> | Nx00RoleCreateWithoutCreatedByUserInput[] | Nx00RoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutCreatedByUserInput | Nx00RoleCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00RoleCreateManyCreatedByUserInputEnvelope
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
  }

  export type Nx00RoleCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput> | Nx00RoleCreateWithoutUpdatedByUserInput[] | Nx00RoleUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUpdatedByUserInput | Nx00RoleCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00RoleCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
  }

  export type Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput> | Nx00UserRoleCreateWithoutCreatedByUserInput[] | Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput | Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00UserRoleCreateManyCreatedByUserInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00BrandCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput> | Nx00BrandCreateWithoutCreatedByUserInput[] | Nx00BrandUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutCreatedByUserInput | Nx00BrandCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00BrandCreateManyCreatedByUserInputEnvelope
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
  }

  export type Nx00BrandCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput> | Nx00BrandCreateWithoutUpdatedByUserInput[] | Nx00BrandUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutUpdatedByUserInput | Nx00BrandCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00BrandCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
  }

  export type Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput> | Nx00FunctionGroupCreateWithoutCreatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyCreatedByUserInputEnvelope
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
  }

  export type Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput> | Nx00FunctionGroupCreateWithoutUpdatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
  }

  export type Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput> | Nx00PartStatusCreateWithoutCreatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput | Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyCreatedByUserInputEnvelope
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
  }

  export type Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartStatusCreateWithoutUpdatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput | Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
  }

  export type Nx00PartCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput> | Nx00PartCreateWithoutCreatedByUserInput[] | Nx00PartUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutCreatedByUserInput | Nx00PartCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00PartCreateManyCreatedByUserInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00PartCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartCreateWithoutUpdatedByUserInput[] | Nx00PartUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutUpdatedByUserInput | Nx00PartCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00PartCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput> | Nx00UserCreateWithoutCreatedByUserInput[] | Nx00UserUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedByUserInput | Nx00UserCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00UserCreateManyCreatedByUserInputEnvelope
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
  }

  export type Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput> | Nx00UserCreateWithoutUpdatedByUserInput[] | Nx00UserUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedByUserInput | Nx00UserCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00UserCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
  }

  export type Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput> | Nx00UserRoleCreateWithoutUserInput[] | Nx00UserRoleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutUserInput | Nx00UserRoleCreateOrConnectWithoutUserInput[]
    createMany?: Nx00UserRoleCreateManyUserInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput> | Nx00RoleCreateWithoutCreatedByUserInput[] | Nx00RoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutCreatedByUserInput | Nx00RoleCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00RoleCreateManyCreatedByUserInputEnvelope
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
  }

  export type Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput> | Nx00RoleCreateWithoutUpdatedByUserInput[] | Nx00RoleUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUpdatedByUserInput | Nx00RoleCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00RoleCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
  }

  export type Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput> | Nx00UserRoleCreateWithoutCreatedByUserInput[] | Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput | Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00UserRoleCreateManyCreatedByUserInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput> | Nx00BrandCreateWithoutCreatedByUserInput[] | Nx00BrandUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutCreatedByUserInput | Nx00BrandCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00BrandCreateManyCreatedByUserInputEnvelope
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
  }

  export type Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput> | Nx00BrandCreateWithoutUpdatedByUserInput[] | Nx00BrandUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutUpdatedByUserInput | Nx00BrandCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00BrandCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
  }

  export type Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput> | Nx00FunctionGroupCreateWithoutCreatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyCreatedByUserInputEnvelope
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
  }

  export type Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput> | Nx00FunctionGroupCreateWithoutUpdatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
  }

  export type Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput> | Nx00PartStatusCreateWithoutCreatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput | Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyCreatedByUserInputEnvelope
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
  }

  export type Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartStatusCreateWithoutUpdatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput | Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
  }

  export type Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput = {
    create?: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput> | Nx00PartCreateWithoutCreatedByUserInput[] | Nx00PartUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutCreatedByUserInput | Nx00PartCreateOrConnectWithoutCreatedByUserInput[]
    createMany?: Nx00PartCreateManyCreatedByUserInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput = {
    create?: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartCreateWithoutUpdatedByUserInput[] | Nx00PartUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutUpdatedByUserInput | Nx00PartCreateOrConnectWithoutUpdatedByUserInput[]
    createMany?: Nx00PartCreateManyUpdatedByUserInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type Nx00UserUpdateOneWithoutCreatedUsersNestedInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedUsersInput, Nx00UserUncheckedCreateWithoutCreatedUsersInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedUsersInput
    upsert?: Nx00UserUpsertWithoutCreatedUsersInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutCreatedUsersInput, Nx00UserUpdateWithoutCreatedUsersInput>, Nx00UserUncheckedUpdateWithoutCreatedUsersInput>
  }

  export type Nx00UserUpdateOneWithoutUpdatedUsersNestedInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedUsersInput, Nx00UserUncheckedCreateWithoutUpdatedUsersInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedUsersInput
    upsert?: Nx00UserUpsertWithoutUpdatedUsersInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutUpdatedUsersInput, Nx00UserUpdateWithoutUpdatedUsersInput>, Nx00UserUncheckedUpdateWithoutUpdatedUsersInput>
  }

  export type Nx00UserUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput> | Nx00UserCreateWithoutCreatedByUserInput[] | Nx00UserUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedByUserInput | Nx00UserCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00UserUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00UserUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00UserCreateManyCreatedByUserInputEnvelope
    set?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    disconnect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    delete?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    update?: Nx00UserUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00UserUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00UserUpdateManyWithWhereWithoutCreatedByUserInput | Nx00UserUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
  }

  export type Nx00UserUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput> | Nx00UserCreateWithoutUpdatedByUserInput[] | Nx00UserUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedByUserInput | Nx00UserCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00UserUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00UserUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00UserCreateManyUpdatedByUserInputEnvelope
    set?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    disconnect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    delete?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    update?: Nx00UserUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00UserUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00UserUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00UserUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
  }

  export type Nx00UserRoleUpdateManyWithoutUserNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput> | Nx00UserRoleCreateWithoutUserInput[] | Nx00UserRoleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutUserInput | Nx00UserRoleCreateOrConnectWithoutUserInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutUserInput | Nx00UserRoleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: Nx00UserRoleCreateManyUserInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutUserInput | Nx00UserRoleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutUserInput | Nx00UserRoleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00RoleUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput> | Nx00RoleCreateWithoutCreatedByUserInput[] | Nx00RoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutCreatedByUserInput | Nx00RoleCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00RoleUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00RoleUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00RoleCreateManyCreatedByUserInputEnvelope
    set?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    disconnect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    delete?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    update?: Nx00RoleUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00RoleUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00RoleUpdateManyWithWhereWithoutCreatedByUserInput | Nx00RoleUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
  }

  export type Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput> | Nx00RoleCreateWithoutUpdatedByUserInput[] | Nx00RoleUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUpdatedByUserInput | Nx00RoleCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00RoleUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00RoleUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00RoleCreateManyUpdatedByUserInputEnvelope
    set?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    disconnect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    delete?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    update?: Nx00RoleUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00RoleUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00RoleUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00RoleUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
  }

  export type Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput> | Nx00UserRoleCreateWithoutCreatedByUserInput[] | Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput | Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00UserRoleUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00UserRoleCreateManyCreatedByUserInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00UserRoleUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutCreatedByUserInput | Nx00UserRoleUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00BrandUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput> | Nx00BrandCreateWithoutCreatedByUserInput[] | Nx00BrandUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutCreatedByUserInput | Nx00BrandCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00BrandUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00BrandUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00BrandCreateManyCreatedByUserInputEnvelope
    set?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    disconnect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    delete?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    update?: Nx00BrandUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00BrandUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00BrandUpdateManyWithWhereWithoutCreatedByUserInput | Nx00BrandUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
  }

  export type Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput> | Nx00BrandCreateWithoutUpdatedByUserInput[] | Nx00BrandUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutUpdatedByUserInput | Nx00BrandCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00BrandUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00BrandUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00BrandCreateManyUpdatedByUserInputEnvelope
    set?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    disconnect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    delete?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    update?: Nx00BrandUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00BrandUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00BrandUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00BrandUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
  }

  export type Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput> | Nx00FunctionGroupCreateWithoutCreatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00FunctionGroupUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00FunctionGroupUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyCreatedByUserInputEnvelope
    set?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    disconnect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    delete?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    update?: Nx00FunctionGroupUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00FunctionGroupUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00FunctionGroupUpdateManyWithWhereWithoutCreatedByUserInput | Nx00FunctionGroupUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
  }

  export type Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput> | Nx00FunctionGroupCreateWithoutUpdatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00FunctionGroupUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00FunctionGroupUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyUpdatedByUserInputEnvelope
    set?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    disconnect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    delete?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    update?: Nx00FunctionGroupUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00FunctionGroupUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00FunctionGroupUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00FunctionGroupUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
  }

  export type Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput> | Nx00PartStatusCreateWithoutCreatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput | Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00PartStatusUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00PartStatusUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyCreatedByUserInputEnvelope
    set?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    disconnect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    delete?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    update?: Nx00PartStatusUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00PartStatusUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00PartStatusUpdateManyWithWhereWithoutCreatedByUserInput | Nx00PartStatusUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
  }

  export type Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartStatusCreateWithoutUpdatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput | Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00PartStatusUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartStatusUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyUpdatedByUserInputEnvelope
    set?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    disconnect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    delete?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    update?: Nx00PartStatusUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartStatusUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00PartStatusUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00PartStatusUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
  }

  export type Nx00PartUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput> | Nx00PartCreateWithoutCreatedByUserInput[] | Nx00PartUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutCreatedByUserInput | Nx00PartCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00PartUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00PartCreateManyCreatedByUserInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00PartUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutCreatedByUserInput | Nx00PartUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00PartUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartCreateWithoutUpdatedByUserInput[] | Nx00PartUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutUpdatedByUserInput | Nx00PartCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00PartCreateManyUpdatedByUserInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00PartUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput> | Nx00UserCreateWithoutCreatedByUserInput[] | Nx00UserUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutCreatedByUserInput | Nx00UserCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00UserUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00UserUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00UserCreateManyCreatedByUserInputEnvelope
    set?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    disconnect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    delete?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    update?: Nx00UserUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00UserUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00UserUpdateManyWithWhereWithoutCreatedByUserInput | Nx00UserUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
  }

  export type Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput> | Nx00UserCreateWithoutUpdatedByUserInput[] | Nx00UserUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUpdatedByUserInput | Nx00UserCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00UserUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00UserUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00UserCreateManyUpdatedByUserInputEnvelope
    set?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    disconnect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    delete?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    connect?: Nx00UserWhereUniqueInput | Nx00UserWhereUniqueInput[]
    update?: Nx00UserUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00UserUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00UserUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00UserUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput> | Nx00UserRoleCreateWithoutUserInput[] | Nx00UserRoleUncheckedCreateWithoutUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutUserInput | Nx00UserRoleCreateOrConnectWithoutUserInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutUserInput | Nx00UserRoleUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: Nx00UserRoleCreateManyUserInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutUserInput | Nx00UserRoleUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutUserInput | Nx00UserRoleUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput> | Nx00RoleCreateWithoutCreatedByUserInput[] | Nx00RoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutCreatedByUserInput | Nx00RoleCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00RoleUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00RoleUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00RoleCreateManyCreatedByUserInputEnvelope
    set?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    disconnect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    delete?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    update?: Nx00RoleUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00RoleUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00RoleUpdateManyWithWhereWithoutCreatedByUserInput | Nx00RoleUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
  }

  export type Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput> | Nx00RoleCreateWithoutUpdatedByUserInput[] | Nx00RoleUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUpdatedByUserInput | Nx00RoleCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00RoleUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00RoleUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00RoleCreateManyUpdatedByUserInputEnvelope
    set?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    disconnect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    delete?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    connect?: Nx00RoleWhereUniqueInput | Nx00RoleWhereUniqueInput[]
    update?: Nx00RoleUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00RoleUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00RoleUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00RoleUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput> | Nx00UserRoleCreateWithoutCreatedByUserInput[] | Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput | Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00UserRoleUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00UserRoleCreateManyCreatedByUserInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00UserRoleUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutCreatedByUserInput | Nx00UserRoleUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput> | Nx00BrandCreateWithoutCreatedByUserInput[] | Nx00BrandUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutCreatedByUserInput | Nx00BrandCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00BrandUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00BrandUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00BrandCreateManyCreatedByUserInputEnvelope
    set?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    disconnect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    delete?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    update?: Nx00BrandUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00BrandUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00BrandUpdateManyWithWhereWithoutCreatedByUserInput | Nx00BrandUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
  }

  export type Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput> | Nx00BrandCreateWithoutUpdatedByUserInput[] | Nx00BrandUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutUpdatedByUserInput | Nx00BrandCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00BrandUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00BrandUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00BrandCreateManyUpdatedByUserInputEnvelope
    set?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    disconnect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    delete?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    connect?: Nx00BrandWhereUniqueInput | Nx00BrandWhereUniqueInput[]
    update?: Nx00BrandUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00BrandUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00BrandUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00BrandUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
  }

  export type Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput> | Nx00FunctionGroupCreateWithoutCreatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00FunctionGroupUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00FunctionGroupUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyCreatedByUserInputEnvelope
    set?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    disconnect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    delete?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    update?: Nx00FunctionGroupUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00FunctionGroupUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00FunctionGroupUpdateManyWithWhereWithoutCreatedByUserInput | Nx00FunctionGroupUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
  }

  export type Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput> | Nx00FunctionGroupCreateWithoutUpdatedByUserInput[] | Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput | Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00FunctionGroupUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00FunctionGroupUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00FunctionGroupCreateManyUpdatedByUserInputEnvelope
    set?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    disconnect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    delete?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    connect?: Nx00FunctionGroupWhereUniqueInput | Nx00FunctionGroupWhereUniqueInput[]
    update?: Nx00FunctionGroupUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00FunctionGroupUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00FunctionGroupUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00FunctionGroupUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
  }

  export type Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput> | Nx00PartStatusCreateWithoutCreatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput | Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00PartStatusUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00PartStatusUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyCreatedByUserInputEnvelope
    set?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    disconnect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    delete?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    update?: Nx00PartStatusUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00PartStatusUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00PartStatusUpdateManyWithWhereWithoutCreatedByUserInput | Nx00PartStatusUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
  }

  export type Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartStatusCreateWithoutUpdatedByUserInput[] | Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput | Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00PartStatusUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartStatusUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00PartStatusCreateManyUpdatedByUserInputEnvelope
    set?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    disconnect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    delete?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    connect?: Nx00PartStatusWhereUniqueInput | Nx00PartStatusWhereUniqueInput[]
    update?: Nx00PartStatusUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartStatusUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00PartStatusUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00PartStatusUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
  }

  export type Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput = {
    create?: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput> | Nx00PartCreateWithoutCreatedByUserInput[] | Nx00PartUncheckedCreateWithoutCreatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutCreatedByUserInput | Nx00PartCreateOrConnectWithoutCreatedByUserInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutCreatedByUserInput | Nx00PartUpsertWithWhereUniqueWithoutCreatedByUserInput[]
    createMany?: Nx00PartCreateManyCreatedByUserInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutCreatedByUserInput | Nx00PartUpdateWithWhereUniqueWithoutCreatedByUserInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutCreatedByUserInput | Nx00PartUpdateManyWithWhereWithoutCreatedByUserInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput = {
    create?: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput> | Nx00PartCreateWithoutUpdatedByUserInput[] | Nx00PartUncheckedCreateWithoutUpdatedByUserInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutUpdatedByUserInput | Nx00PartCreateOrConnectWithoutUpdatedByUserInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartUpsertWithWhereUniqueWithoutUpdatedByUserInput[]
    createMany?: Nx00PartCreateManyUpdatedByUserInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutUpdatedByUserInput | Nx00PartUpdateWithWhereUniqueWithoutUpdatedByUserInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutUpdatedByUserInput | Nx00PartUpdateManyWithWhereWithoutUpdatedByUserInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00UserCreateNestedOneWithoutRolesCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutRolesCreatedInput, Nx00UserUncheckedCreateWithoutRolesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutRolesCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutRolesUpdatedInput = {
    create?: XOR<Nx00UserCreateWithoutRolesUpdatedInput, Nx00UserUncheckedCreateWithoutRolesUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutRolesUpdatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserRoleCreateNestedManyWithoutRoleInput = {
    create?: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput> | Nx00UserRoleCreateWithoutRoleInput[] | Nx00UserRoleUncheckedCreateWithoutRoleInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutRoleInput | Nx00UserRoleCreateOrConnectWithoutRoleInput[]
    createMany?: Nx00UserRoleCreateManyRoleInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00UserRoleUncheckedCreateNestedManyWithoutRoleInput = {
    create?: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput> | Nx00UserRoleCreateWithoutRoleInput[] | Nx00UserRoleUncheckedCreateWithoutRoleInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutRoleInput | Nx00UserRoleCreateOrConnectWithoutRoleInput[]
    createMany?: Nx00UserRoleCreateManyRoleInputEnvelope
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
  }

  export type Nx00UserUpdateOneWithoutRolesCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutRolesCreatedInput, Nx00UserUncheckedCreateWithoutRolesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutRolesCreatedInput
    upsert?: Nx00UserUpsertWithoutRolesCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutRolesCreatedInput, Nx00UserUpdateWithoutRolesCreatedInput>, Nx00UserUncheckedUpdateWithoutRolesCreatedInput>
  }

  export type Nx00UserUpdateOneWithoutRolesUpdatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutRolesUpdatedInput, Nx00UserUncheckedCreateWithoutRolesUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutRolesUpdatedInput
    upsert?: Nx00UserUpsertWithoutRolesUpdatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutRolesUpdatedInput, Nx00UserUpdateWithoutRolesUpdatedInput>, Nx00UserUncheckedUpdateWithoutRolesUpdatedInput>
  }

  export type Nx00UserRoleUpdateManyWithoutRoleNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput> | Nx00UserRoleCreateWithoutRoleInput[] | Nx00UserRoleUncheckedCreateWithoutRoleInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutRoleInput | Nx00UserRoleCreateOrConnectWithoutRoleInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutRoleInput | Nx00UserRoleUpsertWithWhereUniqueWithoutRoleInput[]
    createMany?: Nx00UserRoleCreateManyRoleInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutRoleInput | Nx00UserRoleUpdateWithWhereUniqueWithoutRoleInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutRoleInput | Nx00UserRoleUpdateManyWithWhereWithoutRoleInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutRoleNestedInput = {
    create?: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput> | Nx00UserRoleCreateWithoutRoleInput[] | Nx00UserRoleUncheckedCreateWithoutRoleInput[]
    connectOrCreate?: Nx00UserRoleCreateOrConnectWithoutRoleInput | Nx00UserRoleCreateOrConnectWithoutRoleInput[]
    upsert?: Nx00UserRoleUpsertWithWhereUniqueWithoutRoleInput | Nx00UserRoleUpsertWithWhereUniqueWithoutRoleInput[]
    createMany?: Nx00UserRoleCreateManyRoleInputEnvelope
    set?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    disconnect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    delete?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    connect?: Nx00UserRoleWhereUniqueInput | Nx00UserRoleWhereUniqueInput[]
    update?: Nx00UserRoleUpdateWithWhereUniqueWithoutRoleInput | Nx00UserRoleUpdateWithWhereUniqueWithoutRoleInput[]
    updateMany?: Nx00UserRoleUpdateManyWithWhereWithoutRoleInput | Nx00UserRoleUpdateManyWithWhereWithoutRoleInput[]
    deleteMany?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
  }

  export type Nx00UserCreateNestedOneWithoutUserRolesInput = {
    create?: XOR<Nx00UserCreateWithoutUserRolesInput, Nx00UserUncheckedCreateWithoutUserRolesInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUserRolesInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00RoleCreateNestedOneWithoutUserRolesInput = {
    create?: XOR<Nx00RoleCreateWithoutUserRolesInput, Nx00RoleUncheckedCreateWithoutUserRolesInput>
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUserRolesInput
    connect?: Nx00RoleWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutUserRolesCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutUserRolesCreatedInput, Nx00UserUncheckedCreateWithoutUserRolesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUserRolesCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserUpdateOneRequiredWithoutUserRolesNestedInput = {
    create?: XOR<Nx00UserCreateWithoutUserRolesInput, Nx00UserUncheckedCreateWithoutUserRolesInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUserRolesInput
    upsert?: Nx00UserUpsertWithoutUserRolesInput
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutUserRolesInput, Nx00UserUpdateWithoutUserRolesInput>, Nx00UserUncheckedUpdateWithoutUserRolesInput>
  }

  export type Nx00RoleUpdateOneRequiredWithoutUserRolesNestedInput = {
    create?: XOR<Nx00RoleCreateWithoutUserRolesInput, Nx00RoleUncheckedCreateWithoutUserRolesInput>
    connectOrCreate?: Nx00RoleCreateOrConnectWithoutUserRolesInput
    upsert?: Nx00RoleUpsertWithoutUserRolesInput
    connect?: Nx00RoleWhereUniqueInput
    update?: XOR<XOR<Nx00RoleUpdateToOneWithWhereWithoutUserRolesInput, Nx00RoleUpdateWithoutUserRolesInput>, Nx00RoleUncheckedUpdateWithoutUserRolesInput>
  }

  export type Nx00UserUpdateOneWithoutUserRolesCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutUserRolesCreatedInput, Nx00UserUncheckedCreateWithoutUserRolesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutUserRolesCreatedInput
    upsert?: Nx00UserUpsertWithoutUserRolesCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutUserRolesCreatedInput, Nx00UserUpdateWithoutUserRolesCreatedInput>, Nx00UserUncheckedUpdateWithoutUserRolesCreatedInput>
  }

  export type Nx00UserCreateNestedOneWithoutBrandsCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutBrandsCreatedInput, Nx00UserUncheckedCreateWithoutBrandsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutBrandsCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutBrandsUpdatedInput = {
    create?: XOR<Nx00UserCreateWithoutBrandsUpdatedInput, Nx00UserUncheckedCreateWithoutBrandsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutBrandsUpdatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00PartCreateNestedManyWithoutBrandInput = {
    create?: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput> | Nx00PartCreateWithoutBrandInput[] | Nx00PartUncheckedCreateWithoutBrandInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutBrandInput | Nx00PartCreateOrConnectWithoutBrandInput[]
    createMany?: Nx00PartCreateManyBrandInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00PartUncheckedCreateNestedManyWithoutBrandInput = {
    create?: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput> | Nx00PartCreateWithoutBrandInput[] | Nx00PartUncheckedCreateWithoutBrandInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutBrandInput | Nx00PartCreateOrConnectWithoutBrandInput[]
    createMany?: Nx00PartCreateManyBrandInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00UserUpdateOneWithoutBrandsCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutBrandsCreatedInput, Nx00UserUncheckedCreateWithoutBrandsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutBrandsCreatedInput
    upsert?: Nx00UserUpsertWithoutBrandsCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutBrandsCreatedInput, Nx00UserUpdateWithoutBrandsCreatedInput>, Nx00UserUncheckedUpdateWithoutBrandsCreatedInput>
  }

  export type Nx00UserUpdateOneWithoutBrandsUpdatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutBrandsUpdatedInput, Nx00UserUncheckedCreateWithoutBrandsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutBrandsUpdatedInput
    upsert?: Nx00UserUpsertWithoutBrandsUpdatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutBrandsUpdatedInput, Nx00UserUpdateWithoutBrandsUpdatedInput>, Nx00UserUncheckedUpdateWithoutBrandsUpdatedInput>
  }

  export type Nx00PartUpdateManyWithoutBrandNestedInput = {
    create?: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput> | Nx00PartCreateWithoutBrandInput[] | Nx00PartUncheckedCreateWithoutBrandInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutBrandInput | Nx00PartCreateOrConnectWithoutBrandInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutBrandInput | Nx00PartUpsertWithWhereUniqueWithoutBrandInput[]
    createMany?: Nx00PartCreateManyBrandInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutBrandInput | Nx00PartUpdateWithWhereUniqueWithoutBrandInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutBrandInput | Nx00PartUpdateManyWithWhereWithoutBrandInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00PartUncheckedUpdateManyWithoutBrandNestedInput = {
    create?: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput> | Nx00PartCreateWithoutBrandInput[] | Nx00PartUncheckedCreateWithoutBrandInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutBrandInput | Nx00PartCreateOrConnectWithoutBrandInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutBrandInput | Nx00PartUpsertWithWhereUniqueWithoutBrandInput[]
    createMany?: Nx00PartCreateManyBrandInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutBrandInput | Nx00PartUpdateWithWhereUniqueWithoutBrandInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutBrandInput | Nx00PartUpdateManyWithWhereWithoutBrandInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00UserCreateNestedOneWithoutFunctionGroupsCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutFunctionGroupsCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutFunctionGroupsUpdatedInput = {
    create?: XOR<Nx00UserCreateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutFunctionGroupsUpdatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00PartCreateNestedManyWithoutFunctionGroupInput = {
    create?: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput> | Nx00PartCreateWithoutFunctionGroupInput[] | Nx00PartUncheckedCreateWithoutFunctionGroupInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutFunctionGroupInput | Nx00PartCreateOrConnectWithoutFunctionGroupInput[]
    createMany?: Nx00PartCreateManyFunctionGroupInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00PartUncheckedCreateNestedManyWithoutFunctionGroupInput = {
    create?: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput> | Nx00PartCreateWithoutFunctionGroupInput[] | Nx00PartUncheckedCreateWithoutFunctionGroupInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutFunctionGroupInput | Nx00PartCreateOrConnectWithoutFunctionGroupInput[]
    createMany?: Nx00PartCreateManyFunctionGroupInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type Nx00UserUpdateOneWithoutFunctionGroupsCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutFunctionGroupsCreatedInput
    upsert?: Nx00UserUpsertWithoutFunctionGroupsCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutFunctionGroupsCreatedInput, Nx00UserUpdateWithoutFunctionGroupsCreatedInput>, Nx00UserUncheckedUpdateWithoutFunctionGroupsCreatedInput>
  }

  export type Nx00UserUpdateOneWithoutFunctionGroupsUpdatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutFunctionGroupsUpdatedInput
    upsert?: Nx00UserUpsertWithoutFunctionGroupsUpdatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutFunctionGroupsUpdatedInput, Nx00UserUpdateWithoutFunctionGroupsUpdatedInput>, Nx00UserUncheckedUpdateWithoutFunctionGroupsUpdatedInput>
  }

  export type Nx00PartUpdateManyWithoutFunctionGroupNestedInput = {
    create?: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput> | Nx00PartCreateWithoutFunctionGroupInput[] | Nx00PartUncheckedCreateWithoutFunctionGroupInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutFunctionGroupInput | Nx00PartCreateOrConnectWithoutFunctionGroupInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutFunctionGroupInput | Nx00PartUpsertWithWhereUniqueWithoutFunctionGroupInput[]
    createMany?: Nx00PartCreateManyFunctionGroupInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutFunctionGroupInput | Nx00PartUpdateWithWhereUniqueWithoutFunctionGroupInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutFunctionGroupInput | Nx00PartUpdateManyWithWhereWithoutFunctionGroupInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00PartUncheckedUpdateManyWithoutFunctionGroupNestedInput = {
    create?: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput> | Nx00PartCreateWithoutFunctionGroupInput[] | Nx00PartUncheckedCreateWithoutFunctionGroupInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutFunctionGroupInput | Nx00PartCreateOrConnectWithoutFunctionGroupInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutFunctionGroupInput | Nx00PartUpsertWithWhereUniqueWithoutFunctionGroupInput[]
    createMany?: Nx00PartCreateManyFunctionGroupInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutFunctionGroupInput | Nx00PartUpdateWithWhereUniqueWithoutFunctionGroupInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutFunctionGroupInput | Nx00PartUpdateManyWithWhereWithoutFunctionGroupInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00UserCreateNestedOneWithoutPartStatusesCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutPartStatusesCreatedInput, Nx00UserUncheckedCreateWithoutPartStatusesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartStatusesCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutPartStatusesUpdatedInput = {
    create?: XOR<Nx00UserCreateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedCreateWithoutPartStatusesUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartStatusesUpdatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00PartCreateNestedManyWithoutStatusInput = {
    create?: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput> | Nx00PartCreateWithoutStatusInput[] | Nx00PartUncheckedCreateWithoutStatusInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutStatusInput | Nx00PartCreateOrConnectWithoutStatusInput[]
    createMany?: Nx00PartCreateManyStatusInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00PartUncheckedCreateNestedManyWithoutStatusInput = {
    create?: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput> | Nx00PartCreateWithoutStatusInput[] | Nx00PartUncheckedCreateWithoutStatusInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutStatusInput | Nx00PartCreateOrConnectWithoutStatusInput[]
    createMany?: Nx00PartCreateManyStatusInputEnvelope
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
  }

  export type Nx00UserUpdateOneWithoutPartStatusesCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutPartStatusesCreatedInput, Nx00UserUncheckedCreateWithoutPartStatusesCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartStatusesCreatedInput
    upsert?: Nx00UserUpsertWithoutPartStatusesCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutPartStatusesCreatedInput, Nx00UserUpdateWithoutPartStatusesCreatedInput>, Nx00UserUncheckedUpdateWithoutPartStatusesCreatedInput>
  }

  export type Nx00UserUpdateOneWithoutPartStatusesUpdatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedCreateWithoutPartStatusesUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartStatusesUpdatedInput
    upsert?: Nx00UserUpsertWithoutPartStatusesUpdatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutPartStatusesUpdatedInput, Nx00UserUpdateWithoutPartStatusesUpdatedInput>, Nx00UserUncheckedUpdateWithoutPartStatusesUpdatedInput>
  }

  export type Nx00PartUpdateManyWithoutStatusNestedInput = {
    create?: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput> | Nx00PartCreateWithoutStatusInput[] | Nx00PartUncheckedCreateWithoutStatusInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutStatusInput | Nx00PartCreateOrConnectWithoutStatusInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutStatusInput | Nx00PartUpsertWithWhereUniqueWithoutStatusInput[]
    createMany?: Nx00PartCreateManyStatusInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutStatusInput | Nx00PartUpdateWithWhereUniqueWithoutStatusInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutStatusInput | Nx00PartUpdateManyWithWhereWithoutStatusInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00PartUncheckedUpdateManyWithoutStatusNestedInput = {
    create?: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput> | Nx00PartCreateWithoutStatusInput[] | Nx00PartUncheckedCreateWithoutStatusInput[]
    connectOrCreate?: Nx00PartCreateOrConnectWithoutStatusInput | Nx00PartCreateOrConnectWithoutStatusInput[]
    upsert?: Nx00PartUpsertWithWhereUniqueWithoutStatusInput | Nx00PartUpsertWithWhereUniqueWithoutStatusInput[]
    createMany?: Nx00PartCreateManyStatusInputEnvelope
    set?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    disconnect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    delete?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    connect?: Nx00PartWhereUniqueInput | Nx00PartWhereUniqueInput[]
    update?: Nx00PartUpdateWithWhereUniqueWithoutStatusInput | Nx00PartUpdateWithWhereUniqueWithoutStatusInput[]
    updateMany?: Nx00PartUpdateManyWithWhereWithoutStatusInput | Nx00PartUpdateManyWithWhereWithoutStatusInput[]
    deleteMany?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
  }

  export type Nx00BrandCreateNestedOneWithoutPartsInput = {
    create?: XOR<Nx00BrandCreateWithoutPartsInput, Nx00BrandUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutPartsInput
    connect?: Nx00BrandWhereUniqueInput
  }

  export type Nx00FunctionGroupCreateNestedOneWithoutPartsInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutPartsInput, Nx00FunctionGroupUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutPartsInput
    connect?: Nx00FunctionGroupWhereUniqueInput
  }

  export type Nx00PartStatusCreateNestedOneWithoutPartsInput = {
    create?: XOR<Nx00PartStatusCreateWithoutPartsInput, Nx00PartStatusUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutPartsInput
    connect?: Nx00PartStatusWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutPartsCreatedInput = {
    create?: XOR<Nx00UserCreateWithoutPartsCreatedInput, Nx00UserUncheckedCreateWithoutPartsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartsCreatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00UserCreateNestedOneWithoutPartsUpdatedInput = {
    create?: XOR<Nx00UserCreateWithoutPartsUpdatedInput, Nx00UserUncheckedCreateWithoutPartsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartsUpdatedInput
    connect?: Nx00UserWhereUniqueInput
  }

  export type Nx00BrandUpdateOneRequiredWithoutPartsNestedInput = {
    create?: XOR<Nx00BrandCreateWithoutPartsInput, Nx00BrandUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00BrandCreateOrConnectWithoutPartsInput
    upsert?: Nx00BrandUpsertWithoutPartsInput
    connect?: Nx00BrandWhereUniqueInput
    update?: XOR<XOR<Nx00BrandUpdateToOneWithWhereWithoutPartsInput, Nx00BrandUpdateWithoutPartsInput>, Nx00BrandUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00FunctionGroupUpdateOneWithoutPartsNestedInput = {
    create?: XOR<Nx00FunctionGroupCreateWithoutPartsInput, Nx00FunctionGroupUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00FunctionGroupCreateOrConnectWithoutPartsInput
    upsert?: Nx00FunctionGroupUpsertWithoutPartsInput
    disconnect?: Nx00FunctionGroupWhereInput | boolean
    delete?: Nx00FunctionGroupWhereInput | boolean
    connect?: Nx00FunctionGroupWhereUniqueInput
    update?: XOR<XOR<Nx00FunctionGroupUpdateToOneWithWhereWithoutPartsInput, Nx00FunctionGroupUpdateWithoutPartsInput>, Nx00FunctionGroupUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput = {
    create?: XOR<Nx00PartStatusCreateWithoutPartsInput, Nx00PartStatusUncheckedCreateWithoutPartsInput>
    connectOrCreate?: Nx00PartStatusCreateOrConnectWithoutPartsInput
    upsert?: Nx00PartStatusUpsertWithoutPartsInput
    connect?: Nx00PartStatusWhereUniqueInput
    update?: XOR<XOR<Nx00PartStatusUpdateToOneWithWhereWithoutPartsInput, Nx00PartStatusUpdateWithoutPartsInput>, Nx00PartStatusUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00UserUpdateOneWithoutPartsCreatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutPartsCreatedInput, Nx00UserUncheckedCreateWithoutPartsCreatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartsCreatedInput
    upsert?: Nx00UserUpsertWithoutPartsCreatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutPartsCreatedInput, Nx00UserUpdateWithoutPartsCreatedInput>, Nx00UserUncheckedUpdateWithoutPartsCreatedInput>
  }

  export type Nx00UserUpdateOneWithoutPartsUpdatedNestedInput = {
    create?: XOR<Nx00UserCreateWithoutPartsUpdatedInput, Nx00UserUncheckedCreateWithoutPartsUpdatedInput>
    connectOrCreate?: Nx00UserCreateOrConnectWithoutPartsUpdatedInput
    upsert?: Nx00UserUpsertWithoutPartsUpdatedInput
    disconnect?: Nx00UserWhereInput | boolean
    delete?: Nx00UserWhereInput | boolean
    connect?: Nx00UserWhereUniqueInput
    update?: XOR<XOR<Nx00UserUpdateToOneWithWhereWithoutPartsUpdatedInput, Nx00UserUpdateWithoutPartsUpdatedInput>, Nx00UserUncheckedUpdateWithoutPartsUpdatedInput>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type Nx00UserCreateWithoutCreatedUsersInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutCreatedUsersInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutCreatedUsersInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutCreatedUsersInput, Nx00UserUncheckedCreateWithoutCreatedUsersInput>
  }

  export type Nx00UserCreateWithoutUpdatedUsersInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutUpdatedUsersInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutUpdatedUsersInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutUpdatedUsersInput, Nx00UserUncheckedCreateWithoutUpdatedUsersInput>
  }

  export type Nx00UserCreateWithoutCreatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00UserCreateManyCreatedByUserInputEnvelope = {
    data: Nx00UserCreateManyCreatedByUserInput | Nx00UserCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserCreateWithoutUpdatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00UserCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00UserCreateManyUpdatedByUserInput | Nx00UserCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserRoleCreateWithoutUserInput = {
    id?: string
    createdAt?: Date | string
    role: Nx00RoleCreateNestedOneWithoutUserRolesInput
    createdByUser?: Nx00UserCreateNestedOneWithoutUserRolesCreatedInput
  }

  export type Nx00UserRoleUncheckedCreateWithoutUserInput = {
    id?: string
    roleId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00UserRoleCreateOrConnectWithoutUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    create: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput>
  }

  export type Nx00UserRoleCreateManyUserInputEnvelope = {
    data: Nx00UserRoleCreateManyUserInput | Nx00UserRoleCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00RoleCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedByUser?: Nx00UserCreateNestedOneWithoutRolesUpdatedInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    create: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00RoleCreateManyCreatedByUserInputEnvelope = {
    data: Nx00RoleCreateManyCreatedByUserInput | Nx00RoleCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00RoleCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutRolesCreatedInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutRoleInput
  }

  export type Nx00RoleCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    create: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00RoleCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00RoleCreateManyUpdatedByUserInput | Nx00RoleCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserRoleCreateWithoutCreatedByUserInput = {
    id?: string
    createdAt?: Date | string
    user: Nx00UserCreateNestedOneWithoutUserRolesInput
    role: Nx00RoleCreateNestedOneWithoutUserRolesInput
  }

  export type Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    userId: string
    roleId: string
    createdAt?: Date | string
  }

  export type Nx00UserRoleCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    create: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00UserRoleCreateManyCreatedByUserInputEnvelope = {
    data: Nx00UserRoleCreateManyCreatedByUserInput | Nx00UserRoleCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00BrandCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedByUser?: Nx00UserCreateNestedOneWithoutBrandsUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    create: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00BrandCreateManyCreatedByUserInputEnvelope = {
    data: Nx00BrandCreateManyCreatedByUserInput | Nx00BrandCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00BrandCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutBrandsCreatedInput
    parts?: Nx00PartCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutBrandInput
  }

  export type Nx00BrandCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    create: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00BrandCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00BrandCreateManyUpdatedByUserInput | Nx00BrandCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00FunctionGroupCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    create: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00FunctionGroupCreateManyCreatedByUserInputEnvelope = {
    data: Nx00FunctionGroupCreateManyCreatedByUserInput | Nx00FunctionGroupCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00FunctionGroupCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsCreatedInput
    parts?: Nx00PartCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutFunctionGroupInput
  }

  export type Nx00FunctionGroupCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    create: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00FunctionGroupCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00FunctionGroupCreateManyUpdatedByUserInput | Nx00FunctionGroupCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00PartStatusCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartStatusesUpdatedInput
    parts?: Nx00PartCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    create: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00PartStatusCreateManyCreatedByUserInputEnvelope = {
    data: Nx00PartStatusCreateManyCreatedByUserInput | Nx00PartStatusCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00PartStatusCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutPartStatusesCreatedInput
    parts?: Nx00PartCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    parts?: Nx00PartUncheckedCreateNestedManyWithoutStatusInput
  }

  export type Nx00PartStatusCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    create: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00PartStatusCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00PartStatusCreateManyUpdatedByUserInput | Nx00PartStatusCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00PartCreateWithoutCreatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    brand: Nx00BrandCreateNestedOneWithoutPartsInput
    functionGroup?: Nx00FunctionGroupCreateNestedOneWithoutPartsInput
    status: Nx00PartStatusCreateNestedOneWithoutPartsInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartsUpdatedInput
  }

  export type Nx00PartUncheckedCreateWithoutCreatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartCreateOrConnectWithoutCreatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    create: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00PartCreateManyCreatedByUserInputEnvelope = {
    data: Nx00PartCreateManyCreatedByUserInput | Nx00PartCreateManyCreatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00PartCreateWithoutUpdatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    brand: Nx00BrandCreateNestedOneWithoutPartsInput
    functionGroup?: Nx00FunctionGroupCreateNestedOneWithoutPartsInput
    status: Nx00PartStatusCreateNestedOneWithoutPartsInput
    createdByUser?: Nx00UserCreateNestedOneWithoutPartsCreatedInput
  }

  export type Nx00PartUncheckedCreateWithoutUpdatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00PartCreateOrConnectWithoutUpdatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    create: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00PartCreateManyUpdatedByUserInputEnvelope = {
    data: Nx00PartCreateManyUpdatedByUserInput | Nx00PartCreateManyUpdatedByUserInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserUpsertWithoutCreatedUsersInput = {
    update: XOR<Nx00UserUpdateWithoutCreatedUsersInput, Nx00UserUncheckedUpdateWithoutCreatedUsersInput>
    create: XOR<Nx00UserCreateWithoutCreatedUsersInput, Nx00UserUncheckedCreateWithoutCreatedUsersInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutCreatedUsersInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutCreatedUsersInput, Nx00UserUncheckedUpdateWithoutCreatedUsersInput>
  }

  export type Nx00UserUpdateWithoutCreatedUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutCreatedUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutUpdatedUsersInput = {
    update: XOR<Nx00UserUpdateWithoutUpdatedUsersInput, Nx00UserUncheckedUpdateWithoutUpdatedUsersInput>
    create: XOR<Nx00UserCreateWithoutUpdatedUsersInput, Nx00UserUncheckedCreateWithoutUpdatedUsersInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutUpdatedUsersInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutUpdatedUsersInput, Nx00UserUncheckedUpdateWithoutUpdatedUsersInput>
  }

  export type Nx00UserUpdateWithoutUpdatedUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutUpdatedUsersInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    update: XOR<Nx00UserUpdateWithoutCreatedByUserInput, Nx00UserUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00UserCreateWithoutCreatedByUserInput, Nx00UserUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00UserUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    data: XOR<Nx00UserUpdateWithoutCreatedByUserInput, Nx00UserUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00UserUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00UserScalarWhereInput
    data: XOR<Nx00UserUpdateManyMutationInput, Nx00UserUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00UserScalarWhereInput = {
    AND?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
    OR?: Nx00UserScalarWhereInput[]
    NOT?: Nx00UserScalarWhereInput | Nx00UserScalarWhereInput[]
    id?: StringFilter<"Nx00User"> | string
    username?: StringFilter<"Nx00User"> | string
    passwordHash?: StringFilter<"Nx00User"> | string
    displayName?: StringFilter<"Nx00User"> | string
    email?: StringNullableFilter<"Nx00User"> | string | null
    phone?: StringNullableFilter<"Nx00User"> | string | null
    isActive?: BoolFilter<"Nx00User"> | boolean
    lastLoginAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    statusCode?: StringFilter<"Nx00User"> | string
    remark?: StringNullableFilter<"Nx00User"> | string | null
    createdAt?: DateTimeFilter<"Nx00User"> | Date | string
    createdBy?: StringNullableFilter<"Nx00User"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00User"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00User"> | string | null
  }

  export type Nx00UserUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    update: XOR<Nx00UserUpdateWithoutUpdatedByUserInput, Nx00UserUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00UserCreateWithoutUpdatedByUserInput, Nx00UserUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00UserUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00UserWhereUniqueInput
    data: XOR<Nx00UserUpdateWithoutUpdatedByUserInput, Nx00UserUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00UserUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00UserScalarWhereInput
    data: XOR<Nx00UserUpdateManyMutationInput, Nx00UserUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00UserRoleUpsertWithWhereUniqueWithoutUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    update: XOR<Nx00UserRoleUpdateWithoutUserInput, Nx00UserRoleUncheckedUpdateWithoutUserInput>
    create: XOR<Nx00UserRoleCreateWithoutUserInput, Nx00UserRoleUncheckedCreateWithoutUserInput>
  }

  export type Nx00UserRoleUpdateWithWhereUniqueWithoutUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    data: XOR<Nx00UserRoleUpdateWithoutUserInput, Nx00UserRoleUncheckedUpdateWithoutUserInput>
  }

  export type Nx00UserRoleUpdateManyWithWhereWithoutUserInput = {
    where: Nx00UserRoleScalarWhereInput
    data: XOR<Nx00UserRoleUpdateManyMutationInput, Nx00UserRoleUncheckedUpdateManyWithoutUserInput>
  }

  export type Nx00UserRoleScalarWhereInput = {
    AND?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
    OR?: Nx00UserRoleScalarWhereInput[]
    NOT?: Nx00UserRoleScalarWhereInput | Nx00UserRoleScalarWhereInput[]
    id?: StringFilter<"Nx00UserRole"> | string
    userId?: StringFilter<"Nx00UserRole"> | string
    roleId?: StringFilter<"Nx00UserRole"> | string
    createdAt?: DateTimeFilter<"Nx00UserRole"> | Date | string
    createdBy?: StringNullableFilter<"Nx00UserRole"> | string | null
  }

  export type Nx00RoleUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    update: XOR<Nx00RoleUpdateWithoutCreatedByUserInput, Nx00RoleUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00RoleCreateWithoutCreatedByUserInput, Nx00RoleUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00RoleUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    data: XOR<Nx00RoleUpdateWithoutCreatedByUserInput, Nx00RoleUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00RoleUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00RoleScalarWhereInput
    data: XOR<Nx00RoleUpdateManyMutationInput, Nx00RoleUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00RoleScalarWhereInput = {
    AND?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
    OR?: Nx00RoleScalarWhereInput[]
    NOT?: Nx00RoleScalarWhereInput | Nx00RoleScalarWhereInput[]
    id?: StringFilter<"Nx00Role"> | string
    code?: StringFilter<"Nx00Role"> | string
    name?: StringFilter<"Nx00Role"> | string
    description?: StringNullableFilter<"Nx00Role"> | string | null
    isActive?: BoolFilter<"Nx00Role"> | boolean
    createdAt?: DateTimeFilter<"Nx00Role"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Role"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Role"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Role"> | string | null
  }

  export type Nx00RoleUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    update: XOR<Nx00RoleUpdateWithoutUpdatedByUserInput, Nx00RoleUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00RoleCreateWithoutUpdatedByUserInput, Nx00RoleUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00RoleUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00RoleWhereUniqueInput
    data: XOR<Nx00RoleUpdateWithoutUpdatedByUserInput, Nx00RoleUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00RoleUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00RoleScalarWhereInput
    data: XOR<Nx00RoleUpdateManyMutationInput, Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00UserRoleUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    update: XOR<Nx00UserRoleUpdateWithoutCreatedByUserInput, Nx00UserRoleUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00UserRoleCreateWithoutCreatedByUserInput, Nx00UserRoleUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00UserRoleUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00UserRoleWhereUniqueInput
    data: XOR<Nx00UserRoleUpdateWithoutCreatedByUserInput, Nx00UserRoleUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00UserRoleUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00UserRoleScalarWhereInput
    data: XOR<Nx00UserRoleUpdateManyMutationInput, Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00BrandUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    update: XOR<Nx00BrandUpdateWithoutCreatedByUserInput, Nx00BrandUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00BrandCreateWithoutCreatedByUserInput, Nx00BrandUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00BrandUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    data: XOR<Nx00BrandUpdateWithoutCreatedByUserInput, Nx00BrandUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00BrandUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00BrandScalarWhereInput
    data: XOR<Nx00BrandUpdateManyMutationInput, Nx00BrandUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00BrandScalarWhereInput = {
    AND?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
    OR?: Nx00BrandScalarWhereInput[]
    NOT?: Nx00BrandScalarWhereInput | Nx00BrandScalarWhereInput[]
    id?: StringFilter<"Nx00Brand"> | string
    code?: StringFilter<"Nx00Brand"> | string
    name?: StringFilter<"Nx00Brand"> | string
    nameEn?: StringNullableFilter<"Nx00Brand"> | string | null
    isActive?: BoolFilter<"Nx00Brand"> | boolean
    remark?: StringNullableFilter<"Nx00Brand"> | string | null
    createdAt?: DateTimeFilter<"Nx00Brand"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Brand"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Brand"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Brand"> | string | null
  }

  export type Nx00BrandUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    update: XOR<Nx00BrandUpdateWithoutUpdatedByUserInput, Nx00BrandUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00BrandCreateWithoutUpdatedByUserInput, Nx00BrandUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00BrandUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00BrandWhereUniqueInput
    data: XOR<Nx00BrandUpdateWithoutUpdatedByUserInput, Nx00BrandUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00BrandUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00BrandScalarWhereInput
    data: XOR<Nx00BrandUpdateManyMutationInput, Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00FunctionGroupUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    update: XOR<Nx00FunctionGroupUpdateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00FunctionGroupCreateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00FunctionGroupUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    data: XOR<Nx00FunctionGroupUpdateWithoutCreatedByUserInput, Nx00FunctionGroupUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00FunctionGroupUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00FunctionGroupScalarWhereInput
    data: XOR<Nx00FunctionGroupUpdateManyMutationInput, Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00FunctionGroupScalarWhereInput = {
    AND?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
    OR?: Nx00FunctionGroupScalarWhereInput[]
    NOT?: Nx00FunctionGroupScalarWhereInput | Nx00FunctionGroupScalarWhereInput[]
    id?: StringFilter<"Nx00FunctionGroup"> | string
    code?: StringFilter<"Nx00FunctionGroup"> | string
    name?: StringFilter<"Nx00FunctionGroup"> | string
    description?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    isActive?: BoolFilter<"Nx00FunctionGroup"> | boolean
    sortNo?: IntNullableFilter<"Nx00FunctionGroup"> | number | null
    createdAt?: DateTimeFilter<"Nx00FunctionGroup"> | Date | string
    createdBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00FunctionGroup"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00FunctionGroup"> | string | null
  }

  export type Nx00FunctionGroupUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    update: XOR<Nx00FunctionGroupUpdateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00FunctionGroupCreateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00FunctionGroupUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    data: XOR<Nx00FunctionGroupUpdateWithoutUpdatedByUserInput, Nx00FunctionGroupUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00FunctionGroupUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00FunctionGroupScalarWhereInput
    data: XOR<Nx00FunctionGroupUpdateManyMutationInput, Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00PartStatusUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    update: XOR<Nx00PartStatusUpdateWithoutCreatedByUserInput, Nx00PartStatusUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00PartStatusCreateWithoutCreatedByUserInput, Nx00PartStatusUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00PartStatusUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    data: XOR<Nx00PartStatusUpdateWithoutCreatedByUserInput, Nx00PartStatusUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00PartStatusUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00PartStatusScalarWhereInput
    data: XOR<Nx00PartStatusUpdateManyMutationInput, Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00PartStatusScalarWhereInput = {
    AND?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
    OR?: Nx00PartStatusScalarWhereInput[]
    NOT?: Nx00PartStatusScalarWhereInput | Nx00PartStatusScalarWhereInput[]
    id?: StringFilter<"Nx00PartStatus"> | string
    code?: StringFilter<"Nx00PartStatus"> | string
    name?: StringFilter<"Nx00PartStatus"> | string
    canSell?: BoolFilter<"Nx00PartStatus"> | boolean
    canPurchase?: BoolFilter<"Nx00PartStatus"> | boolean
    isActive?: BoolFilter<"Nx00PartStatus"> | boolean
    remark?: StringNullableFilter<"Nx00PartStatus"> | string | null
    createdAt?: DateTimeFilter<"Nx00PartStatus"> | Date | string
    createdBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00PartStatus"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00PartStatus"> | string | null
  }

  export type Nx00PartStatusUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    update: XOR<Nx00PartStatusUpdateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00PartStatusCreateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00PartStatusUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00PartStatusWhereUniqueInput
    data: XOR<Nx00PartStatusUpdateWithoutUpdatedByUserInput, Nx00PartStatusUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00PartStatusUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00PartStatusScalarWhereInput
    data: XOR<Nx00PartStatusUpdateManyMutationInput, Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00PartUpsertWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    update: XOR<Nx00PartUpdateWithoutCreatedByUserInput, Nx00PartUncheckedUpdateWithoutCreatedByUserInput>
    create: XOR<Nx00PartCreateWithoutCreatedByUserInput, Nx00PartUncheckedCreateWithoutCreatedByUserInput>
  }

  export type Nx00PartUpdateWithWhereUniqueWithoutCreatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    data: XOR<Nx00PartUpdateWithoutCreatedByUserInput, Nx00PartUncheckedUpdateWithoutCreatedByUserInput>
  }

  export type Nx00PartUpdateManyWithWhereWithoutCreatedByUserInput = {
    where: Nx00PartScalarWhereInput
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyWithoutCreatedByUserInput>
  }

  export type Nx00PartScalarWhereInput = {
    AND?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
    OR?: Nx00PartScalarWhereInput[]
    NOT?: Nx00PartScalarWhereInput | Nx00PartScalarWhereInput[]
    id?: StringFilter<"Nx00Part"> | string
    partNo?: StringFilter<"Nx00Part"> | string
    oldPartNo?: StringNullableFilter<"Nx00Part"> | string | null
    displayNo?: StringNullableFilter<"Nx00Part"> | string | null
    nameZh?: StringFilter<"Nx00Part"> | string
    nameEn?: StringNullableFilter<"Nx00Part"> | string | null
    brandId?: StringFilter<"Nx00Part"> | string
    functionGroupId?: StringNullableFilter<"Nx00Part"> | string | null
    statusId?: StringFilter<"Nx00Part"> | string
    barcode?: StringNullableFilter<"Nx00Part"> | string | null
    isActive?: BoolFilter<"Nx00Part"> | boolean
    remark?: StringNullableFilter<"Nx00Part"> | string | null
    createdAt?: DateTimeFilter<"Nx00Part"> | Date | string
    createdBy?: StringNullableFilter<"Nx00Part"> | string | null
    updatedAt?: DateTimeNullableFilter<"Nx00Part"> | Date | string | null
    updatedBy?: StringNullableFilter<"Nx00Part"> | string | null
  }

  export type Nx00PartUpsertWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    update: XOR<Nx00PartUpdateWithoutUpdatedByUserInput, Nx00PartUncheckedUpdateWithoutUpdatedByUserInput>
    create: XOR<Nx00PartCreateWithoutUpdatedByUserInput, Nx00PartUncheckedCreateWithoutUpdatedByUserInput>
  }

  export type Nx00PartUpdateWithWhereUniqueWithoutUpdatedByUserInput = {
    where: Nx00PartWhereUniqueInput
    data: XOR<Nx00PartUpdateWithoutUpdatedByUserInput, Nx00PartUncheckedUpdateWithoutUpdatedByUserInput>
  }

  export type Nx00PartUpdateManyWithWhereWithoutUpdatedByUserInput = {
    where: Nx00PartScalarWhereInput
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyWithoutUpdatedByUserInput>
  }

  export type Nx00UserCreateWithoutRolesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutRolesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutRolesCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutRolesCreatedInput, Nx00UserUncheckedCreateWithoutRolesCreatedInput>
  }

  export type Nx00UserCreateWithoutRolesUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutRolesUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutRolesUpdatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutRolesUpdatedInput, Nx00UserUncheckedCreateWithoutRolesUpdatedInput>
  }

  export type Nx00UserRoleCreateWithoutRoleInput = {
    id?: string
    createdAt?: Date | string
    user: Nx00UserCreateNestedOneWithoutUserRolesInput
    createdByUser?: Nx00UserCreateNestedOneWithoutUserRolesCreatedInput
  }

  export type Nx00UserRoleUncheckedCreateWithoutRoleInput = {
    id?: string
    userId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00UserRoleCreateOrConnectWithoutRoleInput = {
    where: Nx00UserRoleWhereUniqueInput
    create: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput>
  }

  export type Nx00UserRoleCreateManyRoleInputEnvelope = {
    data: Nx00UserRoleCreateManyRoleInput | Nx00UserRoleCreateManyRoleInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserUpsertWithoutRolesCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutRolesCreatedInput, Nx00UserUncheckedUpdateWithoutRolesCreatedInput>
    create: XOR<Nx00UserCreateWithoutRolesCreatedInput, Nx00UserUncheckedCreateWithoutRolesCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutRolesCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutRolesCreatedInput, Nx00UserUncheckedUpdateWithoutRolesCreatedInput>
  }

  export type Nx00UserUpdateWithoutRolesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutRolesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutRolesUpdatedInput = {
    update: XOR<Nx00UserUpdateWithoutRolesUpdatedInput, Nx00UserUncheckedUpdateWithoutRolesUpdatedInput>
    create: XOR<Nx00UserCreateWithoutRolesUpdatedInput, Nx00UserUncheckedCreateWithoutRolesUpdatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutRolesUpdatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutRolesUpdatedInput, Nx00UserUncheckedUpdateWithoutRolesUpdatedInput>
  }

  export type Nx00UserUpdateWithoutRolesUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutRolesUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserRoleUpsertWithWhereUniqueWithoutRoleInput = {
    where: Nx00UserRoleWhereUniqueInput
    update: XOR<Nx00UserRoleUpdateWithoutRoleInput, Nx00UserRoleUncheckedUpdateWithoutRoleInput>
    create: XOR<Nx00UserRoleCreateWithoutRoleInput, Nx00UserRoleUncheckedCreateWithoutRoleInput>
  }

  export type Nx00UserRoleUpdateWithWhereUniqueWithoutRoleInput = {
    where: Nx00UserRoleWhereUniqueInput
    data: XOR<Nx00UserRoleUpdateWithoutRoleInput, Nx00UserRoleUncheckedUpdateWithoutRoleInput>
  }

  export type Nx00UserRoleUpdateManyWithWhereWithoutRoleInput = {
    where: Nx00UserRoleScalarWhereInput
    data: XOR<Nx00UserRoleUpdateManyMutationInput, Nx00UserRoleUncheckedUpdateManyWithoutRoleInput>
  }

  export type Nx00UserCreateWithoutUserRolesInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutUserRolesInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutUserRolesInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutUserRolesInput, Nx00UserUncheckedCreateWithoutUserRolesInput>
  }

  export type Nx00RoleCreateWithoutUserRolesInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutRolesCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutRolesUpdatedInput
  }

  export type Nx00RoleUncheckedCreateWithoutUserRolesInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00RoleCreateOrConnectWithoutUserRolesInput = {
    where: Nx00RoleWhereUniqueInput
    create: XOR<Nx00RoleCreateWithoutUserRolesInput, Nx00RoleUncheckedCreateWithoutUserRolesInput>
  }

  export type Nx00UserCreateWithoutUserRolesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutUserRolesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutUserRolesCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutUserRolesCreatedInput, Nx00UserUncheckedCreateWithoutUserRolesCreatedInput>
  }

  export type Nx00UserUpsertWithoutUserRolesInput = {
    update: XOR<Nx00UserUpdateWithoutUserRolesInput, Nx00UserUncheckedUpdateWithoutUserRolesInput>
    create: XOR<Nx00UserCreateWithoutUserRolesInput, Nx00UserUncheckedCreateWithoutUserRolesInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutUserRolesInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutUserRolesInput, Nx00UserUncheckedUpdateWithoutUserRolesInput>
  }

  export type Nx00UserUpdateWithoutUserRolesInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutUserRolesInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00RoleUpsertWithoutUserRolesInput = {
    update: XOR<Nx00RoleUpdateWithoutUserRolesInput, Nx00RoleUncheckedUpdateWithoutUserRolesInput>
    create: XOR<Nx00RoleCreateWithoutUserRolesInput, Nx00RoleUncheckedCreateWithoutUserRolesInput>
    where?: Nx00RoleWhereInput
  }

  export type Nx00RoleUpdateToOneWithWhereWithoutUserRolesInput = {
    where?: Nx00RoleWhereInput
    data: XOR<Nx00RoleUpdateWithoutUserRolesInput, Nx00RoleUncheckedUpdateWithoutUserRolesInput>
  }

  export type Nx00RoleUpdateWithoutUserRolesInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutRolesCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutRolesUpdatedNestedInput
  }

  export type Nx00RoleUncheckedUpdateWithoutUserRolesInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserUpsertWithoutUserRolesCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutUserRolesCreatedInput, Nx00UserUncheckedUpdateWithoutUserRolesCreatedInput>
    create: XOR<Nx00UserCreateWithoutUserRolesCreatedInput, Nx00UserUncheckedCreateWithoutUserRolesCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutUserRolesCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutUserRolesCreatedInput, Nx00UserUncheckedUpdateWithoutUserRolesCreatedInput>
  }

  export type Nx00UserUpdateWithoutUserRolesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutUserRolesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserCreateWithoutBrandsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutBrandsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutBrandsCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutBrandsCreatedInput, Nx00UserUncheckedCreateWithoutBrandsCreatedInput>
  }

  export type Nx00UserCreateWithoutBrandsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutBrandsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutBrandsUpdatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutBrandsUpdatedInput, Nx00UserUncheckedCreateWithoutBrandsUpdatedInput>
  }

  export type Nx00PartCreateWithoutBrandInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    functionGroup?: Nx00FunctionGroupCreateNestedOneWithoutPartsInput
    status: Nx00PartStatusCreateNestedOneWithoutPartsInput
    createdByUser?: Nx00UserCreateNestedOneWithoutPartsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartsUpdatedInput
  }

  export type Nx00PartUncheckedCreateWithoutBrandInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartCreateOrConnectWithoutBrandInput = {
    where: Nx00PartWhereUniqueInput
    create: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput>
  }

  export type Nx00PartCreateManyBrandInputEnvelope = {
    data: Nx00PartCreateManyBrandInput | Nx00PartCreateManyBrandInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserUpsertWithoutBrandsCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutBrandsCreatedInput, Nx00UserUncheckedUpdateWithoutBrandsCreatedInput>
    create: XOR<Nx00UserCreateWithoutBrandsCreatedInput, Nx00UserUncheckedCreateWithoutBrandsCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutBrandsCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutBrandsCreatedInput, Nx00UserUncheckedUpdateWithoutBrandsCreatedInput>
  }

  export type Nx00UserUpdateWithoutBrandsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutBrandsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutBrandsUpdatedInput = {
    update: XOR<Nx00UserUpdateWithoutBrandsUpdatedInput, Nx00UserUncheckedUpdateWithoutBrandsUpdatedInput>
    create: XOR<Nx00UserCreateWithoutBrandsUpdatedInput, Nx00UserUncheckedCreateWithoutBrandsUpdatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutBrandsUpdatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutBrandsUpdatedInput, Nx00UserUncheckedUpdateWithoutBrandsUpdatedInput>
  }

  export type Nx00UserUpdateWithoutBrandsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutBrandsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00PartUpsertWithWhereUniqueWithoutBrandInput = {
    where: Nx00PartWhereUniqueInput
    update: XOR<Nx00PartUpdateWithoutBrandInput, Nx00PartUncheckedUpdateWithoutBrandInput>
    create: XOR<Nx00PartCreateWithoutBrandInput, Nx00PartUncheckedCreateWithoutBrandInput>
  }

  export type Nx00PartUpdateWithWhereUniqueWithoutBrandInput = {
    where: Nx00PartWhereUniqueInput
    data: XOR<Nx00PartUpdateWithoutBrandInput, Nx00PartUncheckedUpdateWithoutBrandInput>
  }

  export type Nx00PartUpdateManyWithWhereWithoutBrandInput = {
    where: Nx00PartScalarWhereInput
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyWithoutBrandInput>
  }

  export type Nx00UserCreateWithoutFunctionGroupsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutFunctionGroupsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutFunctionGroupsCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsCreatedInput>
  }

  export type Nx00UserCreateWithoutFunctionGroupsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutFunctionGroupsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutFunctionGroupsUpdatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsUpdatedInput>
  }

  export type Nx00PartCreateWithoutFunctionGroupInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    brand: Nx00BrandCreateNestedOneWithoutPartsInput
    status: Nx00PartStatusCreateNestedOneWithoutPartsInput
    createdByUser?: Nx00UserCreateNestedOneWithoutPartsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartsUpdatedInput
  }

  export type Nx00PartUncheckedCreateWithoutFunctionGroupInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartCreateOrConnectWithoutFunctionGroupInput = {
    where: Nx00PartWhereUniqueInput
    create: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput>
  }

  export type Nx00PartCreateManyFunctionGroupInputEnvelope = {
    data: Nx00PartCreateManyFunctionGroupInput | Nx00PartCreateManyFunctionGroupInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserUpsertWithoutFunctionGroupsCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedUpdateWithoutFunctionGroupsCreatedInput>
    create: XOR<Nx00UserCreateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutFunctionGroupsCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutFunctionGroupsCreatedInput, Nx00UserUncheckedUpdateWithoutFunctionGroupsCreatedInput>
  }

  export type Nx00UserUpdateWithoutFunctionGroupsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutFunctionGroupsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutFunctionGroupsUpdatedInput = {
    update: XOR<Nx00UserUpdateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedUpdateWithoutFunctionGroupsUpdatedInput>
    create: XOR<Nx00UserCreateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedCreateWithoutFunctionGroupsUpdatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutFunctionGroupsUpdatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutFunctionGroupsUpdatedInput, Nx00UserUncheckedUpdateWithoutFunctionGroupsUpdatedInput>
  }

  export type Nx00UserUpdateWithoutFunctionGroupsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutFunctionGroupsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00PartUpsertWithWhereUniqueWithoutFunctionGroupInput = {
    where: Nx00PartWhereUniqueInput
    update: XOR<Nx00PartUpdateWithoutFunctionGroupInput, Nx00PartUncheckedUpdateWithoutFunctionGroupInput>
    create: XOR<Nx00PartCreateWithoutFunctionGroupInput, Nx00PartUncheckedCreateWithoutFunctionGroupInput>
  }

  export type Nx00PartUpdateWithWhereUniqueWithoutFunctionGroupInput = {
    where: Nx00PartWhereUniqueInput
    data: XOR<Nx00PartUpdateWithoutFunctionGroupInput, Nx00PartUncheckedUpdateWithoutFunctionGroupInput>
  }

  export type Nx00PartUpdateManyWithWhereWithoutFunctionGroupInput = {
    where: Nx00PartScalarWhereInput
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyWithoutFunctionGroupInput>
  }

  export type Nx00UserCreateWithoutPartStatusesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutPartStatusesCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutPartStatusesCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutPartStatusesCreatedInput, Nx00UserUncheckedCreateWithoutPartStatusesCreatedInput>
  }

  export type Nx00UserCreateWithoutPartStatusesUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutPartStatusesUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutPartStatusesUpdatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedCreateWithoutPartStatusesUpdatedInput>
  }

  export type Nx00PartCreateWithoutStatusInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    brand: Nx00BrandCreateNestedOneWithoutPartsInput
    functionGroup?: Nx00FunctionGroupCreateNestedOneWithoutPartsInput
    createdByUser?: Nx00UserCreateNestedOneWithoutPartsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartsUpdatedInput
  }

  export type Nx00PartUncheckedCreateWithoutStatusInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartCreateOrConnectWithoutStatusInput = {
    where: Nx00PartWhereUniqueInput
    create: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput>
  }

  export type Nx00PartCreateManyStatusInputEnvelope = {
    data: Nx00PartCreateManyStatusInput | Nx00PartCreateManyStatusInput[]
    skipDuplicates?: boolean
  }

  export type Nx00UserUpsertWithoutPartStatusesCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutPartStatusesCreatedInput, Nx00UserUncheckedUpdateWithoutPartStatusesCreatedInput>
    create: XOR<Nx00UserCreateWithoutPartStatusesCreatedInput, Nx00UserUncheckedCreateWithoutPartStatusesCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutPartStatusesCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutPartStatusesCreatedInput, Nx00UserUncheckedUpdateWithoutPartStatusesCreatedInput>
  }

  export type Nx00UserUpdateWithoutPartStatusesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutPartStatusesCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutPartStatusesUpdatedInput = {
    update: XOR<Nx00UserUpdateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedUpdateWithoutPartStatusesUpdatedInput>
    create: XOR<Nx00UserCreateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedCreateWithoutPartStatusesUpdatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutPartStatusesUpdatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutPartStatusesUpdatedInput, Nx00UserUncheckedUpdateWithoutPartStatusesUpdatedInput>
  }

  export type Nx00UserUpdateWithoutPartStatusesUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutPartStatusesUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00PartUpsertWithWhereUniqueWithoutStatusInput = {
    where: Nx00PartWhereUniqueInput
    update: XOR<Nx00PartUpdateWithoutStatusInput, Nx00PartUncheckedUpdateWithoutStatusInput>
    create: XOR<Nx00PartCreateWithoutStatusInput, Nx00PartUncheckedCreateWithoutStatusInput>
  }

  export type Nx00PartUpdateWithWhereUniqueWithoutStatusInput = {
    where: Nx00PartWhereUniqueInput
    data: XOR<Nx00PartUpdateWithoutStatusInput, Nx00PartUncheckedUpdateWithoutStatusInput>
  }

  export type Nx00PartUpdateManyWithWhereWithoutStatusInput = {
    where: Nx00PartScalarWhereInput
    data: XOR<Nx00PartUpdateManyMutationInput, Nx00PartUncheckedUpdateManyWithoutStatusInput>
  }

  export type Nx00BrandCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutBrandsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutBrandsUpdatedInput
  }

  export type Nx00BrandUncheckedCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00BrandCreateOrConnectWithoutPartsInput = {
    where: Nx00BrandWhereUniqueInput
    create: XOR<Nx00BrandCreateWithoutPartsInput, Nx00BrandUncheckedCreateWithoutPartsInput>
  }

  export type Nx00FunctionGroupCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutFunctionGroupsUpdatedInput
  }

  export type Nx00FunctionGroupUncheckedCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00FunctionGroupCreateOrConnectWithoutPartsInput = {
    where: Nx00FunctionGroupWhereUniqueInput
    create: XOR<Nx00FunctionGroupCreateWithoutPartsInput, Nx00FunctionGroupUncheckedCreateWithoutPartsInput>
  }

  export type Nx00PartStatusCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutPartStatusesCreatedInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutPartStatusesUpdatedInput
  }

  export type Nx00PartStatusUncheckedCreateWithoutPartsInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartStatusCreateOrConnectWithoutPartsInput = {
    where: Nx00PartStatusWhereUniqueInput
    create: XOR<Nx00PartStatusCreateWithoutPartsInput, Nx00PartStatusUncheckedCreateWithoutPartsInput>
  }

  export type Nx00UserCreateWithoutPartsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsUpdated?: Nx00PartCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutPartsCreatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsUpdated?: Nx00PartUncheckedCreateNestedManyWithoutUpdatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutPartsCreatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutPartsCreatedInput, Nx00UserUncheckedCreateWithoutPartsCreatedInput>
  }

  export type Nx00UserCreateWithoutPartsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    createdByUser?: Nx00UserCreateNestedOneWithoutCreatedUsersInput
    updatedByUser?: Nx00UserCreateNestedOneWithoutUpdatedUsersInput
    createdUsers?: Nx00UserCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartCreateNestedManyWithoutCreatedByUserInput
  }

  export type Nx00UserUncheckedCreateWithoutPartsUpdatedInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
    createdUsers?: Nx00UserUncheckedCreateNestedManyWithoutCreatedByUserInput
    updatedUsers?: Nx00UserUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRoles?: Nx00UserRoleUncheckedCreateNestedManyWithoutUserInput
    rolesCreated?: Nx00RoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    rolesUpdated?: Nx00RoleUncheckedCreateNestedManyWithoutUpdatedByUserInput
    userRolesCreated?: Nx00UserRoleUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsCreated?: Nx00BrandUncheckedCreateNestedManyWithoutCreatedByUserInput
    brandsUpdated?: Nx00BrandUncheckedCreateNestedManyWithoutUpdatedByUserInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutCreatedByUserInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partStatusesCreated?: Nx00PartStatusUncheckedCreateNestedManyWithoutCreatedByUserInput
    partStatusesUpdated?: Nx00PartStatusUncheckedCreateNestedManyWithoutUpdatedByUserInput
    partsCreated?: Nx00PartUncheckedCreateNestedManyWithoutCreatedByUserInput
  }

  export type Nx00UserCreateOrConnectWithoutPartsUpdatedInput = {
    where: Nx00UserWhereUniqueInput
    create: XOR<Nx00UserCreateWithoutPartsUpdatedInput, Nx00UserUncheckedCreateWithoutPartsUpdatedInput>
  }

  export type Nx00BrandUpsertWithoutPartsInput = {
    update: XOR<Nx00BrandUpdateWithoutPartsInput, Nx00BrandUncheckedUpdateWithoutPartsInput>
    create: XOR<Nx00BrandCreateWithoutPartsInput, Nx00BrandUncheckedCreateWithoutPartsInput>
    where?: Nx00BrandWhereInput
  }

  export type Nx00BrandUpdateToOneWithWhereWithoutPartsInput = {
    where?: Nx00BrandWhereInput
    data: XOR<Nx00BrandUpdateWithoutPartsInput, Nx00BrandUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00BrandUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutBrandsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutBrandsUpdatedNestedInput
  }

  export type Nx00BrandUncheckedUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00FunctionGroupUpsertWithoutPartsInput = {
    update: XOR<Nx00FunctionGroupUpdateWithoutPartsInput, Nx00FunctionGroupUncheckedUpdateWithoutPartsInput>
    create: XOR<Nx00FunctionGroupCreateWithoutPartsInput, Nx00FunctionGroupUncheckedCreateWithoutPartsInput>
    where?: Nx00FunctionGroupWhereInput
  }

  export type Nx00FunctionGroupUpdateToOneWithWhereWithoutPartsInput = {
    where?: Nx00FunctionGroupWhereInput
    data: XOR<Nx00FunctionGroupUpdateWithoutPartsInput, Nx00FunctionGroupUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00FunctionGroupUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutFunctionGroupsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutFunctionGroupsUpdatedNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartStatusUpsertWithoutPartsInput = {
    update: XOR<Nx00PartStatusUpdateWithoutPartsInput, Nx00PartStatusUncheckedUpdateWithoutPartsInput>
    create: XOR<Nx00PartStatusCreateWithoutPartsInput, Nx00PartStatusUncheckedCreateWithoutPartsInput>
    where?: Nx00PartStatusWhereInput
  }

  export type Nx00PartStatusUpdateToOneWithWhereWithoutPartsInput = {
    where?: Nx00PartStatusWhereInput
    data: XOR<Nx00PartStatusUpdateWithoutPartsInput, Nx00PartStatusUncheckedUpdateWithoutPartsInput>
  }

  export type Nx00PartStatusUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutPartStatusesCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartStatusesUpdatedNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateWithoutPartsInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserUpsertWithoutPartsCreatedInput = {
    update: XOR<Nx00UserUpdateWithoutPartsCreatedInput, Nx00UserUncheckedUpdateWithoutPartsCreatedInput>
    create: XOR<Nx00UserCreateWithoutPartsCreatedInput, Nx00UserUncheckedCreateWithoutPartsCreatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutPartsCreatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutPartsCreatedInput, Nx00UserUncheckedUpdateWithoutPartsCreatedInput>
  }

  export type Nx00UserUpdateWithoutPartsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutPartsCreatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUpsertWithoutPartsUpdatedInput = {
    update: XOR<Nx00UserUpdateWithoutPartsUpdatedInput, Nx00UserUncheckedUpdateWithoutPartsUpdatedInput>
    create: XOR<Nx00UserCreateWithoutPartsUpdatedInput, Nx00UserUncheckedCreateWithoutPartsUpdatedInput>
    where?: Nx00UserWhereInput
  }

  export type Nx00UserUpdateToOneWithWhereWithoutPartsUpdatedInput = {
    where?: Nx00UserWhereInput
    data: XOR<Nx00UserUpdateWithoutPartsUpdatedInput, Nx00UserUncheckedUpdateWithoutPartsUpdatedInput>
  }

  export type Nx00UserUpdateWithoutPartsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutPartsUpdatedInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
  }

  export type Nx00UserCreateManyCreatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00UserCreateManyUpdatedByUserInput = {
    id?: string
    username: string
    passwordHash: string
    displayName: string
    email?: string | null
    phone?: string | null
    isActive?: boolean
    lastLoginAt?: Date | string | null
    statusCode?: string
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00UserRoleCreateManyUserInput = {
    id?: string
    roleId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00RoleCreateManyCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00RoleCreateManyUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00UserRoleCreateManyCreatedByUserInput = {
    id?: string
    userId: string
    roleId: string
    createdAt?: Date | string
  }

  export type Nx00BrandCreateManyCreatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00BrandCreateManyUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    nameEn?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00FunctionGroupCreateManyCreatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00FunctionGroupCreateManyUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    description?: string | null
    isActive?: boolean
    sortNo?: number | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00PartStatusCreateManyCreatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartStatusCreateManyUpdatedByUserInput = {
    id?: string
    code: string
    name: string
    canSell?: boolean
    canPurchase?: boolean
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00PartCreateManyCreatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartCreateManyUpdatedByUserInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
  }

  export type Nx00UserUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedByUser?: Nx00UserUpdateOneWithoutUpdatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutCreatedUsersNestedInput
    createdUsers?: Nx00UserUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdUsers?: Nx00UserUncheckedUpdateManyWithoutCreatedByUserNestedInput
    updatedUsers?: Nx00UserUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutUserNestedInput
    rolesCreated?: Nx00RoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    rolesUpdated?: Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    userRolesCreated?: Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsCreated?: Nx00BrandUncheckedUpdateManyWithoutCreatedByUserNestedInput
    brandsUpdated?: Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    functionGroupsCreated?: Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserNestedInput
    functionGroupsUpdated?: Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partStatusesCreated?: Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partStatusesUpdated?: Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserNestedInput
    partsCreated?: Nx00PartUncheckedUpdateManyWithoutCreatedByUserNestedInput
    partsUpdated?: Nx00PartUncheckedUpdateManyWithoutUpdatedByUserNestedInput
  }

  export type Nx00UserUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    username?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    email?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    statusCode?: StringFieldUpdateOperationsInput | string
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00UserRoleUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    role?: Nx00RoleUpdateOneRequiredWithoutUserRolesNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutUserRolesCreatedNestedInput
  }

  export type Nx00UserRoleUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00RoleUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedByUser?: Nx00UserUpdateOneWithoutRolesUpdatedNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00RoleUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutRolesCreatedNestedInput
    userRoles?: Nx00UserRoleUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    userRoles?: Nx00UserRoleUncheckedUpdateManyWithoutRoleNestedInput
  }

  export type Nx00RoleUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00UserRoleUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: Nx00UserUpdateOneRequiredWithoutUserRolesNestedInput
    role?: Nx00RoleUpdateOneRequiredWithoutUserRolesNestedInput
  }

  export type Nx00UserRoleUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    roleId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type Nx00BrandUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedByUser?: Nx00UserUpdateOneWithoutBrandsUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00BrandUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutBrandsCreatedNestedInput
    parts?: Nx00PartUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutBrandNestedInput
  }

  export type Nx00BrandUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00FunctionGroupUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedByUser?: Nx00UserUpdateOneWithoutFunctionGroupsUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00FunctionGroupUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutFunctionGroupsCreatedNestedInput
    parts?: Nx00PartUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutFunctionGroupNestedInput
  }

  export type Nx00FunctionGroupUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    sortNo?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00PartStatusUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedByUser?: Nx00UserUpdateOneWithoutPartStatusesUpdatedNestedInput
    parts?: Nx00PartUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartStatusUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdByUser?: Nx00UserUpdateOneWithoutPartStatusesCreatedNestedInput
    parts?: Nx00PartUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    parts?: Nx00PartUncheckedUpdateManyWithoutStatusNestedInput
  }

  export type Nx00PartStatusUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    canSell?: BoolFieldUpdateOperationsInput | boolean
    canPurchase?: BoolFieldUpdateOperationsInput | boolean
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00PartUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    brand?: Nx00BrandUpdateOneRequiredWithoutPartsNestedInput
    functionGroup?: Nx00FunctionGroupUpdateOneWithoutPartsNestedInput
    status?: Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartsUpdatedNestedInput
  }

  export type Nx00PartUncheckedUpdateWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartUncheckedUpdateManyWithoutCreatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    brand?: Nx00BrandUpdateOneRequiredWithoutPartsNestedInput
    functionGroup?: Nx00FunctionGroupUpdateOneWithoutPartsNestedInput
    status?: Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutPartsCreatedNestedInput
  }

  export type Nx00PartUncheckedUpdateWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00PartUncheckedUpdateManyWithoutUpdatedByUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type Nx00UserRoleCreateManyRoleInput = {
    id?: string
    userId: string
    createdAt?: Date | string
    createdBy?: string | null
  }

  export type Nx00UserRoleUpdateWithoutRoleInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: Nx00UserUpdateOneRequiredWithoutUserRolesNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutUserRolesCreatedNestedInput
  }

  export type Nx00UserRoleUncheckedUpdateWithoutRoleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00UserRoleUncheckedUpdateManyWithoutRoleInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartCreateManyBrandInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    functionGroupId?: string | null
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartUpdateWithoutBrandInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    functionGroup?: Nx00FunctionGroupUpdateOneWithoutPartsNestedInput
    status?: Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutPartsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartsUpdatedNestedInput
  }

  export type Nx00PartUncheckedUpdateWithoutBrandInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartUncheckedUpdateManyWithoutBrandInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartCreateManyFunctionGroupInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    statusId: string
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartUpdateWithoutFunctionGroupInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    brand?: Nx00BrandUpdateOneRequiredWithoutPartsNestedInput
    status?: Nx00PartStatusUpdateOneRequiredWithoutPartsNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutPartsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartsUpdatedNestedInput
  }

  export type Nx00PartUncheckedUpdateWithoutFunctionGroupInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartUncheckedUpdateManyWithoutFunctionGroupInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    statusId?: StringFieldUpdateOperationsInput | string
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartCreateManyStatusInput = {
    id?: string
    partNo: string
    oldPartNo?: string | null
    displayNo?: string | null
    nameZh: string
    nameEn?: string | null
    brandId: string
    functionGroupId?: string | null
    barcode?: string | null
    isActive?: boolean
    remark?: string | null
    createdAt?: Date | string
    createdBy?: string | null
    updatedAt?: Date | string | null
    updatedBy?: string | null
  }

  export type Nx00PartUpdateWithoutStatusInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    brand?: Nx00BrandUpdateOneRequiredWithoutPartsNestedInput
    functionGroup?: Nx00FunctionGroupUpdateOneWithoutPartsNestedInput
    createdByUser?: Nx00UserUpdateOneWithoutPartsCreatedNestedInput
    updatedByUser?: Nx00UserUpdateOneWithoutPartsUpdatedNestedInput
  }

  export type Nx00PartUncheckedUpdateWithoutStatusInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type Nx00PartUncheckedUpdateManyWithoutStatusInput = {
    id?: StringFieldUpdateOperationsInput | string
    partNo?: StringFieldUpdateOperationsInput | string
    oldPartNo?: NullableStringFieldUpdateOperationsInput | string | null
    displayNo?: NullableStringFieldUpdateOperationsInput | string | null
    nameZh?: StringFieldUpdateOperationsInput | string
    nameEn?: NullableStringFieldUpdateOperationsInput | string | null
    brandId?: StringFieldUpdateOperationsInput | string
    functionGroupId?: NullableStringFieldUpdateOperationsInput | string | null
    barcode?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    remark?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdBy?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updatedBy?: NullableStringFieldUpdateOperationsInput | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}