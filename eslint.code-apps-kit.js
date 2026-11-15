// Code Apps kit ESLint preset. Copied into a project as eslint.code-apps-kit.js
// by /kit-init and spread last in eslint.config.js:
//
//   import { codeAppsKit } from './eslint.code-apps-kit.js'
//   export default defineConfig([ ...existing, ...codeAppsKit ])
//
// Two things are checked in src/:
//
// 1. No direct network calls. A code app reaches data through Power Platform
//    connectors, and the default Content Security Policy for code apps
//    (connect-src 'none') blocks direct calls in the browser anyway.
// 2. Only declared connector operations. kit.config.json lists, per generated
//    service, the operations this app may call ("allowedOperations"). This is a
//    build-time check in the repository. Power Platform does not enforce it at
//    runtime.

import { readFileSync } from 'node:fs'

const why = 'Code apps reach data through Power Platform connectors. Use the generated service in src/generated/ instead of a direct network call.'

const httpClients = [
  'axios',
  'ky',
  'got',
  'node-fetch',
  'cross-fetch',
  'isomorphic-fetch',
  'superagent',
  'undici',
  '@microsoft/microsoft-graph-client',
]

// An import path that points into the generated folder: './generated',
// '../generated/services/XService', '@/generated'.
const GENERATED = /(?:^|\/)generated(?:\/|$)/

// The SDK entry points that can run any connector operation without going
// through a generated service. '@microsoft/power-apps/app' is not one of them.
const DATA_CLIENT = /^@microsoft\/power-apps\/(?:data|internal)(?:\/|$)/

const isTypeOnly = (node) => node.importKind === 'type' || node.exportKind === 'type'

// TypeScript's `typeof XService` (also `typeof XService.getAll`) names the value
// in a type and runs nothing.
function inTypeQuery(identifier) {
  let node = identifier
  while (node.parent && node.parent.type === 'TSQualifiedName') node = node.parent
  return Boolean(node.parent) && node.parent.type === 'TSTypeQuery'
}

export const declaredOperations = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Allow only the connector operations declared in kit.config.json',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedOperations: {
            anyOf: [
              { type: 'null' },
              { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
            ],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noManifest:
        'kit.config.json has no "allowedOperations", so no connector operation is allowed. Declare the operations this app uses (run kit-init).',
      undeclared:
        '{{service}}.{{operation}} is not declared in kit.config.json. Add "{{operation}}" under allowedOperations["{{service}}"] if the app needs it; that change is reviewed.',
      indirect:
        'Call {{service}} directly as {{service}}.<operation>(...). Aliases, destructuring and computed access hide which operations the app uses.',
      namespace:
        'Import generated services by name, for example `import { XService } from \'./generated\'`, so the operations can be checked.',
      reexport:
        'Do not re-export generated services. Import them where they are called.',
      dynamic:
        'Do not load generated services with a dynamic import. Import them by name.',
      dataClient:
        'Do not import {{source}} in app code. It can run any connector operation. Call the generated services instead (type-only imports are fine).',
    },
  },

  create(context) {
    const option = context.options[0] ?? {}
    const manifest = option.allowedOperations ?? null
    const sourceCode = context.sourceCode

    const isService = (name) => typeof name === 'string' && /Service$/.test(name)

    function checkReference(identifier, service) {
      const parent = identifier.parent
      const direct = parent
        && parent.type === 'MemberExpression'
        && parent.object === identifier
        && !parent.computed
        && parent.property.type === 'Identifier'
      if (!direct) {
        context.report({ node: identifier, messageId: 'indirect', data: { service } })
        return
      }
      if (!manifest) {
        context.report({ node: parent, messageId: 'noManifest' })
        return
      }
      const operation = parent.property.name
      const allowed = Array.isArray(manifest[service]) ? manifest[service] : []
      if (!allowed.includes(operation)) {
        context.report({ node: parent, messageId: 'undeclared', data: { service, operation } })
      }
    }

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string' || isTypeOnly(node)) return

        if (DATA_CLIENT.test(source)) {
          const values = node.specifiers.filter((specifier) => !isTypeOnly(specifier))
          if (values.length > 0 || node.specifiers.length === 0) {
            context.report({ node, messageId: 'dataClient', data: { source } })
          }
          return
        }

        if (!GENERATED.test(source)) return

        for (const specifier of node.specifiers) {
          if (isTypeOnly(specifier)) continue
          if (specifier.type === 'ImportNamespaceSpecifier') {
            context.report({ node: specifier, messageId: 'namespace' })
            continue
          }
          const service = specifier.type === 'ImportSpecifier'
            ? (specifier.imported.name ?? specifier.imported.value)
            : specifier.local.name
          if (!isService(service)) continue

          for (const variable of sourceCode.getDeclaredVariables(specifier)) {
            for (const reference of variable.references) {
              // A type position calls nothing.
              if (reference.isValueReference === false) continue
              if (inTypeQuery(reference.identifier)) continue
              checkReference(reference.identifier, service)
            }
          }
        }
      },

      ExportAllDeclaration(node) {
        if (isTypeOnly(node)) return
        if (typeof node.source.value === 'string' && GENERATED.test(node.source.value)) {
          context.report({ node, messageId: 'reexport' })
        }
      },

      ExportNamedDeclaration(node) {
        if (!node.source || isTypeOnly(node)) return
        if (typeof node.source.value !== 'string' || !GENERATED.test(node.source.value)) return
        const services = node.specifiers.filter(
          (specifier) => !isTypeOnly(specifier) && isService(specifier.local.name ?? specifier.local.value),
        )
        if (services.length > 0) context.report({ node, messageId: 'reexport' })
      },

      ImportExpression(node) {
        const source = node.source
        if (source.type !== 'Literal' || typeof source.value !== 'string') return
        if (GENERATED.test(source.value)) context.report({ node, messageId: 'dynamic' })
        else if (DATA_CLIENT.test(source.value)) {
          context.report({ node, messageId: 'dataClient', data: { source: source.value } })
        }
      },
    }
  },
}

// kit.config.json sits next to this file in the project root. A missing or
// unreadable file means no operation is allowed: the check never switches
// itself off.
function readAllowedOperations() {
  try {
    const config = JSON.parse(readFileSync(new URL('./kit.config.json', import.meta.url), 'utf8'))
    const allowed = config?.allowedOperations
    return allowed && typeof allowed === 'object' && !Array.isArray(allowed) ? allowed : null
  } catch {
    return null
  }
}

const sources = ['src/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,vue,svelte}']

// The kit's rules, for adding to the project's own eslint.config.js. This gives
// the same findings in the editor and in `npm run lint`.
export const codeAppsKit = [
  // Generated by the Power Apps CLI. Not linted and never edited by hand.
  { ignores: ['src/generated/**', '.power/**'] },
  {
    files: sources,
    plugins: {
      'code-apps-kit': { rules: { 'declared-operations': declaredOperations } },
    },
    rules: {
      'code-apps-kit/declared-operations': ['error', { allowedOperations: readAllowedOperations() }],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: why },
        { name: 'XMLHttpRequest', message: why },
        { name: 'WebSocket', message: why },
        { name: 'EventSource', message: why },
      ],
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].flatMap((object) =>
          ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((property) => ({
            object,
            property,
            message: why,
          })),
        ),
        { object: 'navigator', property: 'sendBeacon', message: why },
      ],
      'no-restricted-imports': [
        'error',
        { paths: httpClients.map((name) => ({ name, message: why })) },
      ],
    },
  },
]

// The build gate. `eslint -c eslint.code-apps-kit.js src` runs only the kit's
// rules, so the gate does not depend on the project's other lint rules or on
// lint errors the project already has. Inline `eslint-disable` comments are
// ignored in this run: an exception is made in kit.config.json, where it is
// reviewed, not in a comment.
let typescriptParser = null
try {
  typescriptParser = (await import('typescript-eslint')).parser
} catch {
  // A project without TypeScript does not need the parser.
}

const modern = { ecmaVersion: 'latest', sourceType: 'module' }

export default [
  { ignores: ['src/generated/**', '.power/**', 'dist/**', 'node_modules/**'] },
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' } },
  {
    files: ['src/**/*.{js,jsx,mjs,cjs}'],
    languageOptions: { ...modern, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  ...(typescriptParser
    ? [{ files: ['src/**/*.{ts,tsx,mts,cts}'], languageOptions: { ...modern, parser: typescriptParser } }]
    : []),
  ...codeAppsKit.slice(1),
]
