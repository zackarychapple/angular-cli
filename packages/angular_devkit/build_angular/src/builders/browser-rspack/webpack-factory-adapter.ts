import path from 'node:path';
import { RspackCLI } from '@rspack/cli';
import { DevTool, Mode, rspack, RspackOptions } from '@rspack/core';
import { from, Observable } from 'rxjs';
import { NamedChunksPlugin } from '../../webpack/plugins/named-chunks-plugin';
import { OccurrencesPlugin } from '../../webpack/plugins/occurrences-plugin';
import { AngularWebpackPlugin } from '@ngtools/webpack';
import webpack from 'webpack';
import { Target } from '@rspack/core/dist/config/types';
import { definitions } from '@rspack/core/dist/config/schema';
import cacheGroups = definitions.OptimizationSplitChunksOptions.properties_13.cacheGroups;

export function webpackFactory(options: any) {
  return from(createWebpackFactoryFromRspackCLI(options)) as unknown as Observable<typeof webpack>;
}

async function createWebpackFactoryFromRspackCLI(options: any) {
  const rspackCommand = 'build';
  process.env.RSPACK_CONFIG_VALIDATE = 'loose';
  let nodeEnv = process?.env?.NODE_ENV;
  let rspackCommandDefaultEnv = rspackCommand === 'build' ? 'production' : 'development';
  if (typeof options.nodeEnv === 'string') {
    process.env.NODE_ENV = nodeEnv || options.nodeEnv;
  } else {
    process.env.NODE_ENV = nodeEnv || rspackCommandDefaultEnv;
  }
  // let config = await this.loadConfig(options);
  const cli = new RspackCLI();
  const cliOptions = {
    'watch': false,
    'devtool': false,
    'analyze': false,
    'env': {},
    'argv': {},
  };
  const config = await cli.buildConfig(webpackToRspack(options), cliOptions, rspackCommand);

  return rspack(config);
}

function webpackToRspack(options: webpack.Configuration): RspackOptions {
  const {
    mode,
    devtool,
    target,
    profile,
    resolve,
    output,
    watch,
    experiments,
    optimization,
    module,
    plugins,
  } = options;

  const convertResolve = (resolve: webpack.ResolveOptions = {}) => {
    const { extensions } = resolve;
    return {
      extensions: extensions,
    };
  };

  const convertOutput = (output: any) => {
    const {
      uniqueName,
      hashFunction,
      clean,
      path,
      publicPath,
      filename,
      chunkFilename,
      crossOriginLoading,
      trustedTypes,
      scriptType,
    } = output;
    return {
      uniqueName,
      clean,
      publicPath,
      filename,
      chunkFilename,
      crossOriginLoading,
      trustedTypes,
    };
  };

  const convertExperiments = (experiments: any) => {
    const { asyncWebAssembly } = experiments;
    return { asyncWebAssembly };
  };

  const convertOptimization = (optimization: any) => {
    const { minimize, runtimeChunk, splitChunks } = optimization;

    const common = splitChunks['common'];
    delete common.enforce;

    return {
      minimize,
      runtimeChunk,
      splitChunks: {
        maxAsyncRequests: splitChunks?.maxAsyncRequests,
        cacheGroups: {
          default: splitChunks['default'],
          common,
        },
      },
    };
  };

  const convertModule = (module: any) => {
    const { parser, rules } = module;

    const convertRules = (rules: any) => {
      return rules;
    };

    return {
      parser,
      rules: convertRules(rules),
    };
  };

  const convertPlugins = (plugins: any) => {
    return plugins;
  };

  return {
    mode,
    devtool: devtool as DevTool,
    target: target as Target,
    resolve: convertResolve(resolve),
    output: convertOutput(output),
    watch,
    experiments: convertExperiments(experiments),
    optimization: convertOptimization(optimization),
    module: convertModule(module),
    plugins: convertPlugins(plugins),
  };
}

function rsPackConfig(): RspackOptions {
  return {
    mode: 'production' as Mode | undefined,
    devtool: false,
    target: ['web', 'es2015'],
    entry: {
      polyfills: ['zone.js'],
      main: ['./src/main.ts'],
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      uniqueName: 'zackAngularCli',
      // 'hashFunction': 'xxhash64', // throws error
      clean: true,
      // path: "./dist",
      publicPath: '',
      filename: '[name].[contenthash:20].js',
      chunkFilename: '[name].[contenthash:20].js',
      crossOriginLoading: false,
      trustedTypes: 'angular#bundler',
      // 'scriptType': 'module' // throws error
    },
    watch: false,
    // snapshot: {module: {hash: false}},
    // performance: {hints: false}, // throws error
    experiments: {
      // 'backCompat': false, // throws error
      // 'syncWebAssembly': true, // throws error
      asyncWebAssembly: true,
    },
    optimization: {
      runtimeChunk: false,
      minimize: true,
      splitChunks: {
        // 'maxAsyncRequests': null, // throws error
        cacheGroups: {
          default: {
            chunks: 'async',
            minChunks: 2,
            priority: 10,
          },
          common: {
            name: 'common',
            chunks: 'async',
            minChunks: 2,
            // 'enforce': true, // throws error
            priority: 5,
          },
          // 'vendors': false, // throws error
          // 'defaultVendors': false // throws error
        },
      },
    },
    builtins: {
      html: [
        {
          template: './src/index.html',
        },
      ],
    },
    module: {
      parser: {
        javascript: {
          requireContext: false,
          // Disable auto URL asset module creation. This doesn't effect `new Worker(new URL(...))`
          // https://webpack.js.org/guides/asset-modules/#url-assets
          url: false,
        },
      } as any,
      rules: [
        // {
        // 	// ! THIS IS FOR TESTING ANGULAR HMR !
        // 	include: [path.resolve("./src/main.ts")],
        // 	use: [
        // 		{
        // 			loader: require.resolve(
        // 				"@angular-devkit/build-angular/src/webpack/plugins/hmr/hmr-loader.js"
        // 			)
        // 		}
        // 	]
        // },
        {
          test: /\.?(svg|html)$/,
          resourceQuery: /\?ngResource/,
          type: 'asset/source',
        },
        {
          test: /\.?(scss)$/,
          resourceQuery: /\?ngResource/,
          use: [{ loader: 'raw-loader' }, { loader: 'sass-loader' }],
        },
        { test: /[/\\]rxjs[/\\]add[/\\].+\.js$/, sideEffects: true },
        {
          test: /\.[cm]?[tj]sx?$/,
          exclude: [
            /[\\/]node_modules[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill|whatwg-url)[/\\]/,
          ],
          use: [
            {
              loader: require.resolve('@angular-devkit/build-angular/src/babel/webpack-loader.js'),
              options: {
                cacheDirectory: path.join(__dirname, '/.angular/cache/15.2.4/babel-webpack'),
                aot: true,
                optimize: true,
                supportedBrowsers: [
                  'chrome 111',
                  'chrome 110',
                  'edge 111',
                  'edge 110',
                  'firefox 111',
                  'firefox 102',
                  'ios_saf 16.3',
                  'ios_saf 16.2',
                  'ios_saf 16.1',
                  'ios_saf 16.0',
                  'ios_saf 15.6',
                  'ios_saf 15.5',
                  'ios_saf 15.4',
                  'ios_saf 15.2-15.3',
                  'ios_saf 15.0-15.1',
                  'safari 16.3',
                  'safari 16.2',
                  'safari 16.1',
                  'safari 16.0',
                  'safari 15.6',
                  'safari 15.5',
                  'safari 15.4',
                  'safari 15.2-15.3',
                  'safari 15.1',
                  'safari 15',
                ],
              },
            },
          ],
        },
        // {
        // 	test: /\.[cm]?tsx?$/,
        // 	use: [{ loader: require.resolve("@ngtools/webpack/src/ivy/index.js") }],
        // 	exclude: [
        // 		/[\\/]node_modules[/\\](?:css-loader|mini-css-extract-plugin|webpack-dev-server|webpack)[/\\]/
        // 	]
        // }
      ],
    },
    plugins: [
      // TODO: Add this back after https://github.com/web-infra-dev/rspack/issues/2619 lands
      // new DedupeModuleResolvePlugin(),
      new NamedChunksPlugin() as any,
      new OccurrencesPlugin({
        aot: true,
        scriptsOptimization: false,
      }),
      new AngularWebpackPlugin({
        tsconfig: './tsconfig.app.json',
        emitClassMetadata: false,
        emitNgModuleScope: false,
        jitMode: false,
        fileReplacements: {},
        substitutions: {},
        directTemplateLoading: true,
        compilerOptions: {
          sourceMap: false,
          declaration: false,
          declarationMap: false,
          preserveSymlinks: false,
        },
        inlineStyleFileExtension: 'scss',
      }),
    ],
  };
}

/*function webpackFactory(options) {
  // asis
  // const {mode, devtool, target} = options;

  // not transfered
  // const {profile} = options;

  // funciton convert
  const wpResolve = {
    "roots": [
      "C:\\Users\\valor\\work\\rspack\\rspack\\examples\\angular-15"
    ],
    "extensions": [
      ".ts",
      ".tsx",
      ".mjs",
      ".js"
    ],
    "symlinks": true,
    "modules": [
      "C:/Users/valor/work/rspack/rspack/examples/angular-15",
      "node_modules"
    ],
    "mainFields": [
      "es2020",
      "es2015",
      "browser",
      "module",
      "main"
    ],
    "conditionNames": [
      "es2020",
      "es2015",
      "..."
    ]
  };
  const {resolve} = options;

  // dropped
  const wpResolveLoader = {
    "symlinks": true
  };
  const {resolveLoader} = options;

  // dropped context = "C:\\Users\\valor\\work\\rspack\\rspack\\examples\\angular-15"
  const {context} = options;

  // convert main to relative path
  // const entry = {
  //   "main": [
  //     "C:\\Users\\valor\\work\\rspack\\rspack\\examples\\angular-15\\src\\main.ts"
  //   ],
  //   "polyfills": [
  //     "zone.js"
  //   ]
  // }
  const {entry} = options;

  // dropped
  const {externals} = options;

  // convert webpack output = {
  //   "uniqueName": "angular-15",
  //   "hashFunction": "xxhash64",
  //   "clean": true,
  //   "path": "C:\\Users\\valor\\work\\rspack\\rspack\\examples\\angular-15\\dist\\angular-15",
  //   "publicPath": "",
  //   "filename": "[name].[contenthash:20].js",
  //   "chunkFilename": "[name].[contenthash:20].js",
  //   "libraryTarget": undefined,
  //   "crossOriginLoading": false,
  //   "trustedTypes": "angular#bundler",
  //   "scriptType": "module"
  // }
  const {output} = options;

  // dropped watch = false
  // watchOptions = {
  //   "poll": undefined,
  //   "followSymlinks": false
  //   "ignored": undefined
  // }
  const {watch, watchOptions} = options;

  // dropped snapshot = {
  //   "module": {
  //     "hash": false
  //   }
  // }
  const {snapshot} = options;

  // dropped performance = {
  //   "hints": false
  // }
  const {performance} = options;

  // dropped ignoreWarnings = [
  //      // https://github.com/webpack-contrib/source-map-loader/blob/b2de4249c7431dd8432da607e08f0f65e9d64219/src/index.js#L83
  //       /Failed to parse source map from/,
  //       // https://github.com/webpack-contrib/postcss-loader/blob/bd261875fdf9c596af4ffb3a1a73fe3c549befda/src/index.js#L153-L158
  //       /Add postcss as project dependency/,
  //       // esbuild will issue a warning, while still hoists the @charset at the very top.
  //       // This is caused by a bug in css-loader https://github.com/webpack-contrib/css-loader/issues/1212
  //       /"@charset" must be the first rule in the file/,
  // ]
  const {ignoreWarnings} = options;

  // function convert
  const {module} = options;

  // partially dropped
  const {experiments} = options;

  // dropped
  // {
  //   "debug": false,
  //   "level": "error"
  // }
  const {infrastructureLogging} = options;

  // dropped
  // {
  //   "all": false,
  //   "colors": true,
  //   "hash": true,
  //   "timings": true,
  //   "chunks": true,
  //   "builtAt": true,
  //   "warnings": true,
  //   "errors": true,
  //   "assets": true,
  //   "cachedAssets": true,
  //   "ids": true,
  //   "entrypoints": true
  // }
  const {stats} = options;

  // dropped
  // {
  //   "type": "filesystem",
  //   "profile": false,
  //   "cacheDirectory": "C:\\Users\\valor\\work\\rspack\\rspack\\examples\\angular-15\\.angular\\cache\\16.0.0-next.0\\angular-webpack",
  //   "maxMemoryGenerations": 1,
  //   "name": "fffec8a55934f449a9771a085eddcb0bcb708693"
  // }
  const {cache} = options;

  // function convert
  const {optimization} = options;

  // function convert
  const {plugins} = options;

  // dropped
  const {node} = options;

  // final rspack config
  const rspackConfig = {
    mode, devtool, target,
    module: convertModule(module),
    optimization: convertOptimization(optimization),
    plugins: convertPlugins(plugins),
  }

  return rspackConfig;
}*/

/*function convertModule(module) {
  const componentStyleLoaders: RuleSetUseItem[] = [
    {
      loader: require.resolve('css-loader'),
      options: {
        url: false,
        sourceMap: componentsSourceMap,
        importLoaders: 1,
        exportType: 'string',
        esModule: false,
      },
    },
    {
      loader: postCssLoaderPath,
      options: {
        implementation: postCss,
        postcssOptions: postcssOptionsCreator(componentsSourceMap, false),
      },
    },
  ];

  const globalStyleLoaders: RuleSetUseItem[] = [
    {
      loader: MiniCssExtractPlugin.loader,
    },
    {
      loader: require.resolve('css-loader'),
      options: {
        url: false,
        sourceMap: !!cssSourceMap,
        importLoaders: 1,
      },
    },
    {
      loader: postCssLoaderPath,
      options: {
        implementation: postCss,
        postcssOptions: postcssOptionsCreator(false, true),
        sourceMap: !!cssSourceMap,
      },
    },
  ];

  const styleLanguages = [
    {
      extensions: ['css'],
      use: [],
    },
    {
      extensions: ['scss'],
      use: [
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: cssSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: getSassLoaderOptions(
            root,
            sassImplementation,
            includePaths,
            false,
            !!buildOptions.verbose,
            !!buildOptions.preserveSymlinks,
          ),
        },
      ],
    },
    {
      extensions: ['sass'],
      use: [
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            sourceMap: cssSourceMap,
          },
        },
        {
          loader: require.resolve('sass-loader'),
          options: getSassLoaderOptions(
            root,
            sassImplementation,
            includePaths,
            true,
            !!buildOptions.verbose,
            !!buildOptions.preserveSymlinks,
          ),
        },
      ],
    },
    {
      extensions: ['less'],
      use: [
        {
          loader: require.resolve('less-loader'),
          options: {
            implementation: require('less'),
            sourceMap: cssSourceMap,
            lessOptions: {
              javascriptEnabled: true,
              paths: includePaths,
            },
          },
        },
      ],
    },
  ];

  const ngmodule = {
    // Show an error for missing exports instead of a warning.
    strictExportPresence: true,
    parser: {
      javascript: {
        requireContext: false,
        // Disable auto URL asset module creation. This doesn't effect `new Worker(new URL(...))`
        // https://webpack.js.org/guides/asset-modules/#url-assets
        url: false,
        worker: !!webWorkerTsConfig,
      },
    },
    rules: [
      {
        test: /\.?(svg|html)$/,
        // Only process HTML and SVG which are known Angular component resources.
        resourceQuery: /\?ngResource/,
        type: 'asset/source',
      },
      {
        // Mark files inside `rxjs/add` as containing side effects.
        // If this is fixed upstream and the fixed version becomes the minimum
        // supported version, this can be removed.
        test: /[/\\]rxjs[/\\]add[/\\].+\.js$/,
        sideEffects: true,
      },
      {
        test: /\.[cm]?[tj]sx?$/,
        // The below is needed due to a bug in `@babel/runtime`. See: https://github.com/babel/babel/issues/12824
        resolve: {fullySpecified: false},
        exclude: [
          /[\\/]node_modules[/\\](?:core-js|@babel|tslib|web-animations-js|web-streams-polyfill|whatwg-url)[/\\]/,
        ],
        use: [
          {
            loader: require.resolve('../../babel/webpack-loader'),
            options: {
              cacheDirectory: (cache.enabled && path.join(cache.path, 'babel-webpack')) || false,
              aot: buildOptions.aot,
              optimize: buildOptions.buildOptimizer,
              supportedBrowsers: buildOptions.supportedBrowsers,
              instrumentCode: codeCoverage
                ? {
                  includedBasePath: sourceRoot ?? projectRoot,
                  excludedPaths: getInstrumentationExcludedPaths(root, codeCoverageExclude),
                }
                : undefined,
            } as AngularBabelLoaderOptions,
          },
        ],
      },
      // webpack/config/common.ts
      {
        test: tsConfig.options.allowJs ? /\.[cm]?[tj]sx?$/ : /\.[cm]?tsx?$/,
        loader: AngularWebpackLoaderPath,
        // The below are known paths that are not part of the TypeScript compilation even when allowJs is enabled.
        exclude: [
          /[\\/]node_modules[/\\](?:css-loader|mini-css-extract-plugin|webpack-dev-server|webpack)[/\\]/,
        ],
      },

      // webpack/config/styles.ts
      // css  .map
      // scss .map
      // sass .map
      // less .map
      styleLanguages.map(({extensions, use}) => ({
        test: new RegExp(`\\.(?:${extensions.join('|')})$`, 'i'),
        rules: [
          // Setup processing rules for global and component styles
          {
            oneOf: [
              // Global styles are only defined global styles
              {
                use: globalStyleLoaders,
                resourceQuery: /\?ngGlobalStyle/,
              },
              // Component styles are all styles except defined global styles
              {
                use: componentStyleLoaders,
                resourceQuery: /\?ngResource/,
              },
            ],
          },
          // use from array of rules
          {use},
        ],
      })),

    ],
  }
}*/

/*function convertOptimization(optimization) {
  const wpOptimization = {
    "minimizer": [
      // {
      //   "options": {
      //     "define": {
      //       "ngDevMode": false,
      //       "ngI18nClosureMode": false,
      //       "ngJitMode": false
      //     },
      //     "sourcemap": false,
      //     "supportedBrowsers": [
      //       "chrome 111",
      //       "chrome 110",
      //       "edge 111",
      //       "edge 110",
      //       "firefox 111",
      //       "firefox 102",
      //       "ios_saf 16.4",
      //       "ios_saf 16.3",
      //       "ios_saf 16.2",
      //       "ios_saf 16.1",
      //       "ios_saf 16.0",
      //       "ios_saf 15.6",
      //       "ios_saf 15.5",
      //       "ios_saf 15.4",
      //       "ios_saf 15.2-15.3",
      //       "ios_saf 15.0-15.1",
      //       "safari 16.4",
      //       "safari 16.3",
      //       "safari 16.2",
      //       "safari 16.1",
      //       "safari 16.0",
      //       "safari 15.6",
      //       "safari 15.5",
      //       "safari 15.4",
      //       "safari 15.2-15.3",
      //       "safari 15.1",
      //       "safari 15"
      //     ],
      //     "keepIdentifierNames": false,
      //     "keepNames": false,
      //     "removeLicenses": true,
      //     "advanced": true
      //   },
      //   "targets": [
      //     "chrome111.0",
      //     "chrome110.0",
      //     "edge111.0",
      //     "edge110.0",
      //     "firefox111.0",
      //     "firefox102.0",
      //     "ios16.4",
      //     "ios16.3",
      //     "ios16.2",
      //     "ios16.1",
      //     "ios16.0",
      //     "ios15.6",
      //     "ios15.5",
      //     "ios15.4",
      //     "ios15.2",
      //     "ios15.0",
      //     "safari16.4",
      //     "safari16.3",
      //     "safari16.2",
      //     "safari16.1",
      //     "safari16.0",
      //     "safari15.6",
      //     "safari15.5",
      //     "safari15.4",
      //     "safari15.2",
      //     "safari15.1",
      //     "safari15.0"
      //   ]
      // },
      new JavaScriptOptimizerPlugin({
        define: buildOptions.aot ? GLOBAL_DEFS_FOR_TERSER_WITH_AOT : GLOBAL_DEFS_FOR_TERSER,
        sourcemap: scriptsSourceMap,
        supportedBrowsers: buildOptions.supportedBrowsers,
        keepIdentifierNames: !allowMangle || isPlatformServer,
        keepNames: isPlatformServer,
        removeLicenses: buildOptions.extractLicenses,
        advanced: buildOptions.buildOptimizer,
      }),

      // TransferSizePlugin
      new TransferSizePlugin(),

      // CssOptimizerPlugin
      // {
      //   "esbuild": {
      //     "alwaysUseWasm": false,
      //     "initialized": false
      //   },
      //   "targets": [
      //     "chrome111.0",
      //     "chrome110.0",
      //     "edge111.0",
      //     "edge110.0",
      //     "firefox111.0",
      //     "firefox102.0",
      //     "ios16.4",
      //     "ios16.3",
      //     "ios16.2",
      //     "ios16.1",
      //     "ios16.0",
      //     "ios15.6",
      //     "ios15.5",
      //     "ios15.4",
      //     "ios15.2",
      //     "ios15.0",
      //     "safari16.4",
      //     "safari16.3",
      //     "safari16.2",
      //     "safari16.1",
      //     "safari16.0",
      //     "safari15.6",
      //     "safari15.5",
      //     "safari15.4",
      //     "safari15.2",
      //     "safari15.1",
      //     "safari15.0"
      //   ]
      // }

      new CssOptimizerPlugin({
        supportedBrowsers: buildOptions.supportedBrowsers,
      }),
    ],
    "moduleIds": "deterministic",
    "chunkIds": "deterministic",
    "emitOnErrors": false,
    "runtimeChunk": "single",
    "splitChunks": {
      "maxAsyncRequests": null,
      "cacheGroups": {
        "default": {
          "chunks": "async",
          "minChunks": 2,
          "priority": 10
        },
        "common": {
          "name": "common",
          "chunks": "async",
          "minChunks": 2,
          "enforce": true,
          "priority": 5
        },
        "vendors": false,
        "defaultVendors": false
      }
    }
  }
}*/

/*function convertPlugins(plugins) {
  const wpPlugins = [
    // NamedChunksPlugin
    new NamedChunksPlugin(),


    // OccurrencesPlugin
    new OccurrencesPlugin({
      aot,
      scriptsOptimization,
    }),

    // DedupeModuleResolvePlugin
    new DedupeModuleResolvePlugin({verbose}),

    // ProgressPlugin
    new ProgressPlugin(platform),

    // CommonJsUsageWarnPlugin
    new CommonJsUsageWarnPlugin({
      allowedDependencies: allowedCommonJsDependencies,
    }),

    // LicenseWebpackPlugin
    new LicenseWebpackPlugin({
      stats: {
        warnings: false,
        errors: false,
      },
      perChunkOutput: false,
      outputFilename: '3rdpartylicenses.txt',
      skipChildCompilers: true,
    }),

    // AngularWebpackPlugin
    // createIvyPlugin(wco, aot, tsConfigPath),
    new AngularWebpackPlugin({
      tsconfig,
      compilerOptions,
      fileReplacements,
      jitMode: !aot,
      emitNgModuleScope: !optimize,
      inlineStyleFileExtension: buildOptions.inlineStyleLanguage ?? 'css',
    }),

    // AnyComponentStyleBudgetChecker
    new AnyComponentStyleBudgetChecker(buildOptions.budgets),

    // StylesWebpackPlugin
    new StylesWebpackPlugin({
      root,
      entryPoints,
      preserveSymlinks: buildOptions.preserveSymlinks,
    }),

    // object plugin
    // There's no option to turn off file watching in webpack-dev-server, but
    // we can override the file watcher instead.
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apply: (compiler: any) => {
        compiler.hooks.afterEnvironment.tap('angular-cli', () => {
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          compiler.watchFileSystem = {
            watch: () => {
            }
          };
        });
      },
    },

    // MiniCssExtractPlugin
    new MiniCssExtractPlugin({filename: `[name]${hashFormat.extract}.css`}),

    // SuppressExtractedTextChunksWebpackPlugin
    new SuppressExtractedTextChunksWebpackPlugin()
  ];
}*/
